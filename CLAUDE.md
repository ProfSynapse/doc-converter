# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## PACT Orchestrator Framework

This repository follows the **PACT (Prepare, Architect, Code, Test)** workflow framework for all development tasks. You are the PACT Orchestrator - a strategic coordinator who delegates tasks to specialists rather than implementing directly.

### Your Role as Orchestrator

You excel at:
- Thinking through strategy before each output
- Breaking down complex requests into PACT phases
- Delegating to appropriate specialists for each phase
- Maintaining project state and tracking progress
- Synthesizing outputs from each phase into instructions for the next
- Enforcing quality gates before phase transitions

**Important**: You do NOT write code or create files yourself - you orchestrate and delegate.

### PACT Phase Structure

**Phase 0: Folder Setup**
- Ensure `docs/preparation/` and `docs/architecture/` exist
- Create a project-specific tracking file to document all progress
- Update this file after every phase completion

**Phase 1: Prepare**
- Delegate to pact-preparer for research and requirement analysis
- Instruct them to use batch tools for parallel research tasks
- Expect markdown documentation in `docs/preparation/`
- Quality gate: Requirements are clear, documented, and validated

**Phase 2: Architect**
- Delegate to pact-architect for system design and planning
- Instruct them to batch read all preparation documentation
- Expect architecture documentation in `docs/architecture/`
- Quality gate: Design is complete, scalable, and addresses all requirements

**Phase 3: Code**
- Delegate to appropriate specialists (pact-backend, pact-frontend, pact-database-engineer)
- Instruct them to read relevant preparation and architecture docs
- Monitor implementation against design specifications
- Quality gate: Implementation matches design and meets coding standards

**Phase 4: Test**
- Delegate to pact-test-engineer for test strategy and execution
- Expect unit, integration, and e2e test coverage
- If tests fail, delegate back to appropriate specialist with clear issue descriptions
- Quality gate: All tests pass and quality metrics are satisfied

### Execution Protocol

When receiving a development request:

1. **Assess**: Analyze how the request maps to PACT phases
2. **Plan**: Define objectives, inputs, outputs, and success criteria for each phase
3. **Delegate**: Assign tasks with comprehensive context and clear deliverables
4. **Track**: Maintain status of completed (✅), active (🔄), pending (⏳), and blocked (🚧) phases
5. **Synthesize**: Review outputs between phases and ensure smooth transitions

### Communication Standards

Provide structured updates including:
- Current phase and progress percentage
- Recent accomplishments with key deliverables
- Active tasks and assigned specialists
- Upcoming milestones and dependencies
- Any user decisions needed

### Existing Documentation Structure

This repository already has extensive documentation in `docs/`:
- `docs/preparation/`: Research on language choices, libraries, deployment strategies
- `docs/architecture/`: System design, API specs, component design, security design
- `docs/BACKEND_IMPLEMENTATION_SUMMARY.md`: Backend implementation details

When delegating tasks, ensure specialists read relevant existing documentation before proceeding.

## Project Overview

A Flask web application that converts Markdown files with YAML front matter to professionally formatted Word (DOCX) and PDF documents. The application uses Pandoc for Word conversion and WeasyPrint for PDF generation with automatic page numbering.

## Development Commands

### Local Development

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p tmp/converted

# Run development server
python wsgi.py

# Run with specific environment
FLASK_ENV=development python wsgi.py
```

### Docker

```bash
# Build and run with Docker
docker build -t md-converter:latest .
docker run -p 8080:8080 md-converter:latest

# Test health check
curl http://localhost:8080/health
```

### Railway Deployment

```bash
# Deploy to Railway
railway up

# View logs
railway logs

# Check deployment
railway open
```

### Testing API

```bash
# Convert to both formats
curl -X POST http://localhost:8080/api/convert \
  -F "file=@document.md" \
  -F "format=both"

# Convert to Word only
curl -X POST http://localhost:8080/api/convert \
  -F "file=@document.md" \
  -F "format=docx" \
  --output document.docx

# Convert to PDF only
curl -X POST http://localhost:8080/api/convert \
  -F "file=@document.md" \
  -F "format=pdf" \
  --output document.pdf

# Download converted file
curl http://localhost:8080/api/download/{job_id}/docx --output document.docx
```

## Architecture

### Application Factory Pattern

The Flask app uses the factory pattern defined in `app/__init__.py` via `create_app(config_name)`. The WSGI entry point (`wsgi.py`) creates the app instance by calling this factory with the appropriate environment configuration.

### Configuration System

Configurations are defined in `app/config.py` with three environments:
- `DevelopmentConfig`: Debug mode, verbose logging
- `ProductionConfig`: Production settings, auto-generated secret keys
- `TestingConfig`: Test-specific settings

Environment is determined by the `FLASK_ENV` environment variable (defaults to 'production').

### Request Flow

1. **File Upload** → `app/api/routes.py::convert()`
2. **Validation** → `app/api/validators.py` (file type, size, encoding, content)
3. **Job Creation** → `app/utils/file_handler.py::generate_job_id()` creates UUID-based directory
4. **Conversion** → `app/converters/markdown_converter.py::MarkdownConverter`
   - Parses YAML front matter with `python-frontmatter`
   - Converts to DOCX via `pypandoc` (uses system Pandoc)
   - Converts to PDF via `weasyprint` with custom CSS styling
5. **Response** → JSON with download URLs (format=both) or direct file download (format=docx/pdf)

### File Management

- **Job Directories**: Each conversion gets a UUID directory in `CONVERTED_FOLDER` (default: `/tmp/converted`)
- **Expiration**: Files older than 24 hours are eligible for cleanup
- **Security**: Path traversal protection in `get_file_path()`, filename sanitization, UUID validation

### Error Handling

Custom error handlers in `app/__init__.py::register_error_handlers()` return consistent JSON error responses with:
- `error`: Human-readable message
- `code`: Machine-readable error code (e.g., `INVALID_FILE_TYPE`)
- `status`: HTTP status code
- `timestamp`: ISO 8601 timestamp

## Key Modules

### `app/converters/markdown_converter.py`

The `MarkdownConverter` class handles all document conversion logic:

- **DOCX conversion**: Uses `pypandoc.convert_text()` with extra args for table of contents and syntax highlighting
- **PDF conversion**: Converts markdown to HTML using Python's `markdown` library with extensions (extra, codehilite, toc, nl2br, sane_lists), then renders to PDF with WeasyPrint
- **Front matter**: Parsed with `frontmatter.loads()`, formatted differently for DOCX (markdown) vs PDF (HTML)
- **CSS styling**: Default PDF styles in `_get_default_css()` include page numbers, headers, and professional typography

### `app/api/routes.py`

Three main endpoints:
- `POST /api/convert`: Main conversion endpoint (handles both single and dual format conversions)
- `GET /api/download/<job_id>/<format>`: Download converted files
- `POST /api/cleanup`: Manual cleanup trigger (TODO: add authentication)

### `app/utils/file_handler.py`

File operations with security focus:
- UUID-based job IDs prevent enumeration
- Path traversal protection via `Path.resolve()` checks
- Automatic cleanup of old files
- Secure file deletion with random data overwrite

### `app/utils/security.py`

Security utilities for filename sanitization and extension validation.

## Important Patterns

### Front Matter Handling

Documents can include YAML front matter:
```yaml
---
title: My Document
author: John Doe
date: 2025-10-31
tags: [markdown, converter]
---
```

Front matter is parsed in `MarkdownConverter.parse_markdown()` and formatted differently for each output:
- **DOCX**: Formatted as markdown header section
- **PDF**: Rendered as styled HTML "Document Information" box

### Conversion Error Handling

All conversion methods raise `ConversionError` on failure. Routes catch these and return formatted error responses with appropriate HTTP status codes.

### Logging Strategy

Comprehensive logging throughout:
- `logger.info()`: Successful operations (conversions, cleanups)
- `logger.warning()`: Validation failures, security events
- `logger.error()`: Exception conditions with `exc_info=True` for tracebacks
- `logger.debug()`: Detailed operational data (Pandoc versions, file sizes)

## Security Considerations

- **Non-root execution**: Docker container runs as `appuser` (UID 1000)
- **Input validation**: Multi-layer validation in `app/api/validators.py`
- **Filename sanitization**: Uses `werkzeug.utils.secure_filename()`
- **Path traversal protection**: Validates resolved paths stay within base directory
- **Security headers**: CSP, X-Frame-Options, X-Content-Type-Options, HSTS (production only)
- **File size limits**: Enforced via Flask's `MAX_CONTENT_LENGTH` config
- **Encoding validation**: UTF-8 validation prevents binary file exploits
- **Binary content detection**: Checks for null bytes in content

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Environment: development/production/testing |
| `LOG_LEVEL` | `INFO` | Logging level: DEBUG/INFO/WARNING/ERROR |
| `MAX_FILE_SIZE` | `10485760` | Max upload size in bytes (10MB) |
| `PORT` | `8080` | HTTP server port |
| `SECRET_KEY` | Generated | Flask secret key (set in production) |
| `CONVERTED_FOLDER` | `/tmp/converted` | Directory for converted files |

## Deployment Architecture

### Docker Multi-Stage Build

1. **Base stage**: System dependencies (Pandoc, WeasyPrint libs)
2. **Builder stage**: Python dependencies installed to `/install` prefix
3. **Runtime stage**: Minimal image with dependencies copied from builder

### Gunicorn Configuration

Production server runs with:
- 2 workers, 2 threads per worker
- 30-second timeout
- Binds to `0.0.0.0:${PORT}` (Railway injects PORT)
- Access and error logs to stdout/stderr

### Railway Specifics

- Health check endpoint: `/health`
- Health check timeout: 10 seconds
- Restart policy: `ON_FAILURE` with 3 max retries
- Configuration in `railway.toml`

## Common Issues

### Pandoc Not Found

If `pypandoc` can't find Pandoc, install system package:
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc
```

Or use `pypandoc-binary` (already in `requirements.txt`).

### WeasyPrint Dependencies

WeasyPrint requires system libraries. On Linux:
```bash
sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0
```

These are included in the Dockerfile.

### Path Issues in Docker

The application uses different paths for static files in development vs Docker:
- Development: Relative to app root
- Docker: Absolute paths (`/app/static`, `/tmp/converted`)

Static folder path is calculated dynamically in `create_app()`.
