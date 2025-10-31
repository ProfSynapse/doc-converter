# Deployment Architecture

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document specifies the complete deployment architecture for the Markdown Converter application, including Docker containerization, Railway platform configuration, environment management, and operational procedures.

---

## Deployment Strategy

### Deployment Model: Single Container Monolith

```
┌──────────────────────────────────────────────────────────────┐
│                      Railway Platform                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Load Balancer                        │  │
│  │           (Automatic HTTPS + Routing)                  │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │              Docker Container Instance                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Gunicorn (2-4 workers)                          │  │  │
│  │  │  ├─ Flask App                                    │  │  │
│  │  │  │  ├─ API Endpoints                             │  │  │
│  │  │  │  └─ Static File Serving                       │  │  │
│  │  │  ├─ Conversion Engine                            │  │  │
│  │  │  └─ Temporary Storage (/tmp)                     │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Metrics: CPU, Memory, Request Count, Error Rate            │
│  Logs: Application logs, Access logs                        │
└──────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- Single container deployment
- Stateless design (horizontal scaling ready)
- Ephemeral file storage
- Automatic HTTPS
- Built-in monitoring

---

## Docker Configuration

### Dockerfile (Production-Ready)

**Location:** `/Dockerfile`

```dockerfile
# ============================================
# Multi-Stage Build for Optimized Image Size
# ============================================

# Stage 1: Base Python image with system dependencies
FROM python:3.12-slim as base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# Install system dependencies for Pandoc and WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Pandoc for Word generation
    pandoc \
    # WeasyPrint dependencies for PDF generation
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Cleanup
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Stage 2: Build dependencies
FROM base as builder

WORKDIR /build

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies to /install prefix
RUN pip install --prefix=/install --no-warn-script-location -r requirements.txt

# Stage 3: Runtime image
FROM base

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash appuser && \
    mkdir -p /app /tmp/converted && \
    chown -R appuser:appuser /app /tmp/converted

WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appuser app/ /app/app/
COPY --chown=appuser:appuser static/ /app/static/
COPY --chown=appuser:appuser requirements.txt /app/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health').read()" || exit 1

# Start application with Gunicorn
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--threads", "2", \
     "--timeout", "30", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "app.app:app"]
```

**Image Characteristics:**
- **Base Image:** python:3.12-slim (~120MB)
- **Final Size:** ~400-450MB
- **Build Time:** 2-3 minutes (first build), 30-60s (cached)
- **Startup Time:** 3-5 seconds

### .dockerignore

**Location:** `/.dockerignore`

```gitignore
# Python cache
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Virtual environments
venv/
env/
.venv/
ENV/

# Development files
.git/
.gitignore
.env
.env.*
.pytest_cache/
.coverage
htmlcov/

# Documentation
docs/
*.md
!README.md

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build artifacts
dist/
build/
*.egg-info/

# Tests
tests/
test_*.py

# Temporary files
tmp/
*.log

# Docker
.dockerignore
Dockerfile.dev
```

---

## Railway Platform Configuration

### railway.toml

**Location:** `/railway.toml`

```toml
[build]
# Use Dockerfile for building
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
# Start command (Gunicorn with dynamic PORT from Railway)
startCommand = "gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 30 --access-logfile - --error-logfile - app.app:app"

# Restart policy
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

# Health check configuration
healthcheckPath = "/health"
healthcheckTimeout = 10

# Number of replicas (default: 1, can scale up)
numReplicas = 1

[env]
# Environment variables with defaults
PORT = { default = "8080" }
PYTHON_VERSION = { default = "3.12" }
LOG_LEVEL = { default = "INFO" }
MAX_FILE_SIZE = { default = "10485760" }
FLASK_ENV = { default = "production" }
```

### Procfile (Alternative)

**Location:** `/Procfile`

```
web: gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 30 app.app:app
```

---

## Environment Variables

### Required Variables

| Variable | Description | Default | Production Value |
|----------|-------------|---------|------------------|
| PORT | HTTP server port | 8080 | Injected by Railway |
| FLASK_ENV | Flask environment | production | production |
| LOG_LEVEL | Logging level | INFO | INFO |

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| MAX_FILE_SIZE | Max upload size (bytes) | 10485760 | 10MB |
| DEBUG | Debug mode | False | Never True in production |
| SECRET_KEY | Flask secret key | Generated | Set for session security |
| CLEANUP_INTERVAL | File cleanup interval (seconds) | 86400 | 24 hours |

### Setting Environment Variables in Railway

**Via Dashboard:**
1. Navigate to project settings
2. Go to "Variables" tab
3. Add key-value pairs
4. Deploy to apply changes

**Via Railway CLI:**
```bash
railway variables set LOG_LEVEL=DEBUG
railway variables set MAX_FILE_SIZE=20971520
```

**Via railway.toml:**
```toml
[env]
LOG_LEVEL = { default = "INFO" }
MAX_FILE_SIZE = { default = "10485760" }
```

---

## Gunicorn Configuration

### Worker Configuration

**Strategy:** Process-based workers for CPU-bound conversion tasks

```python
# Gunicorn configuration (can be in gunicorn.conf.py)
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
backlog = 2048

# Worker processes
workers = int(os.environ.get('GUNICORN_WORKERS', '2'))
worker_class = 'sync'  # Sync workers for CPU-bound tasks
threads = int(os.environ.get('GUNICORN_THREADS', '2'))
worker_connections = 1000
max_requests = 1000  # Restart workers after N requests
max_requests_jitter = 50
timeout = 30
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.environ.get('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'md-converter'

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# Restart workers if memory usage exceeds threshold
# worker_tmp_dir = '/dev/shm'  # Use RAM for worker temp files (if available)
```

### Worker Calculation

```python
# Recommended formula for CPU-bound tasks
workers = min(
    (multiprocessing.cpu_count() * 2) + 1,
    4  # Cap at 4 for Railway's default resources
)

# For Railway's default plan (512MB RAM, 1 vCPU)
workers = 2  # Conservative for memory constraints
threads = 2  # Allow some concurrency per worker
```

---

## Deployment Pipeline

### Continuous Deployment Flow

```
Developer Push to Git
        │
        ▼
Git Repository (GitHub/GitLab)
        │
        ▼
Railway Webhook Triggered
        │
        ▼
┌───────────────────────┐
│  Build Phase          │
│  1. Pull source code  │
│  2. Build Docker img  │
│  3. Run tests (opt)   │
│  4. Push to registry  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Deploy Phase         │
│  1. Pull image        │
│  2. Stop old container│
│  3. Start new         │
│  4. Health check      │
│  5. Route traffic     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Verify Phase         │
│  1. Check health      │
│  2. Monitor metrics   │
│  3. Rollback if fail  │
└───────────────────────┘
```

### Zero-Downtime Deployment

Railway implements rolling deployments:
1. New container starts
2. Health check passes
3. Traffic gradually shifts to new container
4. Old container drains connections
5. Old container terminates

**Deployment Time:** 2-3 minutes total

---

## Scaling Configuration

### Vertical Scaling (Resource-Based)

**Railway Plans:**

| Plan | vCPU | RAM | Storage | Estimated Capacity |
|------|------|-----|---------|-------------------|
| Starter | 1 | 512 MB | 1 GB | 10-20 conversions/min |
| Developer | 2 | 1 GB | 5 GB | 30-50 conversions/min |
| Team | 4 | 2 GB | 10 GB | 100+ conversions/min |

**Scaling Triggers:**
- CPU usage > 80% sustained
- Memory usage > 85%
- Request queue > 10
- Response time > 10 seconds

### Horizontal Scaling (Instance-Based)

**Configuration:**
```toml
# railway.toml
[deploy]
numReplicas = 2  # Scale to 2 instances
```

**Characteristics:**
- Stateless design enables easy horizontal scaling
- Railway load balancer distributes traffic
- No session affinity needed
- Linear performance scaling

**Cost Calculation:**
- 1 instance: $5-10/month
- 2 instances: $10-20/month
- 3 instances: $15-30/month

---

## Monitoring and Logging

### Health Check Endpoint

**Implementation:**
```python
@app.route('/health')
def health():
    """Health check for Railway"""
    try:
        # Check Pandoc availability
        import pypandoc
        pypandoc.get_pandoc_version()

        # Check WeasyPrint availability
        from weasyprint import __version__

        return jsonify({
            'status': 'healthy',
            'service': 'md-converter',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503
```

**Railway Health Check:**
- Interval: 30 seconds
- Timeout: 10 seconds
- Failures: 3 consecutive failures trigger restart

### Logging Strategy

**Log Levels:**
```python
import logging

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler()  # Log to stdout for Railway
    ]
)

logger = logging.getLogger(__name__)
```

**Log Types:**
- **Access Logs:** HTTP requests (via Gunicorn)
- **Application Logs:** Business logic events
- **Error Logs:** Exceptions and failures

**Sample Log Entries:**
```
2025-10-31 10:30:15 [INFO] converter: Converting document.md to DOCX
2025-10-31 10:30:17 [INFO] converter: Successfully created document.docx (45KB)
2025-10-31 10:30:18 [ERROR] converter: PDF generation failed: Font not found
```

### Metrics (Railway Dashboard)

**Available Metrics:**
- Request count (total, per endpoint)
- Response time (p50, p95, p99)
- Error rate
- CPU usage (%)
- Memory usage (MB)
- Disk usage (GB)
- Network I/O (MB)

**Alert Thresholds:**
- Error rate > 5%
- Response time p95 > 10s
- Memory usage > 450MB
- CPU usage > 85%

---

## File Storage Management

### Temporary Storage

**Location:** `/tmp/converted/`
**Type:** Ephemeral (cleared on container restart)
**Lifecycle:** 24 hours

**Cleanup Strategy:**

```python
# Scheduled cleanup job
import schedule
import time
from app.utils.file_handler import cleanup_old_files

def job():
    cleanup_old_files(max_age_hours=24)
    logger.info("Completed file cleanup")

schedule.every(6).hours.do(job)

# Run in background thread
def run_scheduler():
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start scheduler
import threading
scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
scheduler_thread.start()
```

**Disk Space Management:**
- Monitor: `/tmp` usage
- Alert: > 80% full
- Action: Force cleanup if > 90%

### Persistent Storage (Future)

**If needed for file history:**

**Railway Volumes:**
```toml
# railway.toml
[[volumes]]
name = "converted-files"
mountPath = "/app/storage/converted"
```

**Alternative: Cloud Storage (S3)**
```python
import boto3
s3_client = boto3.client('s3')

# Upload converted file
s3_client.upload_file(
    local_path,
    bucket_name,
    object_key
)

# Generate presigned URL for download
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket_name, 'Key': object_key},
    ExpiresIn=3600
)
```

---

## Security Configuration

### Container Security

**Best Practices Implemented:**
1. **Non-root user:** Application runs as `appuser` (UID 1000)
2. **Minimal base image:** python:3.12-slim
3. **No unnecessary packages:** Only required dependencies
4. **Read-only filesystem:** Except `/tmp` for temporary files
5. **Health checks:** Automatic restart on failures

### Network Security

**HTTPS:**
- Automatic via Railway
- TLS 1.2+ enforced
- Certificate renewal automatic

**Headers:**
```python
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response
```

---

## Disaster Recovery

### Backup Strategy

**Code:** Version controlled in Git
**Configuration:** Stored in railway.toml and Git
**Converted Files:** Ephemeral (no backup needed)

### Rollback Procedure

**Via Railway Dashboard:**
1. Navigate to deployments
2. Select previous successful deployment
3. Click "Rollback"
4. Confirm rollback

**Via Railway CLI:**
```bash
railway rollback <deployment-id>
```

**Rollback Time:** 1-2 minutes

### Incident Response

**Severity Levels:**

| Level | Description | Response Time | Action |
|-------|-------------|---------------|--------|
| P0 | Service down | Immediate | Rollback, investigate |
| P1 | High error rate | < 15 min | Monitor, scale if needed |
| P2 | Degraded performance | < 1 hour | Investigate, optimize |
| P3 | Minor issues | < 4 hours | Log, plan fix |

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code review completed
- [ ] Environment variables configured
- [ ] Dependencies updated
- [ ] Documentation updated
- [ ] Railway.toml validated
- [ ] Dockerfile tested locally

### Deployment

- [ ] Merge to main branch
- [ ] Railway build triggered
- [ ] Build completed successfully
- [ ] Health check passing
- [ ] Smoke tests executed
- [ ] Metrics normal

### Post-Deployment

- [ ] Monitor error rates (30 min)
- [ ] Check response times
- [ ] Verify conversions working
- [ ] Review logs for errors
- [ ] Test download functionality
- [ ] Document any issues

---

## Cost Optimization

### Railway Cost Structure

**Pricing Model:** Pay-per-use
- Compute: $0.000463/minute
- Memory: $0.000231/GB/minute
- Network: $0.10/GB egress

**Monthly Estimates:**

| Usage Level | Compute Time | Est. Cost |
|-------------|-------------|-----------|
| Low (< 100/day) | ~15 hours | $5-10 |
| Medium (100-1000/day) | ~50 hours | $10-20 |
| High (> 1000/day) | ~100 hours | $20-40 |

### Optimization Strategies

1. **Right-size workers:** 2 workers sufficient for most loads
2. **Efficient cleanup:** Regular file deletion prevents disk bloat
3. **Caching:** Future: cache common conversions
4. **Monitoring:** Alert on unusual resource usage
5. **Scaling:** Only scale when metrics demand it

---

## Conclusion

This deployment architecture provides:

1. **Simplicity:** Single container monolith
2. **Reliability:** Health checks and automatic restarts
3. **Scalability:** Vertical and horizontal scaling options
4. **Observability:** Comprehensive logging and metrics
5. **Security:** Multi-layer security measures
6. **Cost-Efficiency:** Optimized resource usage

The configuration is production-ready and suitable for deployment to Railway with minimal modifications.

---

## References

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [Security Design](./SECURITY_DESIGN.md)
- [Railway Documentation](https://docs.railway.app/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Next Steps:**
1. Review Security Design for security implementation
2. Review Implementation Guide for coding standards
3. Deploy to Railway following this specification
