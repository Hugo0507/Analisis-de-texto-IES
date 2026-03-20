"""
Models for AI Analysis app.

Provides models for multi-provider LLM analysis (Claude, Gemini, OpenAI)
and comparison of results against traditional NLP analysis.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class AIAnalysisConfig(models.Model):
    """
    Configuracion de un analisis con IA.
    Define el dataset, proveedor, modelo y prompt a utilizar.
    """
    PROVIDER_CHOICES = [
        ('claude', 'Claude (Anthropic)'),
        ('gemini', 'Gemini (Google)'),
        ('openai', 'OpenAI (ChatGPT)'),
    ]

    STATUS_CHOICES = [
        ('pending', _('Pendiente')),
        ('processing', _('Procesando')),
        ('completed', _('Completado')),
        ('error', _('Error')),
    ]

    dataset = models.ForeignKey(
        'datasets.Dataset',
        on_delete=models.CASCADE,
        related_name='ai_analysis_configs',
        verbose_name=_('Dataset'),
    )
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        verbose_name=_('Proveedor'),
    )
    model_name = models.CharField(
        max_length=100,
        help_text=_('Modelo especifico (ej: claude-sonnet-4-6, gemini-1.5-pro, gpt-4o)'),
        verbose_name=_('Nombre del modelo'),
    )
    prompt_template = models.TextField(
        verbose_name=_('Plantilla de prompt'),
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_('Estado'),
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ai_analysis_configs',
        verbose_name=_('Creado por'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_analysis_configs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['provider']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.get_provider_display()} - {self.model_name} ({self.get_status_display()})"


class AIAnalysisResult(models.Model):
    """
    Resultado del analisis por proveedor de IA.
    Almacena la respuesta cruda, casos de exito y factores identificados.
    """
    PROVIDER_CHOICES = AIAnalysisConfig.PROVIDER_CHOICES

    config = models.ForeignKey(
        AIAnalysisConfig,
        on_delete=models.CASCADE,
        related_name='results',
        verbose_name=_('Configuracion'),
    )
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        verbose_name=_('Proveedor'),
    )
    raw_response = models.TextField(
        verbose_name=_('Respuesta cruda'),
    )
    success_cases = models.JSONField(
        default=list,
        verbose_name=_('Casos de exito identificados'),
        help_text=_('Lista de casos de exito de transformacion digital en IES'),
    )
    identified_factors = models.JSONField(
        default=list,
        verbose_name=_('Factores identificados'),
        help_text=_('Factores de transformacion digital encontrados por el LLM'),
    )
    factor_comparison = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Comparacion con NLP tradicional'),
        help_text=_('Comparacion de factores IA vs analisis NLP tradicional'),
    )
    tokens_used = models.IntegerField(
        default=0,
        verbose_name=_('Tokens utilizados'),
    )
    processing_time_seconds = models.FloatField(
        default=0.0,
        verbose_name=_('Tiempo de procesamiento (s)'),
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name=_('Mensaje de error'),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_analysis_results'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider']),
            models.Index(fields=['config', 'provider']),
        ]

    def __str__(self):
        return f"Resultado {self.get_provider_display()} - Config #{self.config_id}"


class AIComparisonResult(models.Model):
    """
    Resultado de la comparacion entre los 3 LLMs y el analisis NLP tradicional.
    """
    config = models.OneToOneField(
        AIAnalysisConfig,
        on_delete=models.CASCADE,
        related_name='comparison',
        verbose_name=_('Configuracion'),
    )
    claude_result = models.ForeignKey(
        AIAnalysisResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name=_('Resultado Claude'),
    )
    gemini_result = models.ForeignKey(
        AIAnalysisResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name=_('Resultado Gemini'),
    )
    openai_result = models.ForeignKey(
        AIAnalysisResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name=_('Resultado OpenAI'),
    )
    consensus_factors = models.JSONField(
        default=list,
        verbose_name=_('Factores en consenso'),
        help_text=_('Factores en los que todos los proveedores coinciden'),
    )
    divergent_factors = models.JSONField(
        default=list,
        verbose_name=_('Factores divergentes'),
        help_text=_('Factores donde los proveedores difieren'),
    )
    nlp_agreement = models.JSONField(
        default=dict,
        verbose_name=_('Acuerdo con NLP tradicional'),
        help_text=_('Nivel de acuerdo entre analisis IA y NLP tradicional'),
    )
    comparison_summary = models.TextField(
        blank=True,
        default='',
        verbose_name=_('Resumen de comparacion'),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_comparison_results'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comparacion - Config #{self.config_id}"
