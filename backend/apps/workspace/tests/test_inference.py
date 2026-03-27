"""
Tests for workspace inference preprocessing functions.

Covers pure functions that don't require DB access:
- _strip_references_section
- preprocess_for_inference
- _load_from_binary
"""

import io
import pytest
import joblib
import numpy as np

from apps.workspace.inference import (
    _strip_references_section,
    _load_from_binary,
    preprocess_for_inference,
)


# ── _load_from_binary ────────────────────────────────────────────────────────

class TestLoadFromBinary:
    def test_returns_none_for_empty(self):
        assert _load_from_binary(None) is None
        assert _load_from_binary(b'') is None

    def test_loads_joblib_object(self):
        obj = {'key': 'value', 'numbers': [1, 2, 3]}
        buf = io.BytesIO()
        joblib.dump(obj, buf)
        binary_data = buf.getvalue()

        result = _load_from_binary(binary_data)
        assert result == obj

    def test_loads_from_memoryview(self):
        obj = np.array([1.0, 2.0, 3.0])
        buf = io.BytesIO()
        joblib.dump(obj, buf)
        binary_data = memoryview(buf.getvalue())

        result = _load_from_binary(binary_data)
        np.testing.assert_array_equal(result, obj)


# ── _strip_references_section ────────────────────────────────────────────────

class TestStripReferencesSection:
    def test_removes_references_section(self):
        text = "This is the main content.\n\nReferences\n\nSmith (2020). Some paper."
        result = _strip_references_section(text)
        assert "main content" in result
        assert "Smith" not in result

    def test_removes_bibliography_section(self):
        text = "Content here.\n\nBibliography\n\nEntry 1\nEntry 2"
        result = _strip_references_section(text)
        assert "Content here" in result
        assert "Entry 1" not in result

    def test_removes_bibliografia_spanish(self):
        text = "Contenido principal.\n\nBibliografía\n\nReferencia 1"
        result = _strip_references_section(text)
        assert "Contenido principal" in result
        assert "Referencia 1" not in result

    def test_no_references_section_returns_unchanged(self):
        text = "Just normal content without any reference section."
        result = _strip_references_section(text)
        assert result == text

    def test_removes_works_cited(self):
        text = "Main body text.\n\nWorks Cited\n\nAuthor, A. (2021)."
        result = _strip_references_section(text)
        assert "Main body" in result
        assert "Author" not in result


# ── preprocess_for_inference ────────────────────────────────────────────────

class TestPreprocessForInference:
    def test_empty_text(self):
        assert preprocess_for_inference('') == ''
        assert preprocess_for_inference('   ') == ''
        assert preprocess_for_inference(None) == ''

    def test_removes_urls(self):
        text = "Check https://example.com for details and www.test.org too"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "example" not in result
        assert "https" not in result
        assert "www" not in result

    def test_removes_emails(self):
        text = "Contact user@example.com for info"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "user@example" not in result

    def test_removes_dois(self):
        text = "See DOI: 10.1234/test.5678 for the paper"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "10.1234" not in result

    def test_removes_isbn(self):
        text = "Book ISBN 978-3-16-148410-0 is relevant"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "978" not in result

    def test_removes_citation_brackets(self):
        text = "Studies show [1, 2, 3] that results improve [4]"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "[1" not in result
        assert "[4]" not in result

    def test_removes_citation_parens(self):
        text = "As noted (Smith, 2020) and (Jones et al., 2019) in research"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "Smith" not in result
        assert "2020" not in result

    def test_removes_page_numbers(self):
        text = "Found on pp. 123-456 in the document"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "123" not in result
        assert "pp" not in result

    def test_lowercases_text(self):
        text = "UPPERCASE Words Here"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "UPPERCASE" not in result
        assert "uppercase" in result or "word" in result

    def test_removes_numbers_and_special_chars(self):
        text = "There are 42 items with $100 value"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "42" not in result
        assert "$" not in result

    def test_applies_stopwords(self):
        stopwords = {'the', 'is', 'and', 'of', 'in'}
        text = "The analysis of data in the system is complete and ready"
        result = preprocess_for_inference(text, stopwords=stopwords, lemmatize=False)
        assert "the" not in result.split()
        assert "is" not in result.split()
        assert "and" not in result.split()

    def test_removes_single_char_words(self):
        text = "a b c word d e f another"
        result = preprocess_for_inference(text, lemmatize=False)
        words = result.split()
        for w in words:
            assert len(w) > 1

    def test_normalizes_whitespace(self):
        text = "word1    word2     word3"
        result = preprocess_for_inference(text, lemmatize=False)
        assert "  " not in result

    def test_strips_references_before_processing(self):
        text = "Main content about technology.\n\nReferences\n\nSmith (2020). A paper."
        result = preprocess_for_inference(text, lemmatize=False)
        assert "smith" not in result
        assert "technology" in result or "content" in result

    def test_full_pipeline_integration(self):
        text = """
        Digital transformation in higher education has been studied
        extensively (Garcia et al., 2021; Lopez, 2020). See https://example.com
        for more details. Contact: admin@university.edu

        The impact of ICT on pp. 45-67 shows significant results [1, 2].
        ISBN 978-0-123456-78-9

        References

        Garcia, A. (2021). Digital transformation study. DOI: 10.1234/study
        Lopez, B. (2020). Higher education review.
        """
        stopwords = {'the', 'has', 'been', 'in', 'of', 'on', 'for', 'more'}
        result = preprocess_for_inference(text, stopwords=stopwords, lemmatize=False)

        # Should not contain references, URLs, emails, DOIs
        assert "garcia" not in result
        assert "https" not in result
        assert "admin@" not in result
        assert "10.1234" not in result
        # Should contain substantive words
        assert "digital" in result or "transformation" in result

    def test_lemmatize_fallback(self):
        """Lemmatization should work or fall back gracefully."""
        text = "The researchers studied multiple universities"
        result = preprocess_for_inference(text, lemmatize=True, language='en')
        # Whether spaCy is installed or not, should return processed text
        assert len(result) > 0

    def test_lemmatize_spanish(self):
        """Spanish lemmatization should work or fall back gracefully."""
        text = "Los investigadores estudiaron las universidades"
        result = preprocess_for_inference(text, lemmatize=True, language='es')
        assert len(result) > 0
