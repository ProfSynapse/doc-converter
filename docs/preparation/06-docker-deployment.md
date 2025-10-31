# Docker Containerization Best Practices

## Overview

This document covers Docker containerization strategies for the markdown converter application, with focus on minimal image size, security, and Railway deployment compatibility.

## Python Docker Configuration

### Recommended Dockerfile (Multi-Stage Build)

```dockerfile
# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies to /install
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================
# Stage 2: Runtime
# ============================================
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# Install runtime dependencies for WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Run application
CMD ["python", "app.py"]
```

### Alternative: Pypandoc with Pandoc Binary

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install Pandoc and WeasyPrint dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["python", "app.py"]
```

### Minimal Dockerfile (Without WeasyPrint System Deps)

If using pypandoc-binary (includes Pandoc) without WeasyPrint:

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["python", "app.py"]
```

**Size Comparison:**
- With WeasyPrint: ~300-400MB
- With pypandoc only: ~200-250MB
- Minimal (pypandoc-binary): ~180-220MB

### requirements.txt

```txt
# Core dependencies
python-frontmatter==1.0.1
pypandoc-binary==1.13  # Includes Pandoc

# For WeasyPrint PDF generation (optional)
weasyprint==62.3
markdown==3.6

# Web framework (if building API)
flask==3.0.3
gunicorn==22.0.0

# Optional: Enhanced markdown
mistune==3.0.2
pygments==2.18.0  # Syntax highlighting
```

## Node.js Docker Configuration

### Recommended Dockerfile (Multi-Stage Build)

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Stage 2: Build (if using TypeScript)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# RUN npm run build  # If using TypeScript

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=8080

# Install Pandoc (if needed)
RUN apk add --no-cache pandoc

WORKDIR /app

# Copy dependencies from first stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application
COPY --chown=node:node . .

# Use non-root user
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD node healthcheck.js || exit 1

CMD ["node", "server.js"]
```

### With Puppeteer (Heavy)

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

USER node

EXPOSE 8080

CMD ["node", "server.js"]
```

**Size:** ~500-800MB with Puppeteer

## Docker Best Practices

### 1. Layer Optimization

**❌ Bad: Multiple RUN commands**
```dockerfile
RUN apt-get update
RUN apt-get install -y package1
RUN apt-get install -y package2
RUN rm -rf /var/lib/apt/lists/*
```

**✅ Good: Combined commands**
```dockerfile
RUN apt-get update && apt-get install -y \
    package1 \
    package2 \
    && rm -rf /var/lib/apt/lists/*
```

### 2. .dockerignore File

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv/

# Node.js
node_modules/
npm-debug.log
yarn-error.log

# Development
.git/
.gitignore
.env
.env.*
*.md
docs/
tests/
.pytest_cache/

# IDE
.vscode/
.idea/
*.swp

# Build artifacts
dist/
build/
*.egg-info/

# OS
.DS_Store
Thumbs.db
```

### 3. Multi-Stage Builds Benefits

**Size Reduction:**
- Single stage: ~600MB
- Multi-stage: ~300MB
- Reduction: 50%+

**Security:**
- Build tools not in final image
- Smaller attack surface
- Fewer vulnerabilities

**Speed:**
- Better layer caching
- Faster subsequent builds
- Smaller push/pull times

### 4. Security Best Practices

**Run as Non-Root User:**
```dockerfile
# Python
RUN useradd -m -u 1000 appuser
USER appuser

# Node.js
USER node  # Built-in user
```

**Scan for Vulnerabilities:**
```bash
# Use Docker Scout
docker scout cves IMAGE_NAME

# Or Trivy
trivy image IMAGE_NAME
```

**Keep Base Images Updated:**
```dockerfile
# Pin specific versions
FROM python:3.12.1-slim

# Or use latest patch version
FROM python:3.12-slim
```

### 5. Environment Variables

```dockerfile
# Default environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    LOG_LEVEL=INFO

# Accept build args
ARG VERSION=latest
ENV APP_VERSION=${VERSION}
```

### 6. Health Checks

**Python Flask Example:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()" || exit 1
```

**Node.js Express Example:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1
```

## Docker Compose for Development

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - LOG_LEVEL=DEBUG
    volumes:
      - ./app:/app  # Hot reload
    restart: unless-stopped

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Building and Running

### Build Image

```bash
# Standard build
docker build -t md-converter:latest .

# With build args
docker build --build-arg VERSION=1.0.0 -t md-converter:1.0.0 .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t md-converter:latest .
```

### Run Container

```bash
# Basic run
docker run -p 8080:8080 md-converter:latest

# With environment variables
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e LOG_LEVEL=INFO \
  md-converter:latest

# With volume mount
docker run -p 8080:8080 \
  -v $(pwd)/uploads:/app/uploads \
  md-converter:latest
```

### Test Locally

```bash
# Build
docker build -t md-converter:test .

# Run
docker run -d -p 8080:8080 --name md-converter-test md-converter:test

# Check logs
docker logs md-converter-test

# Test endpoint
curl http://localhost:8080/health

# Stop and remove
docker stop md-converter-test && docker rm md-converter-test
```

## Size Optimization Checklist

- ✅ Use slim/alpine base images
- ✅ Multi-stage builds
- ✅ Remove build dependencies from final image
- ✅ Use .dockerignore file
- ✅ Combine RUN commands
- ✅ Clean package manager cache
- ✅ Only install production dependencies
- ✅ Avoid unnecessary files in final image
- ✅ Use specific dependency versions

## Railway-Specific Considerations

### 1. Port Configuration

Railway injects `PORT` environment variable:

```dockerfile
# Use Railway's PORT or default to 8080
ENV PORT=8080
```

```python
# In app.py
import os
port = int(os.environ.get('PORT', 8080))
app.run(host='0.0.0.0', port=port)
```

### 2. Build Detection

Railway auto-detects:
- Python: If `requirements.txt` exists
- Node.js: If `package.json` exists
- Dockerfile: If `Dockerfile` exists (highest priority)

### 3. Start Command

Railway uses:
- Python: `gunicorn app:app`
- Node.js: `npm start`
- Docker: `CMD` from Dockerfile

Override in `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "python app.py"
```

## Recommended Approach for This Project

**Python with Pypandoc + WeasyPrint:**

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:$PORT/health')" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--workers", "2", "app:app"]
```

**Expected Size:** ~350MB
**Build Time:** 2-3 minutes
**Startup Time:** 2-5 seconds

---

**Sources:**
- Docker Documentation: https://docs.docker.com/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Railway Documentation: https://docs.railway.app/
- Community benchmarks and production deployments (2025)
