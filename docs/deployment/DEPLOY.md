# Guía de Despliegue - Análisis de Transformación Digital

Esta guía explica cómo desplegar la aplicación en diferentes entornos de producción.

## 📋 Tabla de Contenidos

- [Prerrequisitos](#prerrequisitos)
- [Configuración](#configuración)
- [Despliegue con Docker Compose](#despliegue-con-docker-compose)
- [Despliegue en AWS](#despliegue-en-aws)
- [Despliegue en Digital Ocean](#despliegue-en-digital-ocean)
- [Despliegue del Frontend en Vercel](#despliegue-del-frontend-en-vercel)
- [Monitoreo y Logging](#monitoreo-y-logging)
- [Backup y Recuperación](#backup-y-recuperación)

---

## Prerrequisitos

### Software Requerido

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Git**
- **Servidor Linux** (Ubuntu 22.04 recomendado)
- **Dominio** configurado con DNS

### Recursos Mínimos Recomendados

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disco**: 20 GB SSD
- **Ancho de banda**: 100 Mbps

---

## Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/analisis_transformacion_digital.git
cd analisis_transformacion_digital
```

### 2. Configurar Variables de Entorno

#### Backend

```bash
cd backend
cp .env.example .env
nano .env
```

**Configurar las siguientes variables**:

```bash
# Django
DJANGO_SECRET_KEY=tu-secret-key-super-seguro-aqui
DJANGO_ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,api.tu-dominio.com

# Database
DB_NAME=analisis_transformacion_digital
DB_USER=django_user
DB_PASSWORD=tu-password-seguro-para-mysql
DB_ROOT_PASSWORD=tu-root-password-seguro
DB_HOST=mysql
DB_PORT=3306

# Redis
REDIS_URL=redis://redis:6379/1

# CORS
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
CSRF_TRUSTED_ORIGINS=https://tu-dominio.com

# Email (para notificaciones de errores)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
DEFAULT_FROM_EMAIL=tu-email@gmail.com
DJANGO_ADMINS=Tu Nombre:tu-email@gmail.com

# Google Drive API
GOOGLE_DRIVE_CREDENTIALS_FILE=/app/credentials/credentials.json
GOOGLE_DRIVE_TOKEN_FILE=/app/credentials/token.json

# Sentry (opcional)
SENTRY_DSN=
```

#### Frontend

```bash
cd ../frontend
cp .env.production.example .env.production
nano .env.production
```

**Configurar**:

```bash
REACT_APP_API_BASE_URL=https://api.tu-dominio.com/api/v1
REACT_APP_WS_BASE_URL=wss://api.tu-dominio.com/ws
REACT_APP_ENV=production
REACT_APP_ENABLE_ANALYTICS=true
```

### 3. Generar Secret Key de Django

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copia el resultado en `DJANGO_SECRET_KEY`.

---

## Despliegue con Docker Compose

### Opción 1: Despliegue Rápido (Servidor Único)

```bash
# 1. Asegúrate de tener Docker y Docker Compose instalados
docker --version
docker-compose --version

# 2. Construir las imágenes
docker-compose -f docker-compose.prod.yml build

# 3. Iniciar los servicios
docker-compose -f docker-compose.prod.yml up -d

# 4. Aplicar migraciones
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 5. Crear superusuario
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 6. Verificar estado
docker-compose -f docker-compose.prod.yml ps
```

### Opción 2: Con Nginx Reverse Proxy

Si quieres usar Nginx como reverse proxy (recomendado para producción):

1. Descomentar el servicio `nginx` en `docker-compose.prod.yml`
2. Crear archivo `nginx/nginx.conf`:

```nginx
upstream backend {
    server backend:8000;
}

upstream websocket {
    server websocket:8001;
}

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/media/;
    }

    # API requests
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Frontend (React)
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

3. Obtener certificados SSL con Let's Encrypt:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com
```

---

## Despliegue en AWS

### Arquitectura Recomendada

- **EC2**: Backend + Frontend
- **RDS MySQL**: Base de datos gestionada
- **ElastiCache Redis**: Caché gestionado
- **S3**: Archivos estáticos y media
- **CloudFront**: CDN
- **Route 53**: DNS

### Pasos

#### 1. Crear Instancia EC2

```bash
# Ubuntu 22.04 LTS
# Tipo: t3.medium (2 vCPU, 4 GB RAM)
# Almacenamiento: 30 GB SSD
```

#### 2. Configurar RDS MySQL

```bash
# Engine: MySQL 8.0
# Instance type: db.t3.micro
# Storage: 20 GB GP2
# Backup: 7 días
```

#### 3. Configurar ElastiCache Redis

```bash
# Engine: Redis 7.x
# Node type: cache.t3.micro
```

#### 4. Conectar a EC2 y Desplegar

```bash
# SSH a la instancia
ssh -i tu-key.pem ubuntu@tu-ip-publica

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clonar proyecto
git clone https://github.com/tu-usuario/proyecto.git
cd proyecto

# Configurar .env con URLs de RDS y ElastiCache
DB_HOST=your-rds-endpoint.amazonaws.com
REDIS_URL=redis://your-elasticache-endpoint.amazonaws.com:6379/1

# Desplegar
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. Configurar S3 para Archivos Estáticos

```python
# backend/config/settings/production.py
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = 'tu-bucket-name'
AWS_S3_REGION_NAME = 'us-east-1'

DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
```

---

## Despliegue en Digital Ocean

### Opción 1: Droplet con Docker

```bash
# 1. Crear Droplet (Ubuntu 22.04)
# Basic Plan: $24/month (2 vCPU, 4 GB RAM, 80 GB SSD)

# 2. Agregar Managed Database (MySQL)
# Plan: $15/month (1 GB RAM, 10 GB storage)

# 3. Configurar Redis (Managed Redis o en mismo Droplet)

# 4. SSH y desplegar igual que AWS
```

### Opción 2: App Platform (PaaS)

Digital Ocean App Platform puede desplegar automáticamente desde Git:

1. Conectar repositorio de GitHub
2. Detecta automáticamente Dockerfile
3. Configurar variables de entorno en UI
4. Configurar Managed Database
5. Deploy automático en cada push

**Costo estimado**: $35-50/mes

---

## Despliegue del Frontend en Vercel

Si quieres desplegar solo el frontend en Vercel (recomendado para mejor performance):

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
cd frontend
vercel --prod
```

### 3. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel:
- `REACT_APP_API_BASE_URL`: URL del backend
- `REACT_APP_WS_BASE_URL`: URL del WebSocket

### 4. Configurar CORS en Backend

Agregar el dominio de Vercel a `CORS_ALLOWED_ORIGINS`:

```bash
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app
```

---

## Monitoreo y Logging

### Logs con Docker

```bash
# Ver logs de todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f backend

# Ver logs con tail
docker-compose -f docker-compose.prod.yml logs --tail=100 -f
```

### Configurar Sentry (Opcional)

1. Crear cuenta en [sentry.io](https://sentry.io)
2. Crear proyecto Django
3. Copiar DSN
4. Agregar a `.env`:

```bash
SENTRY_DSN=https://xxxx@sentry.io/project-id
```

### Métricas con Prometheus + Grafana (Opcional)

Ver guía separada en `docs/monitoring/PROMETHEUS_GRAFANA.md`

---

## Backup y Recuperación

### Backup Automático de MySQL

```bash
# Script de backup diario
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec mysql mysqldump \
  -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup_${DATE}.sql
```

### Agregar a crontab

```bash
0 2 * * * /path/to/backup-script.sh
```

### Restaurar Backup

```bash
docker-compose -f docker-compose.prod.yml exec -T mysql mysql \
  -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < backup_20250101_020000.sql
```

### Backup de Volúmenes Docker

```bash
# Backup de volumen MySQL
docker run --rm -v analisis_transformacion_digital_mysql_data:/data \
  -v $(pwd):/backup ubuntu tar czf /backup/mysql_backup.tar.gz /data

# Backup de volumen Redis
docker run --rm -v analisis_transformacion_digital_redis_data:/data \
  -v $(pwd):/backup ubuntu tar czf /backup/redis_backup.tar.gz /data
```

---

## Comandos Útiles

```bash
# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Actualizar imágenes
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Ver uso de recursos
docker stats

# Limpiar imágenes antiguas
docker system prune -a
```

---

## Troubleshooting

### Backend no se conecta a MySQL

```bash
# Verificar que MySQL esté running
docker-compose -f docker-compose.prod.yml ps mysql

# Ver logs de MySQL
docker-compose -f docker-compose.prod.yml logs mysql

# Verificar conexión
docker-compose -f docker-compose.prod.yml exec backend python manage.py check --database default
```

### Frontend no se conecta al Backend

- Verificar `CORS_ALLOWED_ORIGINS` en backend
- Verificar `REACT_APP_API_BASE_URL` en frontend
- Revisar logs de nginx si usas reverse proxy

### WebSocket no funciona

- Verificar que el puerto 8001 esté abierto
- Configurar nginx para proxy WebSocket correctamente
- Verificar Redis esté running

---

## Seguridad

### Checklist de Seguridad

- [ ] HTTPS configurado con certificados válidos
- [ ] Variables de entorno con valores seguros
- [ ] Firewall configurado (solo puertos 80, 443, 22)
- [ ] SSH con key-based authentication
- [ ] Backups automáticos configurados
- [ ] Monitoring y alertas configurados
- [ ] Rate limiting en API
- [ ] CORS configurado correctamente

### Actualizar Dependencias

```bash
# Backend
cd backend
pip list --outdated
pip install --upgrade <package>

# Frontend
cd frontend
npm outdated
npm update
```

---

## Soporte

Para más ayuda:
- **Documentación**: Ver `docs/` folder
- **Issues**: GitHub Issues
- **Email**: soporte@tu-dominio.com
