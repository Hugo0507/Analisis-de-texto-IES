"""
Models for Documents app.
"""

from django.db import models


class Document(models.Model):
    """
    Model representing a document uploaded from Google Drive.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]

    drive_file_id = models.CharField(max_length=255, unique=True)
    filename = models.CharField(max_length=500)
    language_code = models.CharField(max_length=5, blank=True, null=True)
    language_confidence = models.FloatField(blank=True, null=True)
    txt_content = models.TextField(blank=True, null=True)
    preprocessed_text = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['language_code']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.status})"
