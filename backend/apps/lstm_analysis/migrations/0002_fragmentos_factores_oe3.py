"""
Fragmentos, etiquetas por factor OE3 y métricas frente a la línea base.

Se escribe a mano para añadir solo estos campos: la app arrastra diferencias
antiguas (help_text, verbose_name y el tipo del id) que no forman parte de
este cambio.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lstm_analysis', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='lstmanalysis',
            name='label_mode',
            field=models.CharField(
                choices=[('topic', 'Tema dominante del modelo de temas'),
                         ('oe3', 'Factor OE3 del tema dominante')],
                default='topic', max_length=10, verbose_name='Etiquetas'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='fragment_words',
            field=models.PositiveIntegerField(
                default=0,
                help_text='0 = cada documento es un ejemplo; >0 = se parte en fragmentos de ese tamaño',
                verbose_name='Palabras por fragmento'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='samples_used',
            field=models.IntegerField(default=0, verbose_name='Ejemplos (fragmentos o documentos)'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='macro_f1',
            field=models.FloatField(blank=True, null=True, verbose_name='F1 macro por documento (test)'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='baseline_accuracy',
            field=models.FloatField(blank=True, null=True, verbose_name='Exactitud de la clase mayoritaria'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='baseline_macro_f1',
            field=models.FloatField(blank=True, null=True, verbose_name='F1 macro de la clase mayoritaria'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='fragment_accuracy',
            field=models.FloatField(blank=True, null=True, verbose_name='Exactitud por fragmento'),
        ),
        migrations.AddField(
            model_name='lstmanalysis',
            name='fragment_macro_f1',
            field=models.FloatField(blank=True, null=True, verbose_name='F1 macro por fragmento'),
        ),
    ]
