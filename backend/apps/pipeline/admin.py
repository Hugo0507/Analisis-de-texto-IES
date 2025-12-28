"""
Admin configuration for Pipeline app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import PipelineExecution


@admin.register(PipelineExecution)
class PipelineExecutionAdmin(admin.ModelAdmin):
    """
    Admin interface for PipelineExecution model.
    """
    list_display = (
        'execution_id_short',
        'stage_name',
        'status_badge',
        'duration_formatted',
        'cache_hit_badge',
        'started_at',
    )
    list_filter = ('status', 'stage_name', 'cache_hit', 'created_at')
    search_fields = ('execution_id', 'stage_name', 'error_message')
    readonly_fields = ('created_at', 'updated_at', 'execution_id')
    fieldsets = (
        ('Identificacien', {
            'fields': ('execution_id', 'stage_name', 'status')
        }),
        ('Tiempos', {
            'fields': ('started_at', 'completed_at', 'duration_seconds')
        }),
        ('Cache y Configuracien', {
            'fields': ('cache_hit', 'config_hash')
        }),
        ('Error', {
            'fields': ('error_message',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    date_hierarchy = 'created_at'
    ordering = ('-created_at', 'stage_name')

    def execution_id_short(self, obj):
        """Muestra execution_id truncado."""
        return str(obj.execution_id)[:8] + '...'
    execution_id_short.short_description = 'Execution ID'

    def status_badge(self, obj):
        """Badge colorido para status."""
        colors = {
            'pending': '#6C757D',
            'running': '#007BFF',
            'completed': '#28A745',
            'failed': '#DC3545',
            'skipped': '#FFC107',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#999'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Estado'

    def cache_hit_badge(self, obj):
        """Badge para cache hit."""
        if obj.cache_hit:
            return format_html(
                '<span style="background-color: #28A745; color: white; padding: 3px 8px; border-radius: 3px;"> Cache</span>'
            )
        return format_html(
            '<span style="background-color: #6C757D; color: white; padding: 3px 8px; border-radius: 3px;"> Sin cache</span>'
        )
    cache_hit_badge.short_description = 'Cache'

    def duration_formatted(self, obj):
        """Muestra duracien formateada."""
        if obj.duration_seconds is not None:
            if obj.duration_seconds < 60:
                return f"{obj.duration_seconds}s"
            elif obj.duration_seconds < 3600:
                mins = obj.duration_seconds // 60
                secs = obj.duration_seconds % 60
                return f"{mins}m {secs}s"
            else:
                hours = obj.duration_seconds // 3600
                mins = (obj.duration_seconds % 3600) // 60
                return f"{hours}h {mins}m"
        return "N/A"
    duration_formatted.short_description = 'Duracien'
