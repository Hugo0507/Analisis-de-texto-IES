"""
Comando para arreglar el historial de migraciones inconsistente.
Inserta manualmente el registro de users.0001_initial en django_migrations.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Arregla el historial de migraciones insertando users.0001_initial si falta'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Verificando historial de migraciones...')

        with connection.cursor() as cursor:
            # Verificar si users.0001_initial ya está registrada
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                ['users', '0001_initial']
            )
            count = cursor.fetchone()[0]

            if count == 0:
                self.stdout.write(self.style.WARNING(
                    '⚠️  users.0001_initial no está en django_migrations'
                ))

                # Verificar si la tabla auth_user existe (indica que las tablas ya están creadas)
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'users_user'
                    )
                    """
                )
                table_exists = cursor.fetchone()[0]

                if table_exists:
                    self.stdout.write(self.style.WARNING(
                        '📋 La tabla users_user existe, insertando registro de migración...'
                    ))

                    # Insertar el registro de la migración
                    cursor.execute(
                        """
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES (%s, %s, NOW())
                        """,
                        ['users', '0001_initial']
                    )

                    self.stdout.write(self.style.SUCCESS(
                        '✅ Registro de users.0001_initial insertado correctamente'
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        '⏭️  La tabla users_user no existe, las migraciones se aplicarán normalmente'
                    ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    '✅ users.0001_initial ya está registrada'
                ))

        self.stdout.write(self.style.SUCCESS('✨ Historial de migraciones verificado'))
