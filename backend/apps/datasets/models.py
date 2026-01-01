"""
Models for Dataset management.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Dataset(models.Model):
    """
    Model representing a dataset collection used for model training.
    Datasets are managed by admin users to create reference data for analysis.
    """
    SOURCE_CHOICES = [
        ('upload', 'Upload'),
        ('drive', 'Google Drive'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=255, help_text='Dataset name')
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_url = models.URLField(blank=True, null=True, help_text='Google Drive URL if applicable')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Metadata
    total_files = models.IntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)

    # User who created the dataset
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='datasets'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['source']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"


class DatasetFile(models.Model):
    """
    Model representing an individual file within a dataset.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='files'
    )

    # File information
    filename = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000, help_text='Path to stored file')
    file_size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100, blank=True, null=True)

    # Directory structure information
    directory_path = models.CharField(max_length=1000, blank=True, null=True, help_text='Relative directory path from root')
    directory_name = models.CharField(max_length=500, blank=True, null=True, help_text='Immediate parent directory name')

    # Processing information
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)

    # Language detection
    language_code = models.CharField(max_length=5, blank=True, null=True)
    language_confidence = models.FloatField(blank=True, null=True)

    # Content
    txt_content = models.TextField(blank=True, null=True, help_text='Extracted text content')
    preprocessed_text = models.TextField(blank=True, null=True, help_text='Preprocessed text')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dataset_files'
        ordering = ['filename']
        indexes = [
            models.Index(fields=['dataset', 'status']),
            models.Index(fields=['language_code']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.dataset.name})"
