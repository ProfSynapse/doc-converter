# Railway Deployment Guide

## Overview

Railway is a modern Platform-as-a-Service (PaaS) that simplifies deploying applications with Git-based workflows, automatic builds, and easy scaling. This document covers Railway-specific deployment considerations for the markdown converter application.

## Railway Platform Characteristics

### Key Features

**Automatic Deployment:**
- Push code to GitHub/GitLab
- Railway auto-detects project type
- Builds and deploys automatically
- Zero-downtime deployments

**Environment Management:**
- Easy environment variable configuration
- Variable sealing for security
- Per-environment configuration
- Shared variables across services

**Scaling:**
- Automatic scaling based on traffic
- Configurable resource limits
- Multiple deployment regions
- Load balancing included

**Pricing (2025):**
- Free tier: $5 credit/month
- Developer plan: $20/month
- Production usage: Pay for resources consumed

## Project Setup

### 1. Railway CLI Installation

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# npm
npm install -g @railway/cli

# Verify installation
railway --version
```

### 2. Initialize Project

```bash
# Login to Railway
railway login

# Initialize new project
railway init

# Link to existing project
railway link [project-id]
```

### 3. Project Configuration

Create `railway.toml` in project root:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "gunicorn --bind 0.0.0.0:$PORT --workers 2 app:app"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Environment Variables

### Setting Variables

**Via Railway Dashboard:**
1. Navigate to project
2. Click "Variables" tab
3. Add variables:
   - `PORT` (auto-injected)
   - `LOG_LEVEL=INFO`
   - `MAX_FILE_SIZE=10485760`
   - Custom application variables

**Via CLI:**

```bash
# Set variable
railway variables set KEY=VALUE

# Set from .env file
railway variables set --from .env

# View variables
railway variables

# Delete variable
railway variables delete KEY
```

### Railway-Injected Variables

Railway automatically provides:

```bash
# Always available
PORT=XXXXX                    # Port to bind to
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_ID=xxx
RAILWAY_SERVICE_ID=xxx
RAILWAY_DEPLOYMENT_ID=xxx

# Git-related
RAILWAY_GIT_COMMIT_SHA=xxx
RAILWAY_GIT_BRANCH=main
RAILWAY_GIT_REPO_NAME=xxx
RAILWAY_GIT_REPO_OWNER=xxx

# Railway URLs
RAILWAY_PUBLIC_DOMAIN=xxx.railway.app
RAILWAY_PRIVATE_DOMAIN=xxx.railway.internal
```

### Using Variables in Application

**Python:**

```python
import os

# Railway port (required)
port = int(os.environ.get('PORT', 8080))

# Custom variables
log_level = os.environ.get('LOG_LEVEL', 'INFO')
max_file_size = int(os.environ.get('MAX_FILE_SIZE', 10485760))

# Railway-specific
environment = os.environ.get('RAILWAY_ENVIRONMENT', 'development')
commit_sha = os.environ.get('RAILWAY_GIT_COMMIT_SHA', 'unknown')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port)
```

**Node.js:**

```javascript
const port = process.env.PORT || 8080;
const logLevel = process.env.LOG_LEVEL || 'INFO';
const environment = process.env.RAILWAY_ENVIRONMENT || 'development';

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
```

## Docker Configuration for Railway

### Dockerfile Requirements

```dockerfile
FROM python:3.12-slim

# IMPORTANT: Use Railway's PORT environment variable
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway runs as root by default, but best practice is non-root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Railway uses $PORT)
EXPOSE $PORT

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:' + os.environ['PORT'] + '/health')" || exit 1

# Start command - MUST bind to 0.0.0.0:$PORT
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
```

### Critical Configuration Points

**1. Port Binding:**
```python
# ❌ WRONG - Railway can't access
app.run(host='localhost', port=8080)

# ✅ CORRECT - Bind to all interfaces and Railway's PORT
port = int(os.environ.get('PORT', 8080))
app.run(host='0.0.0.0', port=port)
```

**2. Health Check Endpoint:**

Railway monitors application health:

```python
from flask import Flask

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check endpoint for Railway"""
    return {'status': 'healthy', 'service': 'md-converter'}, 200

@app.route('/')
def index():
    return {'message': 'Markdown Converter API'}, 200
```

**3. Timeout Configuration:**

For document conversion (can be slow):

```python
# Gunicorn with longer timeout
CMD gunicorn --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120 \
    --graceful-timeout 120 \
    app:app
```

```toml
# railway.toml
[deploy]
healthcheckTimeout = 120
```

## Deployment Workflow

### 1. Initial Deployment

```bash
# From local directory
cd /path/to/project

# Deploy to Railway
railway up

# Or deploy specific service
railway up --service md-converter
```

### 2. GitHub Integration (Recommended)

**Setup:**
1. Push code to GitHub
2. In Railway dashboard: "New Project" → "Deploy from GitHub"
3. Select repository
4. Configure build settings
5. Railway auto-deploys on push to main branch

**Branch-Based Deployments:**
```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
# Deploy only on main branch
branch = "main"
```

### 3. Viewing Logs

```bash
# Stream logs in real-time
railway logs

# View logs for specific deployment
railway logs --deployment [deployment-id]

# Export logs
railway logs > logs.txt
```

### 4. Rollback

```bash
# List deployments
railway deployment list

# Rollback to specific deployment
railway deployment rollback [deployment-id]
```

## Resource Configuration

### 1. Scaling Settings

**Via Railway Dashboard:**
- Navigate to Settings → Resources
- Configure:
  - Memory: 512MB - 32GB
  - CPU: Shared - Dedicated cores
  - Replicas: 1-10 instances

**Via railway.toml:**

```toml
[deploy]
numReplicas = 2
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### 2. Memory Limits

For document conversion with images:

```toml
[deploy]
# Recommended for production
memoryLimit = 1024  # MB

# For heavy processing
memoryLimit = 2048  # MB
```

**In Dockerfile:**
```dockerfile
# Set Python memory limits
ENV PYTHONMALLOC=malloc
ENV MALLOC_ARENA_MAX=2
```

### 3. Request Timeouts

```python
# Flask with longer timeout
from flask import Flask
import gunicorn.app.base

class StandaloneApplication(gunicorn.app.base.BaseApplication):
    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        for key, value in self.options.items():
            self.cfg.set(key.lower(), value)

    def load(self):
        return self.application

if __name__ == '__main__':
    options = {
        'bind': f"0.0.0.0:{os.environ.get('PORT', 8080)}",
        'workers': 2,
        'timeout': 120,  # 2 minutes for large documents
        'keepalive': 5,
    }
    StandaloneApplication(app, options).run()
```

## Monitoring and Debugging

### 1. Application Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network I/O
- Request count
- Response times

**Access via:**
- Railway Dashboard → Metrics tab
- CLI: `railway metrics`

### 2. Custom Logging

```python
import logging
import os

# Configure logging for Railway
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

@app.route('/convert', methods=['POST'])
def convert():
    logger.info("Conversion request received")
    try:
        # Conversion logic
        logger.info("Conversion successful")
        return result, 200
    except Exception as e:
        logger.error(f"Conversion failed: {str(e)}", exc_info=True)
        return {'error': str(e)}, 500
```

### 3. Error Tracking

**Integrate Sentry:**

```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[FlaskIntegration()],
    environment=os.environ.get('RAILWAY_ENVIRONMENT', 'development'),
    traces_sample_rate=1.0,
)
```

## Storage Considerations

### Ephemeral Filesystem

Railway uses ephemeral storage:
- Files persist only during deployment lifetime
- Lost on redeployment or restart
- Not shared across replicas

**Implications:**
- Don't store uploads permanently on filesystem
- Use temporary files for conversion
- Clean up after processing

**Best Practices:**

```python
import tempfile
import os
from pathlib import Path

def convert_markdown(file_content):
    """Convert markdown with temporary files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create temp files
        input_path = Path(tmpdir) / 'input.md'
        output_docx = Path(tmpdir) / 'output.docx'
        output_pdf = Path(tmpdir) / 'output.pdf'

        # Write input
        input_path.write_text(file_content)

        # Convert
        convert_to_docx(input_path, output_docx)
        convert_to_pdf(input_path, output_pdf)

        # Read results
        docx_bytes = output_docx.read_bytes()
        pdf_bytes = output_pdf.read_bytes()

        # Temp directory auto-cleaned on exit
        return docx_bytes, pdf_bytes
```

### Persistent Storage Options

For persistent storage, integrate external services:

**1. Railway Volumes (if available):**
```toml
[deploy]
volumes = [
    "/app/uploads:/data/uploads"
]
```

**2. Cloud Storage (Recommended):**
```python
# AWS S3
import boto3

s3 = boto3.client('s3',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY'],
    aws_secret_access_key=os.environ['AWS_SECRET_KEY']
)

# Upload converted file
s3.upload_fileobj(file_obj, 'bucket-name', 'output.docx')
```

**3. Railway Database (for metadata):**
```bash
# Add PostgreSQL plugin
railway plugin add postgresql

# Connection string auto-injected as DATABASE_URL
```

## Common Issues and Solutions

### Issue 1: Port Binding Error

**Symptom:**
```
Error: Connection refused on port 8080
```

**Solution:**
```python
# Ensure binding to 0.0.0.0 and Railway's PORT
port = int(os.environ.get('PORT', 8080))
app.run(host='0.0.0.0', port=port)
```

### Issue 2: Build Timeout

**Symptom:**
```
Build timed out after 10 minutes
```

**Solution:**
```toml
# railway.toml
[build]
buildTimeoutSeconds = 1200  # 20 minutes
```

### Issue 3: Memory Exhaustion

**Symptom:**
```
Process killed - Out of memory
```

**Solution:**
- Increase memory limit in Railway settings
- Optimize application memory usage
- Process files in chunks
- Implement request queuing

```python
# Limit concurrent conversions
from threading import Semaphore

conversion_semaphore = Semaphore(3)  # Max 3 concurrent

@app.route('/convert', methods=['POST'])
def convert():
    with conversion_semaphore:
        # Perform conversion
        pass
```

### Issue 4: Dependency Installation Fails

**Symptom:**
```
ERROR: Could not find a version that satisfies the requirement
```

**Solution:**
```dockerfile
# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev
```

## Deployment Checklist

- ✅ Dockerfile binds to `0.0.0.0:$PORT`
- ✅ Health check endpoint implemented
- ✅ Environment variables configured
- ✅ Logging to stdout/stderr
- ✅ Error handling implemented
- ✅ Timeout values appropriate for workload
- ✅ .dockerignore configured
- ✅ Non-root user in Dockerfile
- ✅ Temporary file cleanup
- ✅ Resource limits tested

## Example Railway Configuration

**Complete railway.toml:**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
buildTimeoutSeconds = 900

[deploy]
startCommand = "gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
numReplicas = 1

[environments.production]
memoryLimit = 1024
cpuLimit = 1000
```

## Cost Optimization

**Strategies:**
1. Use appropriate resource limits (don't over-provision)
2. Implement caching for repeated conversions
3. Auto-scale based on demand
4. Use sleep mode for dev environments
5. Monitor usage via Railway dashboard

**Estimated Costs (2025):**
- Free tier: Good for testing (5GB bandwidth, 500 hours)
- Light usage: ~$5-10/month
- Moderate usage: ~$20-40/month
- Production: Scale based on traffic

---

**Sources:**
- Railway Documentation: https://docs.railway.app/
- Railway Blog: https://blog.railway.app/
- Community Discord and GitHub discussions
- Production deployment case studies (2025)
