"""
Django admin configuration for datasets app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Dataset, DatasetFile


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    """Admin interface for Dataset model."""

    list_display = [
        'id',
        'name',
        'source',
        'status',
        'total_files',
        'total_size_mb',
        'database_sources',
        'prisma_summary',
        'created_by',
        'created_at',
    ]
    list_filter = ['source', 'status', 'created_at']
    search_fields = ['name', 'description', 'database_sources']
    readonly_fields = ['created_at', 'updated_at', 'total_files', 'total_size_bytes', 'prisma_stats_display']

    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description')
        }),
        ('Origen', {
            'fields': ('source', 'source_url', 'database_sources')
        }),
        ('Estado', {
            'fields': ('status', 'total_files', 'total_size_bytes')
        }),
        ('Protocolo de Búsqueda (PRISMA)', {
            'fields': ('search_strategy', 'inclusion_criteria', 'exclusion_criteria', 'prisma_stats_display'),
            'classes': ('wide',),
            'description': (
                'Documenta la estrategia de búsqueda y los criterios de selección del corpus. '
                'Sigue las directrices PRISMA para revisiones sistemáticas.'
            ),
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    def total_size_mb(self, obj):
        return f"{obj.total_size_bytes / (1024 * 1024):.2f} MB"
    total_size_mb.short_description = 'Tamaño'

    def prisma_summary(self, obj):
        stats = obj.prisma_stats
        return format_html(
            '<span style="color:#16a34a">✓ {}</span> / '
            '<span style="color:#dc2626">✗ {}</span> / '
            '<span style="color:#d97706">⏳ {}</span>',
            stats['included'], stats['excluded'], stats['pending']
        )
    prisma_summary.short_description = 'Inc / Exc / Pend'

    def prisma_stats_display(self, obj):
        stats = obj.prisma_stats
        return format_html(
            '<table style="border-collapse:collapse">'
            '<tr><td style="padding:4px 12px 4px 0"><b>Total archivos:</b></td><td>{}</td></tr>'
            '<tr><td style="padding:4px 12px 4px 0"><b>Incluidos:</b></td>'
            '<td style="color:#16a34a"><b>{}</b></td></tr>'
            '<tr><td style="padding:4px 12px 4px 0"><b>Excluidos:</b></td>'
            '<td style="color:#dc2626"><b>{}</b></td></tr>'
            '<tr><td style="padding:4px 12px 4px 0"><b>Pendientes:</b></td>'
            '<td style="color:#d97706"><b>{}</b></td></tr>'
            '</table>',
            stats['total'], stats['included'], stats['excluded'], stats['pending']
        )
    prisma_stats_display.short_description = 'Estadísticas PRISMA'


@admin.register(DatasetFile)
class DatasetFileAdmin(admin.ModelAdmin):
    """Admin interface for DatasetFile model."""

    list_display = [
        'id',
        'bib_title_short',
        'dataset',
        'bib_source_db',
        'bib_year',
        'inclusion_badge',
        'language_code',
        'status',
        'file_size_mb',
        'created_at',
    ]
    list_filter = [
        'inclusion_status',
        'bib_source_db',
        'bib_year',
        'language_code',
        'status',
        'created_at',
    ]
    search_fields = [
        'filename',
        'original_filename',
        'bib_title',
        'bib_authors',
        'bib_doi',
        'bib_journal',
    ]
    readonly_fields = ['created_at', 'updated_at', 'bib_authors_list', 'bib_keywords_list']
    list_editable = ['bib_source_db', 'bib_year']

    fieldsets = (
        ('Archivo', {
            'fields': ('dataset', 'filename', 'original_filename', 'file_path',
                       'file_size_bytes', 'mime_type', 'directory_path', 'directory_name')
        }),
        ('Metadatos Bibliográficos', {
            'fields': (
                'bib_title',
                'bib_authors', 'bib_authors_list',
                'bib_year',
                'bib_journal',
                'bib_doi',
                'bib_source_db',
                'bib_volume', 'bib_issue', 'bib_pages',
                'bib_keywords', 'bib_keywords_list',
                'bib_abstract',
            ),
            'description': 'Complete los metadatos bibliográficos del artículo. '
                           'Puede poblarlos manualmente o mediante importación de BibTeX/RIS.'
        }),
        ('Protocolo PRISMA', {
            'fields': ('inclusion_status', 'exclusion_reason'),
            'description': 'Clasifica el artículo según los criterios de inclusión/exclusión del dataset.'
        }),
        ('Procesamiento', {
            'fields': ('status', 'error_message')
        }),
        ('Idioma', {
            'fields': ('language_code', 'language_confidence')
        }),
        ('Contenido', {
            'fields': ('txt_content', 'preprocessed_text'),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def file_size_mb(self, obj):
        return f"{obj.file_size_bytes / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'Tamaño'

    def bib_title_short(self, obj):
        title = obj.bib_title or obj.original_filename
        return title[:60] + '…' if len(title) > 60 else title
    bib_title_short.short_description = 'Título'

    def inclusion_badge(self, obj):
        colors = {
            'included': ('#dcfce7', '#16a34a', '✓ Incluido'),
            'excluded': ('#fee2e2', '#dc2626', '✗ Excluido'),
            'pending': ('#fef9c3', '#d97706', '⏳ Pendiente'),
        }
        bg, fg, label = colors.get(obj.inclusion_status, ('#f1f5f9', '#475569', obj.inclusion_status))
        return format_html(
            '<span style="background:{};color:{};padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            bg, fg, label
        )
    inclusion_badge.short_description = 'Estado PRISMA'

    actions = ['mark_included', 'mark_excluded', 'mark_pending', 'auto_detect_source']

    def mark_included(self, request, queryset):
        updated = queryset.update(inclusion_status='included', exclusion_reason=None)
        self.message_user(request, f'{updated} artículo(s) marcados como Incluidos.')
    mark_included.short_description = '✓ Marcar como Incluido'

    def mark_excluded(self, request, queryset):
        updated = queryset.update(inclusion_status='excluded')
        self.message_user(request, f'{updated} artículo(s) marcados como Excluidos.')
    mark_excluded.short_description = '✗ Marcar como Excluido'

    def mark_pending(self, request, queryset):
        updated = queryset.update(inclusion_status='pending')
        self.message_user(request, f'{updated} artículo(s) marcados como Pendientes.')
    mark_pending.short_description = '⏳ Marcar como Pendiente'

    def auto_detect_source(self, request, queryset):
        updated = 0
        for file in queryset:
            detected = file.auto_detect_source_db()
            if detected and not file.bib_source_db:
                file.bib_source_db = detected
                file.save(update_fields=['bib_source_db'])
                updated += 1
        self.message_user(request, f'Base de datos detectada automáticamente en {updated} archivo(s).')
    auto_detect_source.short_description = '🔍 Auto-detectar base de datos de origen'
