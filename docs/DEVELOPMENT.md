# Development Guide

This document contains detailed technical information for developers working on the Document Converter project.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY PROJECT                          │
│                                                             │
│  ┌──────────────────────┐      ┌────────────────────────┐  │
│  │   NEXT.JS SERVICE    │      │    FLASK API SERVICE   │  │
│  │   (frontend/)        │─────▶│    (backend/)          │  │
│  │                      │      │                        │  │
│  │ Pages:               │      │ Endpoints:             │  │
│  │ - / (converter)      │      │ - /api/convert         │  │
│  │ - /admin/login       │      │ - /api/download        │  │
│  │ - /admin/dashboard   │      │ - /auth/* (OAuth)      │  │
│  │ - /privacy           │      │ - /api/admin/*         │  │
│  └──────────────────────┘      └────────────────────────┘  │
│              │                           │                  │
│              └───────────┬───────────────┘                  │
│                          ▼                                  │
│               ┌─────────────────┐                           │
│               │   PostgreSQL    │                           │
│               │   (Railway DB)  │                           │
│               └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
doc-converter/
├── backend/                    # Flask API
│   ├── app/
│   │   ├── __init__.py        # App factory
│   │   ├── config.py          # Configuration
│   │   ├── extensions.py      # Flask extensions (db, migrate)
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── api/               # API routes
│   │   ├── admin/             # Admin endpoints
│   │   ├── auth/              # OAuth routes
│   │   ├── converters/        # Conversion logic
│   │   └── utils/             # Helpers
│   ├── migrations/            # Alembic migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── wsgi.py
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities
│   ├── package.json
│   └── Dockerfile
└── docs/                       # Documentation
```

## Database Schema

```sql
-- Admin users
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Conversion tracking (filenames NOT stored for privacy)
CREATE TABLE conversions (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL UNIQUE,
    original_filename VARCHAR(255),  -- Always '[redacted]'
    file_size_bytes INTEGER,
    formats VARCHAR(100) NOT NULL,
    success BOOLEAN DEFAULT false,
    error_code VARCHAR(50),
    processing_time_ms INTEGER,
    visitor_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page view tracking
CREATE TABLE page_views (
    id SERIAL PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    referrer VARCHAR(512),
    visitor_id VARCHAR(64),
    browser VARCHAR(50),
    os VARCHAR(50),
    device_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL (or Docker)
- Pandoc

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Start PostgreSQL
docker run -d --name mdconverter-db \
  -e POSTGRES_USER=mdconverter \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=mdconverter \
  -p 5432:5432 postgres:15

# Set environment
export DATABASE_URL=postgresql://mdconverter:localdev@localhost:5432/mdconverter
export SECRET_KEY=$(openssl rand -hex 32)

# Run migrations
flask db upgrade

# Start server
python wsgi.py  # Port 8080
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment
echo "FLASK_API_URL=http://localhost:8080" > .env.local

# Start dev server
npm run dev  # Port 3000
```

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | Flask session encryption key |
| `FLASK_ENV` | No | `development` or `production` |
| `LOG_LEVEL` | No | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `MAX_FILE_SIZE` | No | Max upload size (default: 10MB) |
| `GOOGLE_OAUTH_CLIENT_ID` | For GDocs | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | For GDocs | OAuth client secret |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `FLASK_API_URL` | Yes | Backend API URL |
| `JWT_SECRET` | Yes | Admin session signing key |

## API Endpoints

### Conversion

```bash
# Convert to multiple formats
curl -X POST http://localhost:8080/api/convert \
  -F "file=@document.md" \
  -F "formats=docx" \
  -F "formats=pdf"

# Download converted file
curl http://localhost:8080/api/download/{job_id}/docx \
  --output document.docx
```

### Admin Metrics

```bash
# Get stats (requires admin auth via Next.js)
GET /api/admin/metrics/stats?period=7d

# Get recent conversions
GET /api/admin/metrics/conversions?period=7d&limit=20

# Get page views
GET /api/admin/metrics/page-views?period=7d&limit=20
```

### Authentication

```bash
# Check auth status
GET /auth/status

# Initiate Google OAuth
GET /login/google

# Logout
GET /auth/logout
```

## Creating Admin Users

### Via Python

```python
from app import create_app
from app.extensions import db
from app.models import AdminUser

app = create_app('production')
with app.app_context():
    admin = AdminUser(username='admin')
    admin.set_password('secure_password')
    db.session.add(admin)
    db.session.commit()
```

### Via SQL

```bash
# Generate bcrypt hash
python -c "import bcrypt; print(bcrypt.hashpw(b'password', bcrypt.gensalt()).decode())"

# Insert user
psql $DATABASE_URL -c "INSERT INTO admin_users (username, password_hash) VALUES ('admin', '\$2b\$12\$...');"
```

## Railway Deployment

### Initial Setup

1. Create Railway project
2. Add PostgreSQL database
3. Connect GitHub repo
4. Railway detects monorepo and creates both services

### Environment Variables (Railway)

**Backend Service:**
- `DATABASE_URL` - Auto-provided by Railway PostgreSQL
- `SECRET_KEY` - Generate with `openssl rand -hex 32` (seal this)
- `GOOGLE_OAUTH_CLIENT_ID` - For Google Docs
- `GOOGLE_OAUTH_CLIENT_SECRET` - Seal this

**Frontend Service:**
- `FLASK_API_URL` - Internal Railway URL: `http://backend.railway.internal:8080`
- `JWT_SECRET` - Generate with `openssl rand -hex 32` (seal this)

### Monorepo Configuration

Railway uses `nixpacks.toml` in each folder to configure builds:

**backend/nixpacks.toml:**
```toml
[phases.setup]
nixPkgs = ["...", "pandoc", "chromium"]
```

**frontend/nixpacks.toml:**
```toml
[phases.build]
cmds = ["npm run build"]
```

## Google OAuth Setup

1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Docs API and Google Drive API
3. Create OAuth 2.0 credentials (Web application)
4. Add redirect URIs:
   - Local: `http://localhost:8080/login/google/authorized`
   - Production: `https://your-backend.railway.app/login/google/authorized`
5. Set environment variables in Railway

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Pandoc not found

```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc
```

### WeasyPrint issues

```bash
# Install system dependencies
sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### OAuth redirect errors

- Ensure redirect URIs match exactly (including trailing slashes)
- Check `OAUTHLIB_INSECURE_TRANSPORT=true` for local HTTP development
