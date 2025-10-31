# Railway Deployment Strategy - Flask + Frontend

## Executive Summary

Railway is a modern platform-as-a-service (PaaS) that simplifies application deployment with automatic environment detection, built-in CI/CD, and straightforward configuration. For the markdown converter application, the recommended deployment strategy is:

- **Single Service Deployment**: Deploy Flask backend and frontend static files in one container
- **Nixpacks Auto-Detection**: Let Railway automatically detect and configure the Python application
- **Gunicorn Production Server**: Use Gunicorn instead of Flask's development server
- **Environment-Based Configuration**: Use Railway's environment variables for configuration
- **Automatic HTTPS**: Railway provides SSL certificates automatically
- **Zero-Downtime Deployments**: Railway handles rolling deployments seamlessly

This approach minimizes complexity, reduces costs (single service vs multiple), and leverages Railway's automation for rapid deployment.

---

## Deployment Architecture

### Recommended: Monolithic Single-Container Deployment

```
Railway Service (md-converter)
├── Flask Application (Gunicorn)
│   ├── API Endpoints (/api/*)
│   ├── Static File Serving (/)
│   └── File Processing Logic
├── Static Files
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
└── Temporary Storage
    ├── uploads/
    └── converted/
```

**Benefits**:
1. **Single Service Cost**: Railway charges per service - one service is more cost-effective
2. **No CORS**: Same-origin requests eliminate cross-origin issues
3. **Atomic Deployments**: Frontend and backend deploy together
4. **Simplified Management**: One repository, one deployment, one environment
5. **Faster Communication**: No network latency between frontend and backend

**Alternative Architecture** (Not Recommended for This Project):

```
Railway Service 1 (Frontend)     Railway Service 2 (Backend API)
├── Nginx/Static Host            ├── Flask Application
└── HTML/CSS/JS Files            └── API Only

Benefits: Independent scaling     Drawbacks: 2x cost, CORS required,
                                  more complex deployment
```

---

## Railway Configuration Files

### Option 1: Automatic Detection (Recommended)

Railway's Nixpacks automatically detects Python applications and configures them appropriately.

**What Railway Detects**:
- `requirements.txt` → Python application
- `Procfile` (optional) → Custom start command
- `runtime.txt` (optional) → Python version
- `Dockerfile` (optional) → Custom build

**No configuration files needed** for basic deployment!

### Option 2: railway.json Configuration

For custom configuration, create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 3: Procfile (Simple)

Create a `Procfile` in the root directory:

```
web: gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
```

**Format**: `<process-type>: <command>`

### Option 4: Dockerfile (Maximum Control)

For complete control over the build process:

```dockerfile
# Use official Python runtime as base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies (if needed for pandoc, wkhtmltopdf, etc.)
RUN apt-get update && apt-get install -y \
    pandoc \
    texlive-xetex \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads converted

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Run gunicorn
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
```

**When to Use Dockerfile**:
- Need specific system dependencies (pandoc, LaTeX, etc.)
- Want precise control over build steps
- Need custom Python version not in Nixpacks
- Require multi-stage builds for optimization

---

## Project Structure for Railway

### Recommended File Structure

```
md-converter/
├── app.py                    # Main Flask application
├── requirements.txt          # Python dependencies
├── Procfile                  # Start command (optional)
├── runtime.txt              # Python version (optional)
├── .gitignore               # Git ignore file
├── README.md                # Project documentation
│
├── static/                  # Frontend files (served by Flask)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   └── api.js
│   └── assets/
│       └── icons/
│
├── uploads/                 # Temporary upload storage (gitignored)
├── converted/               # Converted files (gitignored)
│
└── utils/                   # Helper modules (optional)
    ├── converter.py
    └── validators.py
```

### Essential Files

#### requirements.txt

```txt
Flask==3.0.0
gunicorn==21.2.0
Werkzeug==3.0.1
python-dotenv==1.0.0
# Add your conversion libraries
# pandoc==2.3
# python-docx==1.1.0
# markdown==3.5
```

#### runtime.txt (Optional)

```txt
python-3.11.6
```

Specifies Python version. If omitted, Railway uses latest stable Python 3.x.

#### .gitignore

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.env

# Flask
instance/
.webassets-cache

# Application
uploads/
converted/
*.md
*.docx
*.pdf

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

#### .env (Local Development Only)

```
FLASK_APP=app.py
FLASK_ENV=development
PORT=5000
MAX_UPLOAD_SIZE=10485760
```

**Note**: Never commit `.env` to git. Use Railway's environment variables for production.

---

## Flask Application Configuration

### Production-Ready app.py

```python
import os
from flask import Flask, send_from_directory, jsonify
from werkzeug.exceptions import RequestEntityTooLarge
from pathlib import Path

# Initialize Flask app
app = Flask(__name__, static_folder='static')

# Configuration
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_UPLOAD_SIZE', 10 * 1024 * 1024))
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['OUTPUT_FOLDER'] = os.getenv('OUTPUT_FOLDER', 'converted')

# Ensure directories exist
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
Path(app.config['OUTPUT_FOLDER']).mkdir(exist_ok=True)

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve static files
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# API routes
@app.route('/api/health')
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({
        'status': 'healthy',
        'service': 'md-converter'
    }), 200

# Error handlers
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({
        'error': 'File is too large. Maximum size is 10MB'
    }), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    app.logger.error(f'Internal error: {str(e)}')
    return jsonify({'error': 'Internal server error'}), 500

# Only for local development
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
```

### Gunicorn Configuration

#### Option 1: Command Line (Procfile)

```
web: gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 --access-logfile - --error-logfile - app:app
```

**Parameters Explained**:
- `--bind 0.0.0.0:$PORT`: Listen on all interfaces, use Railway's PORT
- `--workers 2`: Number of worker processes (2-4 for small apps)
- `--threads 2`: Threads per worker for concurrent requests
- `--timeout 120`: Request timeout (2 minutes for file processing)
- `--access-logfile -`: Log to stdout (Railway captures this)
- `--error-logfile -`: Error logs to stdout
- `app:app`: Module name : Flask app variable

#### Option 2: gunicorn.conf.py (Advanced)

```python
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', 2))
worker_class = 'sync'
worker_connections = 1000
timeout = int(os.getenv('GUNICORN_TIMEOUT', 120))
keepalive = 2

# Restart workers after this many requests (prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = 'md-converter'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (Railway handles this, but for reference)
keyfile = None
certfile = None
```

**Usage**: `gunicorn --config gunicorn.conf.py app:app`

---

## Railway Environment Variables

### Required Environment Variables

Railway automatically provides:
- `PORT`: Port number the application should listen on
- `RAILWAY_ENVIRONMENT`: Environment name (production, staging, etc.)
- `RAILWAY_PROJECT_ID`: Unique project identifier
- `RAILWAY_SERVICE_ID`: Unique service identifier

### Custom Environment Variables

Set in Railway dashboard under "Variables":

```
# Application Settings
FLASK_ENV=production
MAX_UPLOAD_SIZE=10485760
UPLOAD_FOLDER=uploads
OUTPUT_FOLDER=converted

# Security (if needed)
SECRET_KEY=your-secret-key-here

# Feature Flags
ENABLE_PDF_CONVERSION=true
ENABLE_PREVIEW=true

# External Services (if needed)
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
```

### Accessing Environment Variables in Flask

```python
import os

# With default fallback
port = int(os.getenv('PORT', 5000))
max_size = int(os.getenv('MAX_UPLOAD_SIZE', 10485760))

# Required variable (fails if not set)
secret_key = os.environ['SECRET_KEY']

# Boolean environment variables
enable_pdf = os.getenv('ENABLE_PDF_CONVERSION', 'false').lower() == 'true'
```

### Railway's Automatic Variables

```python
# Check if running on Railway
is_production = os.getenv('RAILWAY_ENVIRONMENT') == 'production'

# Get Railway metadata
railway_project = os.getenv('RAILWAY_PROJECT_ID')
railway_service = os.getenv('RAILWAY_SERVICE_ID')
```

---

## Deployment Process

### Method 1: GitHub Integration (Recommended)

**Setup Steps**:

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/md-converter.git
   git push -u origin main
   ```

2. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize GitHub access
   - Select your repository
   - Railway auto-detects Python and deploys

3. **Configure Domain (Optional)**
   - Railway provides: `md-converter.up.railway.app`
   - Add custom domain in settings
   - Railway automatically provisions SSL

**Benefits**:
- Automatic deployments on git push
- Preview deployments for pull requests
- Rollback to previous deployments
- Built-in CI/CD pipeline

### Method 2: Railway CLI

**Installation**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# or with Homebrew
brew install railway
```

**Deployment**:
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project (optional)
railway link [project-id]

# Deploy
railway up

# Or deploy with logs
railway up --detach
```

**Useful CLI Commands**:
```bash
# View logs
railway logs

# Open dashboard
railway open

# Run command in Railway environment
railway run python app.py

# Set environment variable
railway variables set MAX_UPLOAD_SIZE=10485760

# List environment variables
railway variables list
```

### Method 3: Deploy Button (Quick Start)

Create a `railway.json` with a deploy button:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT app:app"
  }
}
```

Add to README.md:
```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/md-converter)
```

---

## Static File Serving Strategy

### Flask Built-in Static Serving (Recommended)

**Configuration in app.py**:
```python
app = Flask(__name__, static_folder='static', static_url_path='')

# Serve index.html at root
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# All other static files
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    return send_from_directory('static', 'index.html')  # SPA fallback
```

**Pros**:
- Simple configuration
- Works out of the box
- Good for low-traffic applications
- No additional services needed

**Cons**:
- Flask/Gunicorn not optimized for static files
- No caching headers by default
- Slower than dedicated web servers

### Enhanced Static Serving with Caching

```python
from flask import send_from_directory, make_response
from datetime import datetime, timedelta

@app.route('/static/<path:path>')
def serve_static_cached(path):
    response = make_response(send_from_directory('static', path))

    # Set cache headers for static assets
    if path.endswith(('.css', '.js', '.jpg', '.png', '.svg', '.ico')):
        # Cache for 1 year
        response.cache_control.max_age = 31536000
        response.cache_control.public = True

        # Add ETag
        response.set_etag(f"{path}-{os.path.getmtime(f'static/{path}')}")

    return response
```

### Alternative: CDN + Object Storage (Advanced)

For high-traffic applications:

1. **Upload static files to Railway's volume or S3**
2. **Serve through CDN (Cloudflare, CloudFront)**
3. **Flask only serves API endpoints**

**Not recommended for this project** due to added complexity.

---

## File Storage Considerations

### Temporary File Storage (Default)

Railway provides ephemeral storage:
- Files persist during deployment
- **Files are deleted on new deployment**
- Suitable for temporary uploads/conversions

**Best For**: Short-lived files (upload → convert → download → delete)

### Persistent Storage Options

#### Option 1: Railway Volumes (Recommended for Persistence)

```bash
# Create volume via CLI
railway volume create

# Mount volume to /app/uploads
railway volume attach <volume-id> /app/uploads
```

**Configuration**:
```python
# app.py
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/app/uploads')
```

**Pros**:
- Data persists across deployments
- Attached to Railway service
- Fast access (same container)

**Cons**:
- Single-region storage
- Limited scalability
- Additional cost

#### Option 2: Object Storage (S3, Railway's Blob Storage)

For production applications with high storage needs:

```python
import boto3

s3_client = boto3.client('s3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

def upload_to_s3(file_path, bucket, key):
    s3_client.upload_file(file_path, bucket, key)

def download_from_s3(bucket, key, local_path):
    s3_client.download_file(bucket, key, local_path)
```

**Best For**: High-volume applications, long-term storage

#### Option 3: Cleanup Strategy (Recommended for This Project)

Automatically delete old files:

```python
from datetime import datetime, timedelta
import os

def cleanup_old_files(directory, max_age_hours=24):
    """Delete files older than max_age_hours"""
    now = datetime.now()
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            file_age = now - datetime.fromtimestamp(os.path.getmtime(filepath))
            if file_age > timedelta(hours=max_age_hours):
                os.remove(filepath)
                print(f"Deleted old file: {filename}")

# Run cleanup on application startup
cleanup_old_files('uploads')
cleanup_old_files('converted')

# Or schedule with APScheduler
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(lambda: cleanup_old_files('uploads'), 'interval', hours=1)
scheduler.start()
```

---

## Monitoring and Logging

### Railway's Built-in Monitoring

Railway dashboard provides:
- **Metrics**: CPU usage, memory, network I/O
- **Logs**: Real-time application logs
- **Deployments**: History and rollback capability
- **Health Checks**: Automatic service health monitoring

### Application Logging

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Log important events
@app.route('/api/convert', methods=['POST'])
def convert_file():
    logger.info(f"Conversion request received: {request.files.get('file').filename}")
    try:
        # Process file
        logger.info(f"Conversion successful: {job_id}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Conversion failed: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
```

### Health Check Endpoint

```python
@app.route('/api/health')
def health_check():
    """Railway health check endpoint"""
    try:
        # Check critical dependencies
        uploads_writable = os.access(app.config['UPLOAD_FOLDER'], os.W_OK)
        converted_writable = os.access(app.config['OUTPUT_FOLDER'], os.W_OK)

        if not (uploads_writable and converted_writable):
            raise Exception("Storage not writable")

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'md-converter',
            'version': '1.0.0'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503
```

Configure in `railway.json`:
```json
{
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

### Error Tracking (Optional)

For production applications, consider Sentry:

```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[FlaskIntegration()],
    traces_sample_rate=1.0,
    environment=os.getenv('RAILWAY_ENVIRONMENT', 'development')
)
```

---

## Performance Optimization

### 1. Gunicorn Worker Configuration

**Worker Formula**: `workers = (2 × CPU cores) + 1`

For Railway's default resources:
```
web: gunicorn --workers 2 --threads 2 app:app
```

**Worker Types**:
- `sync`: Default, blocking workers (recommended for CPU-bound tasks)
- `gevent`: Asynchronous workers (better for I/O-bound tasks)
- `eventlet`: Alternative async worker

```
# For async I/O (many concurrent uploads)
web: gunicorn --worker-class gevent --workers 2 app:app
```

### 2. Request Timeout Configuration

```
# Longer timeout for file conversions
web: gunicorn --timeout 180 app:app
```

### 3. Enable Gzip Compression

```python
from flask_compress import Compress

app = Flask(__name__)
Compress(app)

app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
]
```

### 4. Static File Optimization

**Minify JavaScript/CSS** (build step):
```bash
# Install terser and csso-cli
npm install -g terser csso-cli

# Minify
terser static/js/app.js -o static/js/app.min.js
csso static/css/styles.css -o static/css/styles.min.css
```

**Serve minified in production**:
```html
<link rel="stylesheet" href="/css/styles.min.css">
<script src="/js/app.min.js"></script>
```

### 5. Database Connection Pooling (If Using Database)

```python
from flask_sqlalchemy import SQLAlchemy

app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_POOL_TIMEOUT'] = 30
app.config['SQLALCHEMY_POOL_RECYCLE'] = 3600
```

---

## Security Best Practices

### 1. HTTPS (Automatic)

Railway automatically provisions SSL certificates for all deployments.

**Enforce HTTPS**:
```python
from flask_talisman import Talisman

if os.getenv('RAILWAY_ENVIRONMENT') == 'production':
    Talisman(app, force_https=True)
```

### 2. Security Headers

```python
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

### 3. Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

@app.route('/api/convert', methods=['POST'])
@limiter.limit("10 per minute")
def convert_file():
    # Handle conversion
    pass
```

### 4. Environment Variable Security

**Never commit secrets to git**:
```bash
# .gitignore
.env
secrets.txt
*.pem
*.key
```

**Use Railway's secure variable storage**:
- Store secrets in Railway dashboard
- Access via `os.getenv()`
- Railway encrypts environment variables

### 5. Input Validation

```python
from werkzeug.utils import secure_filename

@app.route('/api/upload', methods=['POST'])
def upload():
    file = request.files['file']

    # Validate filename
    filename = secure_filename(file.filename)

    # Validate extension
    if not allowed_file(filename):
        return jsonify({'error': 'Invalid file type'}), 400

    # Validate size (Flask handles via MAX_CONTENT_LENGTH)
    # Additional checks can be added here

    # Save file
    file.save(os.path.join(UPLOAD_FOLDER, filename))
```

---

## Scaling Considerations

### Vertical Scaling (Railway Plans)

Railway offers different resource tiers:

| Plan | vCPU | Memory | Price |
|------|------|--------|-------|
| Hobby | 0.5 | 512 MB | $5/month |
| Pro | 8 | 8 GB | $20/month |
| Team | 32 | 32 GB | Custom |

**When to Scale Up**:
- High CPU usage during conversions
- Out of memory errors
- Slow response times
- Multiple concurrent users

### Horizontal Scaling (Multiple Services)

For high traffic, deploy multiple instances:

```
Load Balancer (Railway)
├── md-converter-1
├── md-converter-2
└── md-converter-3
```

**Requirements**:
- Stateless application (no local file storage)
- Shared storage (S3, Railway volumes)
- Session management (Redis, database)

**Note**: Not needed for utility applications with low traffic.

### Optimization Before Scaling

Before scaling up, optimize:
1. Add caching (Redis for session/results)
2. Optimize conversion algorithms
3. Use async workers (gevent/eventlet)
4. Implement queue system for background processing
5. Profile application to find bottlenecks

---

## Cost Optimization

### Railway Pricing Structure

- **Starter Plan**: $5/month
  - $5 credit per month
  - Additional usage: $0.000231 per GB-hour

- **Pro Plan**: $20/month
  - $20 credit per month
  - Better support and features

### Cost-Saving Strategies

#### 1. Efficient Resource Usage

```python
# Cleanup files immediately after conversion
def cleanup_after_conversion(job_id):
    os.remove(f"uploads/{job_id}.md")
    # Keep converted files for 1 hour
```

#### 2. Optimize Worker Count

```
# Start with minimal workers
web: gunicorn --workers 1 --threads 4 app:app

# Scale up only if needed
```

#### 3. Single Service Deployment

- Use monolithic architecture (frontend + backend in one service)
- Saves $5-20/month compared to separate services

#### 4. Implement Caching

```python
from flask_caching import Cache

cache = Cache(app, config={
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
})

@app.route('/api/status/<job_id>')
@cache.cached(timeout=60)
def get_status(job_id):
    # Cached for 1 minute
    return jsonify(status)
```

#### 5. Scheduled Cleanup

Remove old files to reduce storage usage:

```python
from apscheduler.schedulers.background import BackgroundScheduler

def cleanup_old_files():
    # Delete files older than 24 hours
    cutoff = datetime.now() - timedelta(hours=24)
    for folder in ['uploads', 'converted']:
        for file in os.listdir(folder):
            filepath = os.path.join(folder, file)
            if os.path.getmtime(filepath) < cutoff.timestamp():
                os.remove(filepath)

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_files, 'interval', hours=6)
scheduler.start()
```

---

## Troubleshooting Common Issues

### Issue 1: Application Not Starting

**Symptoms**: Deployment fails, health check fails

**Solutions**:
1. Check logs: `railway logs`
2. Verify `requirements.txt` has all dependencies
3. Ensure `PORT` environment variable is used
4. Check Gunicorn command syntax

```python
# Correct: Use Railway's PORT
port = int(os.getenv('PORT', 8000))

# In Procfile
web: gunicorn --bind 0.0.0.0:$PORT app:app
```

### Issue 2: Static Files Not Serving

**Symptoms**: 404 errors for CSS/JS files

**Solutions**:
1. Verify `static_folder` in Flask initialization
2. Check file paths are correct
3. Ensure files are committed to git

```python
# Correct static configuration
app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')
```

### Issue 3: File Upload Fails

**Symptoms**: 413 error, timeout error

**Solutions**:
1. Increase `MAX_CONTENT_LENGTH`
2. Increase Gunicorn timeout
3. Check Railway service limits

```python
# Increase limits
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# In Procfile
web: gunicorn --timeout 180 app:app
```

### Issue 4: Files Disappear After Deployment

**Symptoms**: Uploaded files lost after redeploy

**Explanation**: Railway uses ephemeral storage

**Solutions**:
1. Use Railway volumes for persistence
2. Use S3 or object storage
3. Implement cleanup strategy (files are temporary)

### Issue 5: Slow Performance

**Symptoms**: High response times, timeouts

**Solutions**:
1. Increase worker count
2. Use async workers
3. Optimize conversion code
4. Add caching layer
5. Scale up Railway plan

```
# More workers and async
web: gunicorn --workers 4 --worker-class gevent app:app
```

### Issue 6: Memory Issues

**Symptoms**: Out of memory errors, crashes

**Solutions**:
1. Process files in chunks
2. Delete temporary files immediately
3. Upgrade Railway plan
4. Optimize memory usage

```python
# Process large files in chunks
def process_large_file(filepath):
    with open(filepath, 'r') as f:
        while True:
            chunk = f.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            # Process chunk
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All dependencies in `requirements.txt`
- [ ] Environment variables configured in Railway
- [ ] Sensitive data removed from code (use env vars)
- [ ] `.gitignore` properly configured
- [ ] Health check endpoint implemented
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Static files organized in `static/` folder
- [ ] Gunicorn configured correctly
- [ ] Tested locally with `gunicorn app:app`

### Deployment

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Repository connected to Railway
- [ ] Environment variables set in Railway dashboard
- [ ] Deployment successful (check Railway dashboard)
- [ ] Application accessible via Railway URL
- [ ] Health check passing
- [ ] Static files loading correctly
- [ ] API endpoints working
- [ ] File upload/download working
- [ ] Logs showing no errors

### Post-Deployment

- [ ] Test all features in production
- [ ] Monitor application performance
- [ ] Set up custom domain (optional)
- [ ] Configure automated backups (if using volumes)
- [ ] Document any issues encountered
- [ ] Share Railway URL with team
- [ ] Monitor costs and resource usage

---

## Alternative Deployment Options

### If Not Using Railway

#### Option 1: Heroku

Similar to Railway, PaaS with automatic deployments.

**Procfile**: Same as Railway
**Deployment**: `git push heroku main`
**Cost**: Free tier available, paid plans similar to Railway

#### Option 2: DigitalOcean App Platform

**Configuration**: Similar to Railway
**Cost**: Starting at $5/month
**Pros**: More control, global CDN
**Cons**: More complex setup

#### Option 3: Docker + VPS (Manual)

Deploy to DigitalOcean, Linode, AWS EC2:

```bash
# Build image
docker build -t md-converter .

# Run container
docker run -p 80:8000 -e PORT=8000 md-converter
```

**Pros**: Full control, potentially cheaper at scale
**Cons**: Manual setup, no automatic deployments, requires DevOps knowledge

#### Option 4: Serverless (AWS Lambda, Vercel)

**Pros**: Pay per request, automatic scaling
**Cons**: Cold starts, complexity, function size limits, not ideal for file processing

---

## Resource Links

### Railway Documentation
- [Railway Official Docs](https://docs.railway.com/)
- [Flask Deployment Guide](https://docs.railway.com/guides/flask)
- [Environment Variables](https://docs.railway.com/develop/variables)
- [Railway CLI](https://docs.railway.com/develop/cli)

### Flask Production
- [Flask Production Deployment](https://flask.palletsprojects.com/en/stable/deploying/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Flask Configuration Best Practices](https://flask.palletsprojects.com/en/stable/config/)

### Community Resources
- [Railway Community Forum](https://help.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Stack Overflow - Railway](https://stackoverflow.com/questions/tagged/railway)

---

## Summary Recommendations

### For This Project (Markdown Converter)

1. **Use Railway with automatic Nixpacks detection**
2. **Deploy as single service (monolithic)**
3. **Use Procfile for Gunicorn configuration**
4. **Implement file cleanup strategy (no persistent storage needed)**
5. **Set environment variables in Railway dashboard**
6. **Enable GitHub integration for automatic deployments**
7. **Monitor via Railway's built-in dashboard**

### Estimated Costs

- **Low Traffic** (< 100 conversions/day): $5-10/month
- **Medium Traffic** (100-1000 conversions/day): $10-20/month
- **High Traffic** (> 1000 conversions/day): $20-50/month (consider scaling)

### Next Steps

1. Review Flask application code
2. Test locally with Gunicorn
3. Push to GitHub
4. Connect Railway to repository
5. Configure environment variables
6. Deploy and test
7. Monitor and optimize

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Author**: PACT Preparer - Documentation Specialist
