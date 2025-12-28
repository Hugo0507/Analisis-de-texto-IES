"""
Admin configuration for Documents app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """
    Admin interface for Document model.
    """
    list_display = (
        'filename_short',
        'language_badge',
        'status_badge',
        'language_confidence',
        'created_at',
    )
    list_filter = ('status', 'language_code', 'created_at')
    search_fields = ('filename', 'drive_file_id')
    readonly_fields = ('created_at', 'updated_at', 'drive_file_id')
    fieldsets = (
        ('Información Básica', {
            'fields': ('drive_file_id', 'filename', 'status')
        }),
        ('Análisis de Idioma', {
            'fields': ('language_code', 'language_confidence')
        }),
        ('Contenido', {
            'fields': ('txt_content', 'preprocessed_text'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def filename_short(self, obj):
        """Muestra filename truncado."""
        if len(obj.filename) > 50:
            return obj.filename[:47] + '...'
        return obj.filename
    filename_short.short_description = 'Archivo'

    def language_badge(self, obj):
        """Badge colorido para idioma."""
        if not obj.language_code:
            return format_html(
                '<span style="background-color: #999; color: white; padding: 3px 8px; border-radius: 3px;">Sin detectar</span>'
            )
        return format_html(
            '<span style="background-color: #007BFF; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            obj.language_code.upper()
        )
    language_badge.short_description = 'Idioma'

    def status_badge(self, obj):
        """Badge colorido para status."""
        colors = {
            'pending': '#FFC107',
            'processing': '#007BFF',
            'completed': '#28A745',
            'error': '#DC3545',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#999'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Estado'
