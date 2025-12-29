# PostgreSQL Quick Start Guide

**Project**: MD Converter Flask Backend
**Date**: 2025-12-29

## Quick Setup Instructions

### 1. Install New Dependencies

```bash
cd /Users/jrosenbaum/Documents/Code/md-converter
source venv/bin/activate
pip install -r requirements.txt
```

This installs:
- Flask-SQLAlchemy 3.1.1
- Flask-Migrate 4.0.7
- psycopg2-binary 2.9.10

### 2. Initialize Database Migrations

```bash
# Initialize Flask-Migrate (creates migrations/ directory)
flask db init

# Generate initial migration from models
flask db migrate -m "Initial database schema with metrics tracking"

# Apply migration to create tables
flask db upgrade
```

### 3. Test the Application

```bash
# Start development server
python wsgi.py
```

The app should start successfully. Check the logs for:
```
Database models imported: AdminUser, Conversion, PageView, AdminSession
```

### 4. Verify Database Tables (Optional)

If using SQLite (default for local dev):
```bash
sqlite3 app.db
.tables
.schema conversions
.quit
```

If using PostgreSQL:
```bash
export DATABASE_URL=postgresql://localhost:5432/md_converter_dev
psql $DATABASE_URL
\dt
\d conversions
\q
```

## What Was Added

### Database Models

1. **AdminUser** - Admin authentication
   - username, password_hash, login tracking
   - Methods: `set_password()`, `check_password()`

2. **Conversion** - Track conversion jobs
   - job_id, filename, formats, success, processing time
   - Visitor tracking for analytics

3. **PageView** - Page view analytics
   - path, referrer, visitor info, browser/OS/device

4. **AdminSession** - Session management
   - token_hash, expiration, revocation
   - Method: `is_valid()`

### Configuration

- Database URL via `DATABASE_URL` environment variable
- Defaults to SQLite (`sqlite:///app.db`) for local development
- Connection pooling with health checks configured

## Testing Recommendations

### 1. Model Tests
```python
# Test in Flask shell
flask shell

from app.extensions import db
from app.models import AdminUser, Conversion

# Create admin user
admin = AdminUser(username='testadmin')
admin.set_password('password123')
db.session.add(admin)
db.session.commit()

# Verify password
admin.check_password('password123')  # Should return True

# Create conversion record
conversion = Conversion(
    job_id='test-uuid-123',
    original_filename='test.md',
    file_size_bytes=1024,
    formats='docx,pdf',
    success=True,
    processing_time_ms=500
)
db.session.add(conversion)
db.session.commit()

# Query conversions
Conversion.query.all()
```

### 2. Integration Tests

Test that the app starts without errors:
```bash
python wsgi.py
# Check logs for successful model import
# Access http://localhost:8080/health
```

### 3. Migration Tests

Test forward and backward migrations:
```bash
# Apply all migrations
flask db upgrade

# Rollback one migration
flask db downgrade

# Re-apply
flask db upgrade
```

## Railway Deployment

### 1. Add PostgreSQL Database

In Railway dashboard:
- Click "New" → "Database" → "Add PostgreSQL"
- Railway auto-sets `DATABASE_URL` environment variable

### 2. Run Migrations

Option A: In Railway dashboard, add to startup command:
```
flask db upgrade && gunicorn --config gunicorn_config.py wsgi:app
```

Option B: Use Railway CLI:
```bash
railway run flask db upgrade
```

## Common Issues

### Import Errors
If you see `ModuleNotFoundError: No module named 'flask_sqlalchemy'`:
```bash
pip install -r requirements.txt
```

### Migration Errors
If migrations fail:
```bash
# Delete migrations/ directory and start fresh
rm -rf migrations/
flask db init
flask db migrate -m "Initial schema"
flask db upgrade
```

### Database Connection Errors
If PostgreSQL connection fails:
```bash
# Check DATABASE_URL is set correctly
echo $DATABASE_URL

# Verify PostgreSQL is running (if local)
pg_isready
```

## Next Steps

After successful setup, consider:

1. **Implement Conversion Tracking** in `/app/api/routes.py`
2. **Add Page View Tracking** middleware
3. **Create Admin Dashboard** blueprint
4. **Build Analytics Queries** service layer

See `/Users/jrosenbaum/Documents/Code/md-converter/docs/POSTGRESQL_IMPLEMENTATION_SUMMARY.md` for detailed implementation guide.

---

**For questions or issues, refer to the full implementation summary.**
