"""
Admin configuration for Analysis app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Vocabulary,
    BowMatrix,
    TfidfMatrix,
    Topic,
    Factor,
    DocumentFactor,
)


@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    """
    Admin interface for Vocabulary model.
    """
    list_display = ('term', 'global_frequency', 'document_frequency', 'idf_score', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('term',)
    readonly_fields = ('created_at',)
    ordering = ('-global_frequency',)
    date_hierarchy = 'created_at'


@admin.register(BowMatrix)
class BowMatrixAdmin(admin.ModelAdmin):
    """
    Admin interface for BowMatrix model.
    """
    list_display = ('document_short', 'term_display', 'frequency')
    list_filter = ('document__language_code',)
    search_fields = ('document__filename', 'term__term')
    autocomplete_fields = ['document', 'term']
    ordering = ('-frequency',)

    def document_short(self, obj):
        """Muestra filename truncado."""
        filename = obj.document.filename
        if len(filename) > 30:
            return filename[:27] + '...'
        return filename
    document_short.short_description = 'Documento'

    def term_display(self, obj):
        """Muestra termino."""
        return obj.term.term
    term_display.short_description = 'Termino'


@admin.register(TfidfMatrix)
class TfidfMatrixAdmin(admin.ModelAdmin):
    """
    Admin interface for TfidfMatrix model.
    """
    list_display = ('document_short', 'term_display', 'tfidf_score_formatted')
    list_filter = ('document__language_code',)
    search_fields = ('document__filename', 'term__term')
    autocomplete_fields = ['document', 'term']
    ordering = ('-tfidf_score',)

    def document_short(self, obj):
        """Muestra filename truncado."""
        filename = obj.document.filename
        if len(filename) > 30:
            return filename[:27] + '...'
        return filename
    document_short.short_description = 'Documento'

    def term_display(self, obj):
        """Muestra termino."""
        return obj.term.term
    term_display.short_description = 'Termino'

    def tfidf_score_formatted(self, obj):
        """Muestra score formateado."""
        return f"{obj.tfidf_score:.4f}"
    tfidf_score_formatted.short_description = 'TF-IDF Score'


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    """
    Admin interface for Topic model.
    """
    list_display = (
        'topic_display',
        'model_type_badge',
        'coherence_score_formatted',
        'top_words_preview',
        'created_at',
    )
    list_filter = ('model_type', 'created_at')
    search_fields = ('topic_number',)
    readonly_fields = ('created_at',)
    ordering = ('model_type', 'topic_number')
    date_hierarchy = 'created_at'

    def topic_display(self, obj):
        """Muestra nemero de tema."""
        return f"Tema {obj.topic_number}"
    topic_display.short_description = 'Tema'

    def model_type_badge(self, obj):
        """Badge colorido para tipo de modelo."""
        colors = {
            'lda': '#007BFF',
            'nmf': '#28A745',
            'lsa': '#FFC107',
            'plsa': '#DC3545',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.model_type, '#999'),
            obj.get_model_type_display()
        )
    model_type_badge.short_description = 'Modelo'

    def coherence_score_formatted(self, obj):
        """Muestra coherence score formateado."""
        if obj.coherence_score is not None:
            return f"{obj.coherence_score:.4f}"
        return "N/A"
    coherence_score_formatted.short_description = 'Coherencia'

    def top_words_preview(self, obj):
        """Muestra preview de top words."""
        if not obj.top_words:
            return "N/A"
        # Asume que top_words es una lista de [word, weight]
        if isinstance(obj.top_words, list) and len(obj.top_words) > 0:
            words = [item[0] if isinstance(item, list) else item for item in obj.top_words[:5]]
            return ", ".join(words)
        return str(obj.top_words)[:50]
    top_words_preview.short_description = 'Top Palabras'


@admin.register(Factor)
class FactorAdmin(admin.ModelAdmin):
    """
    Admin interface for Factor model.
    """
    list_display = (
        'name',
        'category_badge',
        'global_frequency',
        'relevance_score_formatted',
        'keywords_count',
        'created_at',
    )
    list_filter = ('category', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at',)
    ordering = ('-relevance_score', 'category')
    date_hierarchy = 'created_at'

    def category_badge(self, obj):
        """Badge colorido para categorea."""
        colors = {
            'tecnologico': '#007BFF',
            'organizacional': '#28A745',
            'humano': '#FFC107',
            'estrategico': '#DC3545',
            'financiero': '#6F42C1',
            'pedagogico': '#FD7E14',
            'infraestructura': '#17A2B8',
            'seguridad': '#6C757D',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.category, '#999'),
            obj.get_category_display()
        )
    category_badge.short_description = 'Categorea'

    def relevance_score_formatted(self, obj):
        """Muestra relevance score formateado."""
        if obj.relevance_score is not None:
            return f"{obj.relevance_score:.4f}"
        return "N/A"
    relevance_score_formatted.short_description = 'Relevancia'

    def keywords_count(self, obj):
        """Cuenta keywords."""
        if isinstance(obj.keywords, list):
            return len(obj.keywords)
        return 0
    keywords_count.short_description = '# Keywords'


@admin.register(DocumentFactor)
class DocumentFactorAdmin(admin.ModelAdmin):
    """
    Admin interface for DocumentFactor model.
    """
    list_display = (
        'document_short',
        'factor_display',
        'mention_count',
        'relevance_score_formatted',
    )
    list_filter = ('factor__category',)
    search_fields = ('document__filename', 'factor__name')
    autocomplete_fields = ['document', 'factor']
    ordering = ('-relevance_score',)

    def document_short(self, obj):
        """Muestra filename truncado."""
        filename = obj.document.filename
        if len(filename) > 30:
            return filename[:27] + '...'
        return filename
    document_short.short_description = 'Documento'

    def factor_display(self, obj):
        """Muestra factor con categorea."""
        return f"{obj.factor.name} ({obj.factor.get_category_display()})"
    factor_display.short_description = 'Factor'

    def relevance_score_formatted(self, obj):
        """Muestra relevance score formateado."""
        if obj.relevance_score is not None:
            return f"{obj.relevance_score:.4f}"
        return "N/A"
    relevance_score_formatted.short_description = 'Relevancia'
