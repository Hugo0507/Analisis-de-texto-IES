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

    def extract_from_pdf(self, file_path: str, original_filename: str = '') -> dict:
        """
        Main entry point for PDF metadata extraction.

        Pipeline (stops at first successful DOI → CrossRef enrichment):
          1. Embedded PDF metadata (title/author/keywords if present)
          2. DOI from filename  (Sage, Taylor & Francis name files as 10.XXXX_xxx.pdf)
          3. DOI from PDF text  (pdfplumber → PyPDF2 → pdfminer, first 5 pages)
          4. CrossRef lookup by DOI  (complete authoritative metadata)
          5. CrossRef search by title (fallback when DOI not found)
        """
        fname = original_filename or Path(file_path).name
        logger.info(f"[BibExtractor] Processing: {fname}")

        metadata = {}

        # Step 1: embedded PDF info dictionary
        embedded = self._extract_pdf_info(file_path)
        metadata.update(embedded)
        if embedded:
            logger.info(f"[BibExtractor] Embedded metadata: {list(embedded.keys())}")

        # Step 2: DOI from filename (common for Sage, T&F exports)
        doi = metadata.get('bib_doi')
        if not doi:
            doi = self._extract_doi_from_filename(fname)
            if doi:
                logger.info(f"[BibExtractor] DOI from filename: {doi}")

        # Step 3: DOI from PDF text content
        if not doi:
            doi = self._extract_doi_from_text(file_path)
            if doi:
                logger.info(f"[BibExtractor] DOI from text: {doi}")
            else:
                logger.info(f"[BibExtractor] No DOI found in text for {fname}")

        # Step 4: CrossRef lookup by DOI
        if doi:
            doi = self._clean_doi(doi)
            metadata['bib_doi'] = doi
            crossref = self._fetch_crossref(doi)
            if crossref:
                logger.info(f"[BibExtractor] CrossRef enriched: {list(crossref.keys())}")
                metadata.update(crossref)
                return metadata
            else:
                logger.info(f"[BibExtractor] CrossRef returned nothing for DOI {doi}")

        # Step 5: guarantee title from filename (no API needed)
        # This runs BEFORE CrossRef title search so even if the API fails
        # the title field is always populated for descriptive filenames.
        if not metadata.get('bib_title'):
            title_from_name = self._title_from_filename(fname)
            if title_from_name:
                metadata['bib_title'] = title_from_name
                logger.info(f"[BibExtractor] Title from filename: {title_from_name[:60]}")

        # Step 6: CrossRef search by title to fill in authors, year, journal, etc.
        search_title = metadata.get('bib_title', '')
        if search_title and len(search_title) > 15 and not metadata.get('bib_authors'):
            crossref = self._search_crossref_by_title(search_title)
            if crossref:
                logger.info(f"[BibExtractor] CrossRef title-search enriched: {list(crossref.keys())}")
                # Don't overwrite the title we just set from the filename
                crossref.pop('bib_title', None)
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
            logger.warning(f"[BibExtractor] PDF info extraction failed: {e}")
            return {}

    def _extract_doi_from_filename(self, filename: str) -> Optional[str]:
        """
        Extract DOI encoded in the filename.

        Many databases export PDFs with DOI-based names:
        - Sage:           10.1177_20569043231234567.pdf
        - Taylor&Francis: 10.1080_09650790.2021.1879987.pdf
        - General:        10.XXXX_suffix.pdf  → DOI = 10.XXXX/suffix
        """
        stem = Path(filename).stem
        # Pattern: starts with 10.DIGITS_ → treat first _ as /
        match = re.match(r'^(10\.\d{4,})_(.+)$', stem)
        if match:
            doi = f"{match.group(1)}/{match.group(2)}"
            return self._clean_doi(doi)
        return None

    def _title_from_filename(self, filename: str) -> str:
        """
        Extract a human-readable title from a PDF filename.

        Many researchers save PDFs with the paper title as the filename:
          "Digital transformation in higher education.pdf"
          "Smith 2023 - Industry 4.0 skills review.pdf"

        Rules:
        - Skip filenames that look like DOIs (10.XXXX_...)
        - Skip filenames that look like internal database IDs
          (all lowercase letters, digits and dashes, no spaces)
        - Replace underscores/dashes with spaces
        - Remove trailing hash suffixes added during storage (_a3f8b2c1)
        """
        stem = Path(filename).stem

        # Skip DOI-pattern filenames (handled by _extract_doi_from_filename)
        if re.match(r'^10\.\d{4,}', stem):
            return ''

        # Skip opaque IDs like "1-s2.0-S0360131523000702-main" or "abc123def456"
        if re.match(r'^[a-z0-9\-]{20,}$', stem):
            return ''

        # Remove trailing hash suffix added by _save_file: "_a3f8b2c1" (8 hex chars)
        cleaned = re.sub(r'_[0-9a-f]{8}$', '', stem)

        # Replace underscores and dashes used as word separators with spaces
        # but only when surrounded by word chars (not within numbers like "4.0")
        cleaned = re.sub(r'(?<=\w)[_-](?=\w)', ' ', cleaned)

        # Collapse multiple spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        # Must be a plausible title length
        return cleaned if len(cleaned) > 10 else ''

    def _extract_doi_from_text(self, file_path: str) -> Optional[str]:
        """
        Extract DOI from the text of the first 5 pages of a PDF.

        Tries three extractors in order: pdfplumber → PyPDF2 → pdfminer.six.
        Collapses newlines before searching to handle DOIs split across lines
        (very common in two-column PDFs from ScienceDirect, Sage, Taylor & Francis).
        """
        # ── pdfplumber (best for multi-column layouts) ─────────────────────
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                pages = pdf.pages[:5]
                for page in pages:
                    raw = page.extract_text() or ''
                    doi = self._search_doi_in_text(raw)
                    if doi:
                        return doi
        except Exception as e:
            logger.warning(f"[BibExtractor] pdfplumber failed: {e}")

        # ── PyPDF2 ─────────────────────────────────────────────────────────
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f, strict=False)
                for page in reader.pages[:5]:
                    raw = page.extract_text() or ''
                    doi = self._search_doi_in_text(raw)
                    if doi:
                        return doi
        except Exception as e:
            logger.warning(f"[BibExtractor] PyPDF2 failed: {e}")

        # ── pdfminer.six (handles some PDFs the others can't) ──────────────
        try:
            from pdfminer.high_level import extract_text as pdfminer_extract
            full_text = pdfminer_extract(file_path, maxpages=5) or ''
            doi = self._search_doi_in_text(full_text)
            if doi:
                return doi
        except Exception as e:
            logger.warning(f"[BibExtractor] pdfminer failed: {e}")

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
        Query CrossRef REST API for complete bibliographic metadata by DOI.
        Free, no API key required.
        """
        try:
            url = f"{CROSSREF_BASE}/{doi}"
            response = requests.get(url, timeout=15, headers={'User-Agent': USER_AGENT})
            if response.status_code != 200:
                logger.warning(f"[BibExtractor] CrossRef HTTP {response.status_code} for DOI {doi}")
                return {}
            message = response.json().get('message', {})
            return self._parse_crossref_message(message)
        except requests.Timeout:
            logger.warning(f"[BibExtractor] CrossRef timeout for DOI {doi}")
            return {}
        except Exception as e:
            logger.warning(f"[BibExtractor] CrossRef DOI lookup failed: {e}")
            return {}

    def _search_crossref_by_title(self, title: str) -> dict:
        """
        Search CrossRef by title when no DOI is available.

        Uses the bibliographic query API — returns the top-ranked result.
        Only used as a last resort; result may not always be the correct paper.
        """
        try:
            params = {
                'query.bibliographic': title,
                'rows': 1,
                'filter': 'type:journal-article',
                'select': 'title,author,issued,container-title,DOI,abstract,volume,issue,page,subject',
            }
            response = requests.get(
                f"{CROSSREF_BASE}",
                params=params,
                timeout=15,
                headers={'User-Agent': USER_AGENT},
            )
            if response.status_code != 200:
                return {}
            items = response.json().get('message', {}).get('items', [])
            if not items:
                return {}

            result = self._parse_crossref_message(items[0])
            # Store the DOI found via search
            if items[0].get('DOI'):
                result['bib_doi'] = items[0]['DOI']
            return result
        except Exception as e:
            logger.warning(f"[BibExtractor] CrossRef title search failed: {e}")
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
