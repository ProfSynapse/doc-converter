# Flask Backend Dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

# Install system dependencies for Pandoc and WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app /tmp/converted && \
    chown -R appuser:appuser /app /tmp/converted

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser app/ /app/app/
COPY --chown=appuser:appuser migrations/ /app/migrations/
COPY --chown=appuser:appuser wsgi.py /app/

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --threads 2 --timeout 30 wsgi:app"]
