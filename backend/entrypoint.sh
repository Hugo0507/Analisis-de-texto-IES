#!/bin/bash
# Entrypoint script for backend container
# Ensures spaCy models are installed before starting the application

set -e

echo "🔧 Backend initialization starting..."

# Check if spaCy model is installed, if not download it
echo "📦 Checking spaCy model en_core_web_sm..."
if ! python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null; then
    echo "⬇️  Downloading spaCy model en_core_web_sm..."
    python -m spacy download en_core_web_sm
    echo "✅ spaCy model installed successfully"
else
    echo "✅ spaCy model already installed"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
python manage.py migrate --noinput || echo "⚠️  Migrations failed (might be expected in some environments)"

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear || echo "⚠️  Static collection failed (might be expected)"

echo "✅ Backend initialization complete!"
echo "🚀 Starting application..."

# Execute the main command (passed as arguments to this script)
exec "$@"
