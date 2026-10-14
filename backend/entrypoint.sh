#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py seed_demo_data

# Use Gunicorn se instalado, caso contrário usa runserver
if command -v gunicorn >/dev/null 2>&1; then
    echo "A iniciar servidor com Gunicorn..."
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers ${GUNICORN_WORKERS:-3} \
        --threads 2 \
        --timeout 300
else
    echo "Gunicorn não encontrado. A iniciar servidor com runserver..."
    exec python manage.py runserver 0.0.0.0:8000
fi
