#!/bin/bash
# Startup script for Django backend on Hugging Face Spaces

set -e  # Exit on error

echo "===== Django Backend Startup ====="
echo "Starting at $(date)"
echo ""

# Run database migrations
echo "📦 Running database migrations..."
python manage.py migrate --noinput
echo "✅ Migrations complete"
echo ""

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --clear
echo "✅ Static files collected"
echo ""

# Create superuser if needed
echo "👤 Ensuring superuser exists..."
python manage.py ensuresuperuser
echo ""

# Start gunicorn server
echo "🚀 Starting Gunicorn server on port 7860..."
echo "====================================="
echo ""

exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:7860 \
    --workers 2 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
