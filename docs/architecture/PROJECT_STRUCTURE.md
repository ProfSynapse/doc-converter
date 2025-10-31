# Project Structure

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document defines the complete project structure for the Markdown Converter application. The structure follows Python best practices, Flask conventions, and modular design principles to ensure maintainability, testability, and scalability.

---

## Complete Project Structure

```
md-converter/
├── .dockerignore                 # Docker build exclusions
├── .gitignore                    # Git exclusions
├── Dockerfile                    # Container configuration
├── Procfile                      # Railway process definition (optional)
├── railway.toml                  # Railway configuration
├── requirements.txt              # Python dependencies
├── README.md                     # Project documentation
├── LICENSE                       # License file
│
├── app/                          # Main application package
│   ├── __init__.py              # Flask app factory
│   ├── app.py                   # Application entry point
│   ├── config.py                # Configuration management
│   │
│   ├── api/                     # API endpoints
│   │   ├── __init__.py
│   │   ├── routes.py            # API route definitions
│   │   └── validators.py       # Request validation
│   │
│   ├── converter/               # Conversion engine
│   │   ├── __init__.py
│   │   ├── converter.py         # Core conversion logic
│   │   ├── frontmatter.py       # YAML parsing utilities
│   │   └── styles.py            # PDF styling configuration
│   │
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── file_handler.py      # File operations
│   │   ├── security.py          # Security utilities
│   │   └── helpers.py           # General helpers
│   │
│   └── templates/               # Document templates
│       └── template.docx        # Word template with page numbers
│
├── static/                      # Frontend static files
│   ├── index.html               # Main UI page
│   ├── js/
│   │   ├── app.js              # Main application logic
│   │   ├── api.js              # API client wrapper
│   │   └── utils.js            # Frontend utilities
│   └── css/
│       └── styles.css          # Custom styles (optional)
│
├── tests/                       # Test suite
│   ├── __init__.py
│   ├── conftest.py             # Pytest configuration
│   ├── test_api.py             # API endpoint tests
│   ├── test_converter.py       # Conversion logic tests
│   ├── test_validation.py      # Validation tests
│   └── fixtures/               # Test data
│       ├── sample.md           # Sample markdown files
│       └── invalid.md          # Invalid test files
│
├── docs/                        # Documentation
│   ├── architecture/            # Architecture docs (this directory)
│   │   ├── ARCHITECTURE_OVERVIEW.md
│   │   ├── API_SPECIFICATION.md
│   │   ├── PROJECT_STRUCTURE.md
│   │   ├── DATA_FLOW.md
│   │   ├── COMPONENT_DESIGN.md
│   │   ├── DEPLOYMENT_ARCHITECTURE.md
│   │   ├── SECURITY_DESIGN.md
│   │   └── IMPLEMENTATION_GUIDE.md
│   ├── preparation/             # Preparation phase docs
│   └── user_guide/              # User documentation
│
├── tmp/                         # Temporary files (gitignored)
│   └── converted/               # Converted documents (ephemeral)
│
└── scripts/                     # Utility scripts
    ├── cleanup.py              # File cleanup script
    └── test_conversion.py      # Manual conversion testing
```

---

## Directory Details

### Root Directory Files

#### `.dockerignore`

**Purpose:** Exclude files from Docker build context
**Size:** ~200 bytes
**Content:**

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

# Node
node_modules/

# Development
.git/
.gitignore
.env
.env.*
*.md
docs/
tests/
.pytest_cache/
.coverage
htmlcov/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
*.egg-info/

# Temporary
tmp/
*.log
```

#### `.gitignore`

**Purpose:** Exclude files from Git repository
**Size:** ~300 bytes
**Content:**

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
ENV/
pip-log.txt
pip-delete-this-directory.txt
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/

# Environment
.env
.env.*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Application
tmp/
*.log

# Docker
.docker/
```

#### `Dockerfile`

**Purpose:** Container build configuration
**Size:** ~50 lines
**See:** [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)

#### `railway.toml`

**Purpose:** Railway platform configuration
**Size:** ~30 lines
**Content:**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 30 app.app:app"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
healthcheckPath = "/health"
healthcheckTimeout = 10

[env]
PORT = { default = "8080" }
PYTHON_VERSION = { default = "3.12" }
LOG_LEVEL = { default = "INFO" }
MAX_FILE_SIZE = { default = "10485760" }
```

#### `Procfile` (Optional)

**Purpose:** Alternative process definition
**Size:** 1 line
**Content:**

```
web: gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 30 app.app:app
```

#### `requirements.txt`

**Purpose:** Python dependency specification
**Size:** ~15 lines
**Content:**

```txt
# Core dependencies
python-frontmatter==1.0.1
pypandoc-binary==1.13
markdown==3.6
weasyprint==62.3
mistune==3.0.2

# Syntax highlighting
pygments==2.18.0

# Web framework
flask==3.0.3
gunicorn==22.0.0
werkzeug==3.0.3

# Utilities
python-dotenv==1.0.0
```

#### `README.md`

**Purpose:** Project overview and setup instructions
**Size:** ~500 lines
**Sections:**
- Project description
- Features
- Installation
- Usage
- API documentation
- Development setup
- Deployment instructions
- Contributing guidelines

---

## Application Package (`app/`)

### `app/__init__.py`

**Purpose:** Flask application factory
**Size:** ~100 lines

**Responsibilities:**
- Create Flask application instance
- Load configuration
- Register blueprints
- Configure logging
- Set up error handlers
- Apply middleware

**Code Structure:**

```python
"""Flask application factory"""
from flask import Flask
from app.config import config
from app.api import api_blueprint
import logging

def create_app(config_name='default'):
    """Create and configure Flask application"""
    app = Flask(__name__, static_folder='../static')
    app.config.from_object(config[config_name])

    # Configure logging
    logging.basicConfig(
        level=app.config['LOG_LEVEL'],
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')

    # Register error handlers
    register_error_handlers(app)

    # Health check endpoint
    @app.route('/health')
    def health():
        return health_check()

    # Serve static files
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    return app

def register_error_handlers(app):
    """Register custom error handlers"""
    # Implementation...
```

### `app/app.py`

**Purpose:** Application entry point
**Size:** ~30 lines

**Responsibilities:**
- Create Flask app instance
- Run development server
- Configure production server

**Code Structure:**

```python
"""Application entry point"""
import os
from app import create_app

# Create app instance
app = create_app(os.environ.get('FLASK_ENV', 'production'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'

    app.run(host='0.0.0.0', port=port, debug=debug)
```

### `app/config.py`

**Purpose:** Configuration management
**Size:** ~100 lines

**Responsibilities:**
- Define configuration classes
- Load environment variables
- Set default values
- Validate configuration

**Code Structure:**

```python
"""Configuration settings"""
import os

class Config:
    """Base configuration"""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')

    # Application
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {'md', 'markdown', 'txt'}

    # Paths
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'uploads')
    CONVERTED_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'converted')
    TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), 'templates', 'template.docx')

    # Conversion
    INCLUDE_FRONT_MATTER = True
    CLEANUP_INTERVAL = 24 * 3600  # 24 hours in seconds

    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'INFO'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': Config
}
```

---

## API Package (`app/api/`)

### `app/api/__init__.py`

**Purpose:** API blueprint initialization
**Size:** ~10 lines

```python
"""API blueprint"""
from flask import Blueprint

api_blueprint = Blueprint('api', __name__)

from app.api import routes
```

### `app/api/routes.py`

**Purpose:** API endpoint definitions
**Size:** ~300 lines

**Responsibilities:**
- Define API routes
- Handle requests/responses
- Call conversion engine
- Return formatted responses

**Endpoints:**
- `POST /api/convert` - Convert markdown to documents
- `GET /api/download/<job_id>/<format>` - Download converted file

**Code Structure:**

```python
"""API routes"""
from flask import request, jsonify, send_file
from werkzeug.utils import secure_filename
from app.api import api_blueprint
from app.api.validators import validate_upload
from app.converter import MarkdownConverter
import uuid
import tempfile
import logging

logger = logging.getLogger(__name__)

@api_blueprint.route('/convert', methods=['POST'])
def convert():
    """Convert markdown file"""
    # Validation
    validation_error = validate_upload(request)
    if validation_error:
        return jsonify(validation_error), validation_error['status']

    # Get file
    file = request.files['file']
    format_type = request.form.get('format', 'both')

    # Process conversion
    # ... (implementation details)

    return jsonify(response_data)

@api_blueprint.route('/download/<job_id>/<format>', methods=['GET'])
def download(job_id, format):
    """Download converted file"""
    # Implementation...
    return send_file(file_path, as_attachment=True, download_name=filename)
```

### `app/api/validators.py`

**Purpose:** Request validation logic
**Size:** ~150 lines

**Responsibilities:**
- Validate file uploads
- Check file types and sizes
- Validate request parameters
- Return validation errors

**Code Structure:**

```python
"""Request validators"""
from flask import current_app
import os

def validate_upload(request):
    """Validate file upload request"""
    # Check file presence
    if 'file' not in request.files:
        return {
            'error': 'No file provided in request',
            'code': 'MISSING_FILE',
            'status': 400
        }

    file = request.files['file']

    # Check filename
    if file.filename == '':
        return {
            'error': 'No file selected',
            'code': 'EMPTY_FILENAME',
            'status': 400
        }

    # Validate file type
    if not allowed_file(file.filename):
        return {
            'error': 'Invalid file type. Allowed: .md, .markdown, .txt',
            'code': 'INVALID_FILE_TYPE',
            'status': 415,
            'allowed_types': ['.md', '.markdown', '.txt']
        }

    # Validate file size (already handled by Flask MAX_CONTENT_LENGTH)

    return None  # No errors

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def validate_format(format_str):
    """Validate output format parameter"""
    if format_str not in ['docx', 'pdf', 'both']:
        return {
            'error': 'Invalid format. Allowed: docx, pdf, both',
            'code': 'INVALID_FORMAT',
            'status': 400
        }
    return None
```

---

## Converter Package (`app/converter/`)

### `app/converter/__init__.py`

**Purpose:** Converter package initialization
**Size:** ~5 lines

```python
"""Converter package"""
from app.converter.converter import MarkdownConverter

__all__ = ['MarkdownConverter']
```

### `app/converter/converter.py`

**Purpose:** Core conversion logic
**Size:** ~500 lines
**See:** Preparation docs for complete implementation

**Responsibilities:**
- Parse YAML front matter
- Format metadata for display
- Convert markdown to DOCX (pypandoc)
- Convert markdown to PDF (weasyprint)
- Apply styling and page numbers

**Key Classes:**

```python
class MarkdownConverter:
    """Main converter class"""

    def __init__(self, template_path=None):
        """Initialize converter"""

    def parse_markdown(self, content):
        """Parse markdown with front matter"""

    def format_front_matter(self, metadata):
        """Format front matter for display"""

    def convert_to_docx(self, content, output_path):
        """Convert to Word document"""

    def convert_to_pdf(self, content, output_path):
        """Convert to PDF"""

    def convert_to_both(self, content, base_name, output_dir):
        """Convert to both formats"""
```

### `app/converter/frontmatter.py`

**Purpose:** YAML front matter utilities
**Size:** ~100 lines

**Responsibilities:**
- Parse YAML front matter
- Extract metadata fields
- Handle malformed YAML
- Provide default values

### `app/converter/styles.py`

**Purpose:** PDF styling configuration
**Size:** ~200 lines

**Responsibilities:**
- Define CSS for PDF generation
- Configure page layout
- Set font styles
- Define page number formatting

---

## Utilities Package (`app/utils/`)

### `app/utils/file_handler.py`

**Purpose:** File operation utilities
**Size:** ~150 lines

**Responsibilities:**
- Save uploaded files
- Clean up temporary files
- Generate unique filenames
- Handle file paths safely

**Key Functions:**

```python
def save_upload(file, upload_folder):
    """Save uploaded file securely"""

def cleanup_old_files(directory, max_age_hours=24):
    """Delete files older than specified age"""

def generate_job_id():
    """Generate unique job identifier"""

def get_file_path(job_id, format_type):
    """Get path to converted file"""
```

### `app/utils/security.py`

**Purpose:** Security utilities
**Size:** ~100 lines

**Responsibilities:**
- Sanitize filenames
- Validate file content
- Check MIME types
- Prevent path traversal

**Key Functions:**

```python
def sanitize_filename(filename):
    """Sanitize filename for safe storage"""

def validate_file_content(file_path):
    """Validate file content is safe"""

def check_mime_type(file):
    """Verify file MIME type"""
```

### `app/utils/helpers.py`

**Purpose:** General helper functions
**Size:** ~100 lines

**Responsibilities:**
- Format error responses
- Generate timestamps
- Calculate file sizes
- Format durations

---

## Static Files (`static/`)

### `static/index.html`

**Purpose:** Main UI page
**Size:** ~400 lines

**Structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Converter</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <!-- Header -->
    <header>...</header>

    <!-- Upload Section -->
    <section id="upload-section">...</section>

    <!-- Progress Section -->
    <section id="progress-section">...</section>

    <!-- Download Section -->
    <section id="download-section">...</section>

    <!-- Error Section -->
    <section id="error-section">...</section>

    <script src="/static/js/api.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>
```

### `static/js/api.js`

**Purpose:** API client wrapper
**Size:** ~200 lines

**Responsibilities:**
- Wrap fetch API calls
- Handle file uploads
- Download files as blobs
- Format API errors

**Key Functions:**

```javascript
class APIClient {
    async convertMarkdown(file, format) { }
    async downloadFile(jobId, format) { }
    handleError(error) { }
}
```

### `static/js/app.js`

**Purpose:** Main application logic
**Size:** ~300 lines

**Responsibilities:**
- Handle UI interactions
- Manage application state
- Update UI based on events
- Coordinate API calls

**Key Functions:**

```javascript
// File upload handling
function handleFileSelect(event) { }
function handleDragDrop(event) { }

// Conversion flow
function validateFile(file) { }
function uploadAndConvert(file, format) { }
function showProgress(percentage) { }

// Download handling
function downloadFile(jobId, format) { }
function createDownloadLink(blob, filename) { }

// UI state management
function showSection(sectionId) { }
function displayError(message) { }
```

### `static/js/utils.js`

**Purpose:** Frontend utility functions
**Size:** ~100 lines

**Responsibilities:**
- Format file sizes
- Format dates
- Validate inputs
- DOM manipulation helpers

### `static/css/styles.css`

**Purpose:** Custom styles (optional)
**Size:** ~100 lines

**Content:**
- Custom animations
- Theme overrides
- Print styles
- Responsive adjustments

---

## Tests (`tests/`)

### `tests/conftest.py`

**Purpose:** Pytest configuration and fixtures
**Size:** ~100 lines

**Content:**

```python
"""Pytest configuration"""
import pytest
from app import create_app
from app.converter import MarkdownConverter

@pytest.fixture
def app():
    """Create test app"""
    app = create_app('testing')
    return app

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def converter():
    """Create converter instance"""
    return MarkdownConverter()

@pytest.fixture
def sample_markdown():
    """Load sample markdown"""
    with open('tests/fixtures/sample.md', 'r') as f:
        return f.read()
```

### `tests/test_api.py`

**Purpose:** API endpoint tests
**Size:** ~300 lines

**Test Cases:**
- Upload valid file
- Upload invalid file type
- Upload file too large
- Download converted file
- Download non-existent file
- Error handling

### `tests/test_converter.py`

**Purpose:** Conversion logic tests
**Size:** ~250 lines

**Test Cases:**
- Parse front matter
- Format metadata
- Convert to DOCX
- Convert to PDF
- Handle malformed markdown
- Handle missing front matter

### `tests/test_validation.py`

**Purpose:** Validation logic tests
**Size:** ~150 lines

**Test Cases:**
- Validate file types
- Validate file sizes
- Validate format parameters
- Sanitize filenames

---

## Documentation (`docs/`)

Already defined in current directory structure.

---

## Temporary Storage (`tmp/`)

### `tmp/converted/<job_id>/`

**Purpose:** Store converted documents temporarily
**Retention:** 24 hours
**Structure:**

```
tmp/
└── converted/
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
    │   ├── document.docx
    │   ├── document.pdf
    │   └── metadata.json
    └── b2c3d4e5-f6a7-8901-bcde-f12345678901/
        └── report.docx
```

**Cleanup:** Automatic via scheduled task or on-demand script

---

## Scripts (`scripts/`)

### `scripts/cleanup.py`

**Purpose:** Clean up old temporary files
**Size:** ~50 lines
**Usage:** `python scripts/cleanup.py`

```python
"""Cleanup old converted files"""
import os
import time
from pathlib import Path

def cleanup_old_files(directory, max_age_hours=24):
    """Delete files older than max_age_hours"""
    max_age_seconds = max_age_hours * 3600
    current_time = time.time()

    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_age = current_time - os.path.getmtime(file_path)
            if file_age > max_age_seconds:
                os.remove(file_path)
                print(f"Deleted: {file_path}")

if __name__ == '__main__':
    converted_dir = Path(__file__).parent.parent / 'tmp' / 'converted'
    cleanup_old_files(converted_dir)
```

### `scripts/test_conversion.py`

**Purpose:** Manual conversion testing
**Size:** ~100 lines
**Usage:** `python scripts/test_conversion.py sample.md`

---

## File Naming Conventions

### Python Files

- **Modules:** `lowercase_with_underscores.py`
- **Classes:** `PascalCase`
- **Functions:** `lowercase_with_underscores()`
- **Constants:** `UPPERCASE_WITH_UNDERSCORES`

### JavaScript Files

- **Modules:** `camelCase.js`
- **Classes:** `PascalCase`
- **Functions:** `camelCase()`
- **Constants:** `UPPERCASE_WITH_UNDERSCORES`

### HTML/CSS Files

- **Files:** `lowercase-with-hyphens.html`
- **IDs:** `kebab-case`
- **Classes:** `kebab-case` (Tailwind utilities)

---

## Module Dependency Graph

```
┌─────────────┐
│   app.py    │ (Entry point)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  __init__.py│ (App factory)
└──────┬──────┘
       │
       ├─→ config.py
       │
       ├─→ api/
       │   ├─→ routes.py ──→ validators.py
       │   └─→ routes.py ──→ converter/converter.py
       │
       ├─→ converter/
       │   ├─→ converter.py ──→ frontmatter.py
       │   └─→ converter.py ──→ styles.py
       │
       └─→ utils/
           ├─→ file_handler.py
           ├─→ security.py
           └─→ helpers.py

Frontend (static/)
├─→ index.html ──→ app.js ──→ api.js
└─→ index.html ──→ styles.css
```

---

## Import Best Practices

### Absolute Imports

```python
# ✅ Good - absolute imports from app root
from app.converter import MarkdownConverter
from app.utils.security import sanitize_filename
from app.config import config
```

### Relative Imports (within package)

```python
# ✅ Good - relative imports within same package
from .validators import validate_upload
from ..converter import MarkdownConverter
```

### Avoid Circular Imports

```python
# ❌ Bad - circular dependency
# In module_a.py
from module_b import FunctionB

# In module_b.py
from module_a import FunctionA

# ✅ Good - move shared code to separate module
# In shared.py
def shared_function():
    pass

# In module_a.py
from shared import shared_function
```

---

## Configuration Management

### Environment Variables

**Development (.env file):**
```bash
FLASK_ENV=development
DEBUG=True
LOG_LEVEL=DEBUG
MAX_FILE_SIZE=10485760
SECRET_KEY=dev-secret-key
```

**Production (Railway):**
```bash
FLASK_ENV=production
DEBUG=False
LOG_LEVEL=INFO
MAX_FILE_SIZE=10485760
SECRET_KEY=<secure-random-key>
PORT=8080
```

### Loading Environment Variables

```python
# config.py
import os
from dotenv import load_dotenv

# Load .env file in development
if os.environ.get('FLASK_ENV') == 'development':
    load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    # ... rest of config
```

---

## Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/md-converter.git
cd md-converter

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp .env.example .env

# 5. Run application
python app/app.py

# 6. Open browser
open http://localhost:8080
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_api.py

# Run with verbose output
pytest -v
```

---

## Conclusion

This project structure provides:

1. **Clear Organization:** Logical separation of concerns
2. **Scalability:** Easy to add new features and modules
3. **Testability:** Isolated components for unit testing
4. **Maintainability:** Consistent naming and structure
5. **Documentation:** Clear purpose for each file

Developers in the Code phase should follow this structure exactly to ensure consistency and maintainability.

---

## References

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [API Specification](./API_SPECIFICATION.md)
- [Python Package Structure](https://docs.python.org/3/tutorial/modules.html)
- [Flask Application Structure](https://flask.palletsprojects.com/en/latest/patterns/)

---

**Next Steps:**
1. Review Data Flow document for processing pipeline
2. Review Component Design for implementation details
3. Begin implementation following this structure
