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
                    # Verificar si las tablas de admin ya existen
                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = 'django_admin_log'
                        )
                        """
                    )
                    admin_tables_exist = cursor.fetchone()[0]

                    self.stdout.write(self.style.ERROR(
                        f'🚨 CONFLICTO: {admin_count} migraciones de admin existen pero users.0001_initial no'
                    ))

                    if admin_tables_exist:
                        # Las tablas de admin existen, solo insertar users.0001_initial
                        self.stdout.write(self.style.WARNING(
                            '📋 Tablas de admin existen - Insertando users.0001_initial sin tocar admin...'
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
                            '✅ users.0001_initial insertada - migraciones de admin quedan intactas'
                        ))
                    else:
                        # Las tablas NO existen, eliminar registros de admin para re-ejecutar
                        self.stdout.write(self.style.WARNING(
                            '🗑️  Eliminando registros de admin para permitir re-ejecución ordenada...'
                        ))

                        cursor.execute(
                            """
                            DELETE FROM django_migrations
                            WHERE app = %s
                            """,
                            ['admin']
                        )
                        transaction.commit()

                        self.stdout.write(self.style.SUCCESS(
                            f'✅ {admin_count} migraciones de admin eliminadas - migrate ejecutará users primero'
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
