import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('data_preparation', '__first__'),
        ('topic_modeling', '__first__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LstmAnalysis',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Nombre del Análisis')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Descripción')),
                ('embedding_dim', models.IntegerField(default=64, verbose_name='Dimensión de Embeddings')),
                ('hidden_dim', models.IntegerField(default=128, verbose_name='Dimensión Oculta LSTM')),
                ('num_layers', models.IntegerField(default=1, verbose_name='Capas LSTM')),
                ('num_epochs', models.IntegerField(default=20, verbose_name='Épocas de Entrenamiento')),
                ('learning_rate', models.FloatField(default=0.001, verbose_name='Tasa de Aprendizaje')),
                ('batch_size', models.IntegerField(default=16, verbose_name='Tamaño de Lote')),
                ('train_split', models.FloatField(default=0.8, verbose_name='Proporción de Entrenamiento')),
                ('max_vocab_size', models.IntegerField(default=5000, verbose_name='Vocabulario Máximo')),
                ('max_seq_length', models.IntegerField(default=500, verbose_name='Longitud Máxima de Secuencia')),
                ('status', models.CharField(
                    choices=[('pending', 'Pendiente'), ('processing', 'Procesando'),
                              ('completed', 'Completado'), ('error', 'Error')],
                    default='pending', max_length=20, verbose_name='Estado',
                )),
                ('current_stage', models.CharField(
                    choices=[
                        ('pending', 'Pendiente'),
                        ('loading_data', 'Cargando datos y etiquetas'),
                        ('building_vocab', 'Construyendo vocabulario'),
                        ('encoding_sequences', 'Codificando secuencias'),
                        ('preparing_datasets', 'Preparando conjuntos de datos'),
                        ('training', 'Entrenando modelo LSTM'),
                        ('evaluating', 'Evaluando modelo'),
                        ('saving_results', 'Guardando resultados'),
                        ('completed', 'Completado'),
                    ],
                    default='pending', max_length=50, verbose_name='Etapa Actual',
                )),
                ('progress_percentage', models.IntegerField(default=0, verbose_name='Progreso (%)')),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='Mensaje de Error')),
                ('accuracy', models.FloatField(blank=True, null=True, verbose_name='Exactitud (Test)')),
                ('training_time_seconds', models.FloatField(blank=True, null=True, verbose_name='Tiempo de entrenamiento (s)')),
                ('documents_used', models.IntegerField(default=0, verbose_name='Documentos utilizados')),
                ('num_classes', models.IntegerField(default=0, verbose_name='Clases (temas)')),
                ('vocab_size_actual', models.IntegerField(default=0, verbose_name='Tamaño real del vocabulario')),
                ('loss_history', models.JSONField(default=list, verbose_name='Historial de pérdida')),
                ('confusion_matrix', models.JSONField(default=list, verbose_name='Matriz de confusión')),
                ('classification_report', models.JSONField(default=dict, verbose_name='Reporte de clasificación')),
                ('class_labels', models.JSONField(default=list, verbose_name='Etiquetas de clase')),
                ('model_artifact_bin', models.BinaryField(blank=True, null=True, verbose_name='Artefacto del modelo LSTM')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('processing_started_at', models.DateTimeField(blank=True, null=True, verbose_name='Inicio de procesamiento')),
                ('processing_completed_at', models.DateTimeField(blank=True, null=True, verbose_name='Fin de procesamiento')),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lstm_analyses',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('data_preparation', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lstm_analyses',
                    to='data_preparation.datapreparation',
                    verbose_name='Preparación de Datos',
                )),
                ('topic_modeling', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lstm_analyses',
                    to='topic_modeling.topicmodeling',
                    verbose_name='Modelo de Temas',
                )),
            ],
            options={
                'verbose_name': 'Análisis LSTM',
                'verbose_name_plural': 'Análisis LSTM',
                'db_table': 'lstm_analysis',
                'ordering': ['-created_at'],
            },
        ),
    ]
