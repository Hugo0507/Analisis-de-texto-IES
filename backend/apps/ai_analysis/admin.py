from django.contrib import admin
from .models import AIAnalysisConfig, AIAnalysisResult, AIComparisonResult


@admin.register(AIAnalysisConfig)
class AIAnalysisConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'provider', 'model_name', 'status', 'created_by', 'created_at']
    list_filter = ['provider', 'status']
    search_fields = ['model_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AIAnalysisResult)
class AIAnalysisResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'config', 'provider', 'tokens_used', 'processing_time_seconds', 'created_at']
    list_filter = ['provider']
    readonly_fields = ['created_at']


@admin.register(AIComparisonResult)
class AIComparisonResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'config', 'created_at']
    readonly_fields = ['created_at']
