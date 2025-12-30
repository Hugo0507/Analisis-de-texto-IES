"""
Comando para arreglar el historial de migraciones inconsistente.
Inserta manualmente el registro de users.0001_initial en django_migrations.
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction


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
            users_count = cursor.fetchone()[0]

            # Verificar si hay CUALQUIER migración de admin (no solo 0001_initial)
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = %s",
                ['admin']
            )
            admin_count = cursor.fetchone()[0]

            # Verificar si la tabla users_user existe
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

            if users_count == 0:
                self.stdout.write(self.style.WARNING(
                    '⚠️  users.0001_initial no está en django_migrations'
                ))

                # Si hay alguna migración de admin, tenemos un problema de dependencias
                if admin_count > 0:
                    self.stdout.write(self.style.ERROR(
                        f'🚨 CONFLICTO: {admin_count} migraciones de admin existen pero users.0001_initial no'
                    ))
                    self.stdout.write(self.style.WARNING(
                        '🗑️  Eliminando TODAS las migraciones de admin para permitir re-ejecución ordenada...'
                    ))

                    # Eliminar TODAS las migraciones de admin para que se ejecuten después de users
                    cursor.execute(
                        """
                        DELETE FROM django_migrations
                        WHERE app = %s
                        """,
                        ['admin']
                    )
                    # CRÍTICO: Commit explícito para que migrate vea los cambios
                    transaction.commit()

                    self.stdout.write(self.style.SUCCESS(
                        f'✅ {total_admin_migrations} migraciones de admin eliminadas - migrate ejecutará users primero'
                    ))
                elif table_exists:
                    self.stdout.write(self.style.WARNING(
                        '📋 La tabla users_user existe, insertando registro de migración...'
                    ))

                    cursor.execute(
                        """
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES (%s, %s, NOW())
                        """,
                        ['users', '0001_initial']
                    )
                    transaction.commit()

                    self.stdout.write(self.style.SUCCESS(
                        '✅ Registro de users.0001_initial insertado correctamente'
                    ))
                else:
                    self.stdout.write(self.style.SUCCESS(
                        '⏭️  Base de datos fresca, las migraciones se aplicarán normalmente'
                    ))
            else:
                # users.0001_initial ESTÁ registrada
                if not table_exists:
                    # PROBLEMA: Migración registrada pero tabla no existe
                    self.stdout.write(self.style.ERROR(
                        '🚨 ERROR: users.0001_initial registrada pero tabla users_user NO existe'
                    ))
                    self.stdout.write(self.style.WARNING(
                        '🗑️  Eliminando registro de migración fantasma para forzar re-ejecución...'
                    ))

                    # Eliminar el registro fantasma
                    cursor.execute(
                        """
                        DELETE FROM django_migrations
                        WHERE app = %s AND name = %s
                        """,
                        ['users', '0001_initial']
                    )
                    transaction.commit()

                    self.stdout.write(self.style.SUCCESS(
                        '✅ Registro eliminado - migrate ahora creará la tabla users_user'
                    ))
                else:
                    self.stdout.write(self.style.SUCCESS(
                        '✅ users.0001_initial está registrada y tabla existe'
                    ))

        self.stdout.write(self.style.SUCCESS('✨ Historial de migraciones verificado'))
