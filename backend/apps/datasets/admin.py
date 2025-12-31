"""
Django admin configuration for datasets app.
"""

from django.contrib import admin
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
        'created_by',
        'created_at',
    ]
    list_filter = ['source', 'status', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'total_files', 'total_size_bytes']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description')
        }),
        ('Source', {
            'fields': ('source', 'source_url')
        }),
        ('Status', {
            'fields': ('status', 'total_files', 'total_size_bytes')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    def total_size_mb(self, obj):
        """Display total size in MB."""
        return f"{obj.total_size_bytes / (1024 * 1024):.2f} MB"
    total_size_mb.short_description = 'Total Size'


@admin.register(DatasetFile)
class DatasetFileAdmin(admin.ModelAdmin):
    """Admin interface for DatasetFile model."""

    list_display = [
        'id',
        'filename',
        'dataset',
        'status',
        'file_size_mb',
        'language_code',
        'created_at',
    ]
    list_filter = ['status', 'language_code', 'mime_type', 'created_at']
    search_fields = ['filename', 'original_filename']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('File Information', {
            'fields': ('dataset', 'filename', 'original_filename', 'file_path', 'file_size_bytes', 'mime_type')
        }),
        ('Processing', {
            'fields': ('status', 'error_message')
        }),
        ('Language', {
            'fields': ('language_code', 'language_confidence')
        }),
        ('Content', {
            'fields': ('txt_content', 'preprocessed_text'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def file_size_mb(self, obj):
        """Display file size in MB."""
        return f"{obj.file_size_bytes / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'File Size'
