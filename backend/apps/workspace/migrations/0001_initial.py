import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('datasets', '__latest__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Workspace',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('bow_id', models.IntegerField(blank=True, null=True, verbose_name='BoW de referencia')),
                ('tfidf_id', models.IntegerField(blank=True, null=True, verbose_name='TF-IDF de referencia')),
                ('topic_model_id', models.IntegerField(blank=True, null=True, verbose_name='Topic Model de referencia')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pendiente'),
                        ('processing', 'Procesando'),
                        ('completed', 'Completado'),
                        ('error', 'Error'),
                    ],
                    default='pending',
                    max_length=20,
                    verbose_name='Estado',
                )),
                ('progress_percentage', models.IntegerField(default=0, verbose_name='Progreso (%)')),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='Mensaje de error')),
                ('results', models.JSONField(default=dict, verbose_name='Resultados de inferencia')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('expires_at', models.DateTimeField(blank=True, null=True, verbose_name='Expira')),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='workspaces',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('dataset', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='workspaces',
                    to='datasets.dataset',
                    verbose_name='Dataset de referencia',
                )),
            ],
            options={
                'verbose_name': 'Workspace',
                'verbose_name_plural': 'Workspaces',
                'db_table': 'workspace',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='WorkspaceDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='workspace/pdfs/', verbose_name='Archivo PDF')),
                ('original_filename', models.CharField(max_length=255, verbose_name='Nombre original')),
                ('file_size', models.IntegerField(default=0, verbose_name='Tamaño (bytes)')),
                ('extracted_text', models.TextField(blank=True, null=True, verbose_name='Texto extraído')),
                ('preprocessed_text', models.TextField(blank=True, null=True, verbose_name='Texto preprocesado')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pendiente'),
                        ('extracting', 'Extrayendo texto'),
                        ('ready', 'Listo'),
                        ('error', 'Error'),
                    ],
                    default='pending',
                    max_length=20,
                    verbose_name='Estado',
                )),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='Mensaje de error')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('workspace', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='documents',
                    to='workspace.workspace',
                    verbose_name='Workspace',
                )),
            ],
            options={
                'verbose_name': 'Documento del Workspace',
                'verbose_name_plural': 'Documentos del Workspace',
                'db_table': 'workspace_document',
            },
        ),
    ]
