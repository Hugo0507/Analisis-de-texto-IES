"""
Elimina dos modelos que nunca se usaron.

MatrixStorage y DocumentTopic se declararon en la primera version del esquema
pero ningun use case, servicio o vista llego a escribir en ellos: la busqueda
en todo el historial de git no encuentra una sola llamada a .objects.create,
.bulk_create ni una instanciacion directa. Solo los referenciaban el admin.py
y los serializers de su propia app.

Sus tablas (matrix_storage y document_topics) estan por tanto vacias, salvo
filas introducidas a mano desde el admin de Django.

La migracion es reversible: revertirla vuelve a crear ambas tablas vacias.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("analysis", "0004_fix_documenttopic_documentfactor_fk_to_datasetfile"),
    ]

    # makemigrations generaba dos RemoveField previos al DeleteModel. Esa forma
    # no revierte: al deshacerla Django recrea DocumentTopic sin campos y acto
    # seguido intenta restaurar el indice sobre 'document', que aun no existe
    # (FieldDoesNotExist). Con solo los DeleteModel, ambos sentidos funcionan.
    operations = [
        migrations.DeleteModel(
            name="DocumentTopic",
        ),
        migrations.DeleteModel(
            name="MatrixStorage",
        ),
    ]
