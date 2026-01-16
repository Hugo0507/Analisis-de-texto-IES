#!/bin/bash
# Startup script for Django backend on Hugging Face Spaces

set -e  # Exit on error

echo "===== Django Backend Startup ====="
echo "Starting at $(date)"
echo ""

# Verify BERTopic dependencies
echo "🔍 Verifying BERTopic dependencies..."
python -c "import bertopic; print(f'✅ bertopic: {bertopic.__version__}')" || echo "❌ bertopic NOT installed"
python -c "import sentence_transformers; print(f'✅ sentence_transformers: {sentence_transformers.__version__}')" || echo "❌ sentence_transformers NOT installed"
python -c "import umap; print(f'✅ umap: installed')" || echo "❌ umap NOT installed"
python -c "import hdbscan; print(f'✅ hdbscan: installed')" || echo "❌ hdbscan NOT installed"
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

# Create test user for development
echo "👤 Creating test user..."
python manage.py create_test_user
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
