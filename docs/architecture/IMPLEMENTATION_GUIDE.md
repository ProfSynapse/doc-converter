# Implementation Guide

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture → Code Transition (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This guide provides detailed instructions for implementing the Markdown Converter application during the Code phase. It includes coding standards, development workflow, testing requirements, and specific implementation patterns that developers must follow.

---

## Prerequisites

### Required Knowledge

**Backend:**
- Python 3.12+ (intermediate to advanced)
- Flask web framework
- File I/O and system operations
- HTTP protocol and REST APIs
- Error handling and logging

**Frontend:**
- JavaScript ES6+ (intermediate)
- DOM manipulation
- Fetch API and asynchronous operations
- HTML5 and semantic markup
- Tailwind CSS utility classes

**DevOps:**
- Docker basics
- Git version control
- Command-line interface

### Development Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/md-converter.git
cd md-converter

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Install development dependencies
pip install -r requirements-dev.txt

# 5. Create .env file
cp .env.example .env

# 6. Verify setup
python -c "import pypandoc; print(pypandoc.get_pandoc_version())"

# 7. Run tests
pytest

# 8. Run application
python app/app.py
```

---

## Coding Standards

### Python Style Guide (PEP 8)

**Follow PEP 8 strictly:**

```python
# Good: Clear, descriptive names
def convert_markdown_to_docx(content: str, output_path: str) -> str:
    """
    Convert markdown content to Word document.

    Args:
        content: Markdown string with YAML front matter
        output_path: Path for output .docx file

    Returns:
        Path to generated document

    Raises:
        ConversionError: If conversion fails
    """
    pass

# Bad: Unclear names, no docstring
def conv(c, o):
    pass
```

**Naming Conventions:**
- Modules: `lowercase_with_underscores.py`
- Classes: `PascalCase`
- Functions: `lowercase_with_underscores()`
- Constants: `UPPERCASE_WITH_UNDERSCORES`
- Private: `_leading_underscore`

**Import Organization:**
```python
# 1. Standard library imports
import os
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional

# 2. Third-party imports
from flask import Flask, request, jsonify
import frontmatter
import pypandoc

# 3. Local application imports
from app.converter import MarkdownConverter
from app.utils.security import sanitize_filename
```

**Line Length:**
- Maximum: 100 characters (slightly more flexible than PEP 8's 79)
- Use implicit line continuation for long lines

```python
# Good
result = converter.convert_to_both(
    content=markdown_content,
    base_name=filename,
    output_dir=output_directory
)

# Bad
result = converter.convert_to_both(content=markdown_content, base_name=filename, output_dir=output_directory)
```

### JavaScript Style Guide

**Airbnb Style Guide with modifications:**

```javascript
// Good: ES6+ features, clear naming
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    /**
     * Convert markdown file
     * @param {File} file - Markdown file
     * @param {string} format - Output format
     * @returns {Promise<Object>} Conversion result
     */
    async convertMarkdown(file, format = 'both') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);

        const response = await fetch(`${this.baseURL}/api/convert`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Conversion failed');
        }

        return await response.json();
    }
}

// Bad: ES5 syntax, unclear naming
function API() {
    this.url = '';
}
API.prototype.conv = function(f, fmt, cb) {
    // ...
}
```

**Naming Conventions:**
- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPERCASE_WITH_UNDERSCORES`
- Private: `_leadingUnderscore` (by convention)

---

## Implementation Order

### Phase 1: Core Backend (Week 1)

#### Step 1: Project Structure Setup
```bash
# Create directory structure
mkdir -p app/{api,converter,utils,templates}
mkdir -p static/{js,css}
mkdir -p tests/fixtures
mkdir -p docs/architecture

# Create __init__.py files
touch app/__init__.py
touch app/api/__init__.py
touch app/converter/__init__.py
touch app/utils/__init__.py
```

#### Step 2: Configuration Module
**File:** `app/config.py`

```python
import os
from pathlib import Path

class Config:
    """Base configuration"""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Application
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {'md', 'markdown', 'txt'}

    # Paths
    BASE_DIR = Path(__file__).parent.parent
    UPLOAD_FOLDER = BASE_DIR / 'tmp' / 'uploads'
    CONVERTED_FOLDER = BASE_DIR / 'tmp' / 'converted'
    TEMPLATE_PATH = BASE_DIR / 'app' / 'templates' / 'template.docx'

    # Conversion
    INCLUDE_FRONT_MATTER = True
    CLEANUP_INTERVAL = 24 * 3600

    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    DEBUG = False
    LOG_LEVEL = 'INFO'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': Config
}
```

#### Step 3: Converter Core
**File:** `app/converter/converter.py`

**Implementation priority:**
1. `__init__()` - Initialize converter
2. `parse_markdown()` - Parse YAML front matter
3. `format_front_matter()` - Format metadata
4. `convert_to_docx()` - Word conversion
5. `convert_to_pdf()` - PDF conversion
6. `convert_to_both()` - Combined conversion

**Reference:** See `/docs/preparation/08-implementation-patterns.md` for complete code

#### Step 4: API Routes
**File:** `app/api/routes.py`

**Implementation priority:**
1. `/convert` endpoint (POST)
2. `/download/<job_id>/<format>` endpoint (GET)
3. Error handlers
4. Response builders

#### Step 5: Validators
**File:** `app/api/validators.py`

**Implementation priority:**
1. `validate_upload()` - File validation
2. `allowed_file()` - Extension check
3. `validate_format()` - Format validation
4. `sanitize_filename()` - Filename sanitization

### Phase 2: Frontend (Week 2)

#### Step 1: HTML Structure
**File:** `static/index.html`

**Sections to implement:**
1. Header and navigation
2. Upload section (drag-drop zone)
3. Progress section (conversion status)
4. Download section (download buttons)
5. Error section (error messages)

#### Step 2: API Client
**File:** `static/js/api.js`

**Methods to implement:**
1. `convertMarkdown()` - Upload and convert
2. `downloadFile()` - Download file
3. `checkHealth()` - Health check
4. Helper methods (blob handling, etc.)

#### Step 3: Application Logic
**File:** `static/js/app.js`

**Features to implement:**
1. File selection handling
2. Drag-and-drop functionality
3. Validation (client-side)
4. Conversion workflow
5. Download management
6. State management
7. UI updates

### Phase 3: Testing (Week 3)

#### Backend Tests
```python
# tests/test_converter.py
import pytest
from app.converter import MarkdownConverter

def test_parse_markdown_with_front_matter():
    converter = MarkdownConverter()
    content = """---
title: Test
author: Jane
---
# Hello"""
    metadata, body = converter.parse_markdown(content)
    assert metadata['title'] == 'Test'
    assert '# Hello' in body

def test_convert_to_docx(tmp_path):
    converter = MarkdownConverter()
    output = tmp_path / 'test.docx'
    result = converter.convert_to_docx('# Test', str(output))
    assert output.exists()
    assert output.stat().st_size > 0

# tests/test_api.py
def test_convert_endpoint(client):
    with open('tests/fixtures/sample.md', 'rb') as f:
        response = client.post('/api/convert', data={
            'file': (f, 'sample.md'),
            'format': 'both'
        })
    assert response.status_code == 200
    data = response.json
    assert 'job_id' in data
    assert 'formats' in data
```

#### Frontend Tests (Manual)
**Testing Checklist:**
- [ ] File upload (drag-and-drop)
- [ ] File upload (click)
- [ ] File type validation
- [ ] File size validation
- [ ] Format selection
- [ ] Conversion process
- [ ] Download DOCX
- [ ] Download PDF
- [ ] Error handling
- [ ] Mobile responsiveness

### Phase 4: Deployment (Week 4)

1. Create Dockerfile
2. Test Docker build locally
3. Configure Railway
4. Deploy to Railway
5. Test production deployment
6. Monitor and optimize

---

## Error Handling Patterns

### Backend Error Handling

```python
# app/api/routes.py
@api_blueprint.route('/convert', methods=['POST'])
def convert():
    try:
        # Validation
        validation_error = validate_upload(request)
        if validation_error:
            return jsonify(validation_error), validation_error['status']

        # Processing
        file = request.files['file']
        content = file.read().decode('utf-8')

        # Conversion
        converter = MarkdownConverter()
        result = converter.convert_to_docx(content, output_path)

        return jsonify({'status': 'success', 'path': result}), 200

    except UnicodeDecodeError:
        logger.error('File encoding error')
        return jsonify({
            'error': 'File must be UTF-8 encoded',
            'code': 'INVALID_ENCODING',
            'status': 422
        }), 422

    except ConversionError as e:
        logger.error(f'Conversion failed: {e}', exc_info=True)
        return jsonify({
            'error': 'Document conversion failed',
            'code': 'CONVERSION_ERROR',
            'status': 500
        }), 500

    except Exception as e:
        logger.error(f'Unexpected error: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR',
            'status': 500
        }), 500
```

### Frontend Error Handling

```javascript
// static/js/app.js
async handleConvert() {
    try {
        this.currentState = 'UPLOADING';
        this.updateUI();

        const format = this.getSelectedFormat();
        const result = await this.apiClient.convertMarkdown(
            this.currentFile,
            format
        );

        this.conversionResult = result;
        this.currentState = 'COMPLETE';
        this.updateUI();

    } catch (error) {
        console.error('Conversion failed:', error);

        this.currentState = 'ERROR';

        // User-friendly error messages
        let message = 'Conversion failed. Please try again.';

        if (error.message.includes('File too large')) {
            message = 'File is too large. Maximum size is 10 MB.';
        } else if (error.message.includes('Invalid file type')) {
            message = 'Invalid file type. Please upload a .md or .markdown file.';
        } else if (error.message.includes('Network')) {
            message = 'Network error. Please check your connection and try again.';
        }

        this.showError(message);
    }
}
```

---

## Logging Strategy

### Backend Logging

```python
# app/__init__.py
import logging
import sys

def configure_logging(app):
    """Configure application logging"""

    # Log level from config
    log_level = getattr(logging, app.config['LOG_LEVEL'].upper())

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)

    # Suppress noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)

    return app

# Usage in components
# app/converter/converter.py
import logging

logger = logging.getLogger(__name__)

def convert_to_docx(self, content, output_path):
    logger.info(f"Converting to DOCX: {output_path}")
    try:
        # Conversion logic
        logger.debug(f"Parsed front matter: {metadata}")
        logger.info(f"Successfully created: {output_path}")
    except Exception as e:
        logger.error(f"Conversion failed: {e}", exc_info=True)
        raise
```

### Frontend Logging

```javascript
// static/js/utils.js
class Logger {
    constructor(name) {
        this.name = name;
        this.isDevelopment = window.location.hostname === 'localhost';
    }

    debug(message, data = null) {
        if (this.isDevelopment) {
            console.log(`[DEBUG] ${this.name}: ${message}`, data || '');
        }
    }

    info(message, data = null) {
        console.info(`[INFO] ${this.name}: ${message}`, data || '');
    }

    error(message, error = null) {
        console.error(`[ERROR] ${this.name}: ${message}`, error || '');
    }
}

// Usage
const logger = new Logger('APIClient');
logger.debug('Sending conversion request', { file: file.name, format });
logger.error('Conversion failed', error);
```

---

## Testing Guidelines

### Unit Testing (pytest)

```python
# tests/conftest.py
import pytest
from app import create_app
from app.converter import MarkdownConverter

@pytest.fixture
def app():
    """Create test application"""
    app = create_app('testing')
    app.config['TESTING'] = True
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
    return """---
title: Test Document
author: Test Author
---

# Introduction

This is a **test** document.
"""

# tests/test_converter.py
def test_parse_markdown(converter, sample_markdown):
    """Test markdown parsing"""
    metadata, content = converter.parse_markdown(sample_markdown)

    assert metadata['title'] == 'Test Document'
    assert metadata['author'] == 'Test Author'
    assert '# Introduction' in content

def test_convert_to_docx(converter, sample_markdown, tmp_path):
    """Test DOCX conversion"""
    output_path = tmp_path / 'test.docx'

    result = converter.convert_to_docx(
        sample_markdown,
        str(output_path)
    )

    assert output_path.exists()
    assert output_path.stat().st_size > 0
```

**Run tests:**
```bash
# All tests
pytest

# With coverage
pytest --cov=app tests/

# Specific test file
pytest tests/test_converter.py

# Specific test
pytest tests/test_converter.py::test_parse_markdown

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

---

## Git Workflow

### Branch Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/converter-engine
  │     ├── feature/api-routes
  │     ├── feature/frontend-ui
  │     └── feature/deployment
  │
  └── hotfix/critical-bug (if needed)
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process, dependencies

**Examples:**
```
feat(converter): Add DOCX conversion support

Implemented pypandoc integration for markdown to Word conversion.
Includes front matter parsing and template support.

Closes #15

---

fix(api): Handle UTF-8 decoding errors

Added try-catch for file decoding with proper error response.

Fixes #23

---

docs(architecture): Complete API specification

Added comprehensive API documentation with examples and error codes.
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Tested on multiple browsers (if frontend)

## Screenshots (if applicable)
```

---

## Performance Optimization

### Backend Optimization

```python
# Use generators for large files
def read_large_file(file_path):
    """Generator for reading large files in chunks"""
    with open(file_path, 'r') as f:
        while True:
            chunk = f.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            yield chunk

# Cache converter instance
from functools import lru_cache

@lru_cache(maxsize=1)
def get_converter():
    """Cached converter instance"""
    return MarkdownConverter(template_path=Config.TEMPLATE_PATH)

# Use context managers for file operations
def convert_file(input_path, output_path):
    """Convert file with proper resource management"""
    with open(input_path, 'r') as input_file:
        content = input_file.read()

    converter = get_converter()
    converter.convert_to_docx(content, output_path)
```

### Frontend Optimization

```javascript
// Debounce expensive operations
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Lazy load large libraries
async function loadMarkdownPreview() {
    if (!window.marked) {
        const marked = await import('https://cdn.jsdelivr.net/npm/marked@12.0.0/+esm');
        window.marked = marked;
    }
    return window.marked;
}

// Use RequestAnimationFrame for UI updates
function updateProgress(percentage) {
    requestAnimationFrame(() => {
        document.getElementById('progress-bar').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = `${percentage}%`;
    });
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Dependencies pinned
- [ ] Security audit completed
- [ ] Performance testing done

### Deployment Steps

1. **Build Docker image:**
   ```bash
   docker build -t md-converter:1.0.0 .
   ```

2. **Test locally:**
   ```bash
   docker run -p 8080:8080 md-converter:1.0.0
   curl http://localhost:8080/health
   ```

3. **Push to repository:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **Deploy to Railway:**
   ```bash
   railway up
   railway logs
   ```

5. **Verify deployment:**
   - Check health endpoint
   - Test conversion
   - Monitor logs
   - Check metrics

### Post-Deployment

- [ ] Health check passing
- [ ] Smoke tests executed
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] Logs reviewed
- [ ] Documentation updated

---

## Troubleshooting Guide

### Common Issues

**Issue:** Pandoc not found
**Solution:**
```bash
# Install Pandoc
# Ubuntu/Debian
sudo apt-get install pandoc

# macOS
brew install pandoc

# Or use pypandoc-binary
pip install pypandoc-binary
```

**Issue:** WeasyPrint installation fails
**Solution:**
```bash
# Install system dependencies
# Ubuntu/Debian
sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0

# macOS
brew install pango gdk-pixbuf
```

**Issue:** File encoding errors
**Solution:**
```python
# Always specify encoding
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
```

**Issue:** Port already in use
**Solution:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use different port
export PORT=8081
python app/app.py
```

---

## Conclusion

This implementation guide provides:

1. **Clear Standards:** Coding conventions and best practices
2. **Structured Approach:** Phase-by-phase implementation plan
3. **Practical Examples:** Code samples for common patterns
4. **Testing Strategy:** Comprehensive testing guidelines
5. **Deployment Process:** Step-by-step deployment procedures

Follow this guide during the Code phase to ensure consistent, high-quality implementation that matches the architecture specifications.

---

## References

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [API Specification](./API_SPECIFICATION.md)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [Component Design](./COMPONENT_DESIGN.md)
- [Security Design](./SECURITY_DESIGN.md)
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [pytest Documentation](https://docs.pytest.org/)

---

**You are now ready to begin the Code phase.**

**Next Steps:**
1. Set up development environment
2. Create project structure
3. Begin implementation following the phase plan
4. Write tests alongside features
5. Deploy to Railway when complete

Good luck with implementation!
