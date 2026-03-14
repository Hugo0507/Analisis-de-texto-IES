"""
Bibliographic metadata extractor for academic files.

Supports:
- PDF files: embedded metadata + DOI extraction from text + CrossRef API lookup
- BibTeX (.bib) files: direct parsing (Scopus/WoS exports)
- RIS (.ris) files: direct parsing (Scopus/WoS exports)

CrossRef API is used to enrich metadata when a DOI is found.
No API key required — uses polite pool with User-Agent header.
"""
import re
import logging
import requests
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CROSSREF_BASE = "https://api.crossref.org/works"
USER_AGENT = "AnalisisTransformacionDigital/1.0 (thesis-research-tool; mailto:research@thesis.edu)"

# DOI bare pattern: 10.XXXX/rest-of-doi
# Works on a cleaned single-line string (newlines already removed)
DOI_PATTERN = re.compile(r'(?:doi\.org/|doi:|DOI:|DOI\s*:\s*)?(10\.\d{4,}/[^\s"<>{}|\\^`\[\]]+)')

# Publisher-specific DOI URL prefixes to strip when found in PDF text
KNOWN_DOI_PREFIXES = (
    'https://doi.org/',
    'http://doi.org/',
    'https://dx.doi.org/',
    'http://dx.doi.org/',
)


class BibExtractorService:
    """
    Extracts bibliographic metadata from academic files automatically.

    Usage:
        extractor = BibExtractorService()
        metadata = extractor.extract_from_pdf('/path/to/paper.pdf')
        # Returns dict with bib_title, bib_authors, bib_year, bib_doi, etc.

        entries = extractor.parse_bibtex(open('refs.bib').read())
        # Returns list of dicts, one per BibTeX entry
    """

    # ─── PDF ──────────────────────────────────────────────────────────────────

    def extract_from_pdf(self, file_path: str) -> dict:
        """
        Main entry point for PDF metadata extraction.

        Pipeline:
          1. Read embedded PDF metadata (fast, offline)
          2. If no DOI yet, extract from page text via regex
          3. If DOI found, query CrossRef API for authoritative metadata
        """
        metadata = {}

        # Step 1: embedded PDF info dictionary
        embedded = self._extract_pdf_info(file_path)
        metadata.update(embedded)

        # Step 2: DOI from page text if not already found
        doi = metadata.get('bib_doi') or self._extract_doi_from_text(file_path)
        if doi:
            doi = self._clean_doi(doi)
            metadata['bib_doi'] = doi

            # Step 3: CrossRef enrichment (authoritative, overrides embedded meta)
            crossref = self._fetch_crossref(doi)
            if crossref:
                metadata.update(crossref)

        return metadata

    def _extract_pdf_info(self, file_path: str) -> dict:
        """Extract metadata from the PDF Info dictionary."""
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f, strict=False)
                info = reader.metadata
                if not info:
                    return {}

                metadata = {}

                raw_title = info.get('/Title') or info.get('title', '')
                if raw_title and isinstance(raw_title, str) and len(raw_title.strip()) > 3:
                    metadata['bib_title'] = raw_title.strip()

                raw_author = info.get('/Author') or info.get('author', '')
                if raw_author and isinstance(raw_author, str):
                    metadata['bib_authors'] = raw_author.strip()

                raw_keywords = info.get('/Keywords') or info.get('keywords', '')
                if raw_keywords and isinstance(raw_keywords, str):
                    # Normalize separators to semicolon
                    kws = re.split(r'[,;]\s*', raw_keywords.strip())
                    metadata['bib_keywords'] = '; '.join(k.strip() for k in kws if k.strip())

                # Some PDFs store DOI in custom fields
                for key in ['/doi', '/DOI', 'doi']:
                    val = info.get(key, '')
                    if val and isinstance(val, str):
                        match = DOI_PATTERN.search(val)
                        if match:
                            metadata['bib_doi'] = match.group(1)
                            break

                return metadata

        except Exception as e:
            logger.debug(f"PDF info extraction failed for {file_path}: {e}")
            return {}

    def _extract_doi_from_text(self, file_path: str) -> Optional[str]:
        """
        Extract DOI from the text of the first 5 pages of a PDF.

        Strategy:
        - Join lines to handle DOIs split across newlines (very common in
          two-column academic PDFs from ScienceDirect, Sage, Taylor & Francis)
        - Search for explicit DOI labels AND bare 10.XXXX/... patterns
        - Tries pdfplumber first (better layout), falls back to PyPDF2
        """
        texts = []

        # Try pdfplumber (generally better for multi-column PDFs)
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages[:5]:
                    raw = page.extract_text() or ''
                    texts.append(raw)
        except Exception as e:
            logger.debug(f"pdfplumber text extraction failed: {e}")

        # Fallback or supplement with PyPDF2
        if not any(texts):
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f, strict=False)
                    for page in reader.pages[:5]:
                        raw = page.extract_text() or ''
                        texts.append(raw)
            except Exception as e:
                logger.debug(f"PyPDF2 text extraction failed: {e}")

        for raw_text in texts:
            doi = self._search_doi_in_text(raw_text)
            if doi:
                return doi

        return None

    def _search_doi_in_text(self, text: str) -> Optional[str]:
        """
        Search for a DOI in a block of text.

        Handles:
        - DOIs split across lines (joins lines before searching)
        - https://doi.org/10.XXX format
        - doi: 10.XXX format
        - Bare 10.XXX/... pattern
        """
        # Pass 1: search in the original text (fast path for non-split DOIs)
        match = DOI_PATTERN.search(text)
        if match:
            doi = match.group(1)
            return self._clean_doi(doi)

        # Pass 2: collapse newlines (handles DOIs split across lines)
        # Replace newline + optional spaces with a single space
        collapsed = re.sub(r'\n\s*', ' ', text)
        match = DOI_PATTERN.search(collapsed)
        if match:
            doi = match.group(1)
            return self._clean_doi(doi)

        return None

    def _clean_doi(self, doi: str) -> str:
        """Remove trailing punctuation that may have been captured by the regex."""
        return doi.rstrip('.,;)\'"')

    # ─── CrossRef ─────────────────────────────────────────────────────────────

    def _fetch_crossref(self, doi: str) -> dict:
        """
        Query CrossRef REST API for complete bibliographic metadata.

        Returns dict with bib_* fields, or empty dict on failure.
        CrossRef is free, no API key required (polite pool via User-Agent).
        """
        try:
            url = f"{CROSSREF_BASE}/{doi}"
            response = requests.get(
                url,
                timeout=10,
                headers={'User-Agent': USER_AGENT},
            )
            if response.status_code != 200:
                logger.debug(f"CrossRef returned {response.status_code} for DOI {doi}")
                return {}

            message = response.json().get('message', {})
            return self._parse_crossref_message(message)

        except requests.Timeout:
            logger.debug(f"CrossRef timeout for DOI {doi}")
            return {}
        except Exception as e:
            logger.debug(f"CrossRef lookup failed for DOI {doi}: {e}")
            return {}

    def _parse_crossref_message(self, data: dict) -> dict:
        """Parse CrossRef API response message into bib_* fields."""
        metadata = {}

        # Title
        titles = data.get('title', [])
        if titles:
            metadata['bib_title'] = titles[0].strip()

        # Authors → "Family, Given; Family, Given"
        authors = data.get('author', [])
        if authors:
            parts = []
            for a in authors:
                name = ''
                if a.get('family') and a.get('given'):
                    name = f"{a['family']}, {a['given']}"
                elif a.get('family'):
                    name = a['family']
                elif a.get('name'):
                    name = a['name']
                if name:
                    parts.append(name)
            if parts:
                metadata['bib_authors'] = '; '.join(parts)

        # Publication year
        date_parts = data.get('issued', {}).get('date-parts', [[]])
        if date_parts and date_parts[0]:
            year = date_parts[0][0]
            if isinstance(year, int) and 1900 <= year <= 2100:
                metadata['bib_year'] = year

        # Journal / container title
        container = data.get('container-title', [])
        if container:
            metadata['bib_journal'] = container[0].strip()

        # Abstract (may contain JATS XML tags)
        abstract = data.get('abstract', '')
        if abstract:
            abstract = re.sub(r'<[^>]+>', ' ', abstract)
            abstract = re.sub(r'\s+', ' ', abstract).strip()
            metadata['bib_abstract'] = abstract

        # Volume, issue, pages
        if data.get('volume'):
            metadata['bib_volume'] = str(data['volume'])
        if data.get('issue'):
            metadata['bib_issue'] = str(data['issue'])
        if data.get('page'):
            metadata['bib_pages'] = str(data['page'])

        # Keywords (from 'subject' field in CrossRef)
        subjects = data.get('subject', [])
        if subjects:
            metadata['bib_keywords'] = '; '.join(subjects)

        return metadata

    # ─── BibTeX ───────────────────────────────────────────────────────────────

    def parse_bibtex(self, content: str) -> list:
        """
        Parse BibTeX content into a list of metadata dicts.

        Handles typical exports from Scopus, Web of Science, Google Scholar.
        No external dependency — pure regex parsing.

        Returns list of dicts with bib_* fields.
        """
        entries = []

        # Find all @type{key, ...} blocks
        entry_pattern = re.compile(
            r'@(\w+)\s*\{\s*([^,]+),\s*(.*?)\n\}',
            re.DOTALL | re.IGNORECASE,
        )

        for match in entry_pattern.finditer(content):
            entry_type = match.group(1).lower()
            # Skip non-document entry types
            if entry_type in ('string', 'preamble', 'comment'):
                continue

            fields_text = match.group(3)
            fields = self._parse_bibtex_fields(fields_text)
            metadata = self._bibtex_fields_to_bib(fields)
            if metadata:
                entries.append(metadata)

        return entries

    def _parse_bibtex_fields(self, text: str) -> dict:
        """Extract field = {value} pairs from BibTeX entry body."""
        fields = {}
        # Match: fieldname = {value} or fieldname = "value" or fieldname = number
        pattern = re.compile(
            r'(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|([\d]+))',
            re.DOTALL,
        )
        for m in pattern.finditer(text):
            key = m.group(1).lower()
            value = m.group(2) or m.group(3) or m.group(4) or ''
            # Remove nested braces used for case protection in BibTeX
            value = re.sub(r'\{([^{}]*)\}', r'\1', value).strip()
            fields[key] = value
        return fields

    def _bibtex_fields_to_bib(self, fields: dict) -> dict:
        """Map BibTeX field names to bib_* model fields."""
        metadata = {}

        if fields.get('title'):
            metadata['bib_title'] = fields['title']

        if fields.get('author'):
            # BibTeX uses " and " as author separator
            authors = [a.strip() for a in re.split(r'\s+and\s+', fields['author'])]
            metadata['bib_authors'] = '; '.join(authors)

        if fields.get('year'):
            try:
                year = int(fields['year'])
                if 1900 <= year <= 2100:
                    metadata['bib_year'] = year
            except (ValueError, TypeError):
                pass

        for journal_field in ('journal', 'journaltitle', 'booktitle', 'source'):
            if fields.get(journal_field):
                metadata['bib_journal'] = fields[journal_field]
                break

        if fields.get('doi'):
            metadata['bib_doi'] = self._clean_doi(fields['doi'])

        if fields.get('abstract'):
            metadata['bib_abstract'] = fields['abstract']

        if fields.get('keywords'):
            # BibTeX keywords can be comma or semicolon separated
            kws = re.split(r'[,;]\s*', fields['keywords'])
            metadata['bib_keywords'] = '; '.join(k.strip() for k in kws if k.strip())

        if fields.get('volume'):
            metadata['bib_volume'] = fields['volume']
        if fields.get('number') or fields.get('issue'):
            metadata['bib_issue'] = fields.get('number') or fields.get('issue')
        if fields.get('pages'):
            metadata['bib_pages'] = fields['pages']

        return metadata

    # ─── RIS ──────────────────────────────────────────────────────────────────

    def parse_ris(self, content: str) -> list:
        """
        Parse RIS format content into a list of metadata dicts.

        RIS is the export format used by Scopus, Web of Science, PubMed, etc.
        Returns list of dicts with bib_* fields.
        """
        entries = []
        current = {}
        authors = []

        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue

            # RIS format: "TAG  - value"
            if len(line) >= 6 and line[2:4] == '  ' and line[4] == '-':
                tag = line[:2].strip()
                value = line[6:].strip()

                if tag == 'ER':
                    # End of record
                    if authors:
                        current['bib_authors'] = '; '.join(authors)
                    if current:
                        entries.append(current)
                    current = {}
                    authors = []

                elif tag in ('AU', 'A1', 'A2'):
                    authors.append(value)

                elif tag in ('TI', 'T1', 'ST'):
                    if 'bib_title' not in current:
                        current['bib_title'] = value

                elif tag in ('PY', 'Y1', 'DA'):
                    # Year — may be "2023" or "2023/01/01"
                    year_match = re.match(r'(\d{4})', value)
                    if year_match:
                        try:
                            year = int(year_match.group(1))
                            if 1900 <= year <= 2100:
                                current['bib_year'] = year
                        except (ValueError, TypeError):
                            pass

                elif tag in ('JO', 'JF', 'T2', 'SO'):
                    if 'bib_journal' not in current:
                        current['bib_journal'] = value

                elif tag == 'DO':
                    current['bib_doi'] = self._clean_doi(value)

                elif tag == 'AB':
                    current['bib_abstract'] = value

                elif tag == 'KW':
                    existing = current.get('bib_keywords', '')
                    current['bib_keywords'] = (existing + '; ' + value).lstrip('; ')

                elif tag == 'VL':
                    current['bib_volume'] = value

                elif tag in ('IS', 'CP'):
                    current['bib_issue'] = value

                elif tag == 'SP':
                    current['bib_pages'] = value

                elif tag == 'EP':
                    # End page: append to start page
                    sp = current.get('bib_pages', '')
                    if sp and not sp.endswith(value):
                        current['bib_pages'] = f"{sp}--{value}"

        return entries
