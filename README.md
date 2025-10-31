# Markdown to Word/PDF Converter

A web-based application that converts Markdown files with YAML front matter to professionally formatted Word (DOCX) and PDF documents.

## Features

- 📄 **Markdown to Word**: Convert markdown to `.docx` format with preserved formatting
- 📑 **Markdown to PDF**: Generate PDFs with automatic page numbers
- 📝 **YAML Front Matter**: Parse and display document metadata
- 🎨 **Rich Formatting**: Support for headings, lists, code blocks, tables, and more
- 🔒 **Secure**: Input validation, file sanitization, and security headers
- ⚡ **Fast**: Efficient conversion using Pandoc and WeasyPrint
- 🐳 **Containerized**: Docker support for easy deployment
- ☁️ **Railway Ready**: Pre-configured for Railway deployment

## Technology Stack

### Backend
- **Python 3.12+**: Modern Python with type hints
- **Flask 3.0**: Lightweight web framework
- **Gunicorn**: Production WSGI server
- **Pypandoc**: Markdown to Word conversion
- **WeasyPrint**: PDF generation with styling
- **Python-frontmatter**: YAML parsing

### Frontend
- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first styling
- **Vanilla JavaScript**: No framework dependencies

### Deployment
- **Docker**: Containerized deployment
- **Railway**: Cloud hosting platform

## Quick Start

### Prerequisites

- Python 3.12 or higher
- Pandoc (installed via system package manager or pypandoc-binary)
- pip (Python package manager)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/md-converter.git
cd md-converter

# 2. Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create necessary directories
mkdir -p tmp/converted

# 5. Run the application
python wsgi.py

# 6. Open browser
open http://localhost:8080
```

### Docker

```bash
# Build image
docker build -t md-converter:latest .

# Run container
docker run -p 8080:8080 md-converter:latest

# Access application
open http://localhost:8080
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up

# View logs
railway logs

# Open deployment
railway open
```

## Usage

### Web Interface

1. Open the application in your browser
2. Click "Choose File" or drag-and-drop a markdown file
3. Select output format (Word, PDF, or Both)
4. Click "Convert"
5. Download your converted files

### API Endpoints

#### Convert Markdown

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
```

#### Download Converted File

```bash
curl http://localhost:8080/api/download/{job_id}/docx \
  --output document.docx
```

#### Health Check

```bash
curl http://localhost:8080/health
```

## Markdown Format

### Basic Markdown

```markdown
---
title: My Document
author: John Doe
date: 2025-10-31
tags: [markdown, converter, documentation]
---

# Introduction

This is a **markdown** document with *various* formatting.

## Features

- Bullet points
- **Bold text**
- *Italic text*
- `Inline code`

## Code Blocks

\```python
def hello_world():
    print("Hello, World!")
\```

## Tables

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

## Links

[OpenAI](https://openai.com)
```

### Front Matter

YAML front matter is optional but recommended for document metadata:

```yaml
---
title: Document Title
author: Author Name
date: 2025-10-31
version: 1.0
tags: [tag1, tag2, tag3]
---
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Environment (development/production) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `MAX_FILE_SIZE` | `10485760` | Max upload size in bytes (10MB) |
| `PORT` | `8080` | HTTP server port |
| `SECRET_KEY` | Generated | Flask secret key |

### File Limits

- **Maximum file size**: 10 MB
- **Allowed extensions**: `.md`, `.markdown`, `.txt`
- **File retention**: 24 hours (automatic cleanup)

## Project Structure

```
md-converter/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configuration
│   ├── api/                     # API endpoints
│   ├── converters/              # Conversion engine
│   └── utils/                   # Utilities
├── static/
│   └── index.html               # Frontend
├── wsgi.py                      # WSGI entry point
├── requirements.txt             # Dependencies
├── Dockerfile                   # Container config
└── railway.toml                 # Railway config
```

## Security

- **Input validation**: File type, size, and content validation
- **Filename sanitization**: Prevents path traversal attacks
- **Security headers**: CSP, XSS protection, frame options
- **Non-root execution**: Container runs as non-privileged user
- **Resource limits**: Request timeouts and worker limits
- **Automatic cleanup**: Temporary files deleted after 24 hours

## API Documentation

### POST /api/convert

Convert markdown file to document format(s).

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Parameters:
  - `file`: Markdown file (required)
  - `format`: Output format - `docx`, `pdf`, or `both` (default: `both`)

**Response (format=both):**
```json
{
  "status": "success",
  "job_id": "uuid",
  "filename": "document",
  "formats": {
    "docx": {
      "download_url": "/api/download/{job_id}/docx",
      "filename": "document.docx",
      "size": 45678,
      "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    "pdf": {
      "download_url": "/api/download/{job_id}/pdf",
      "filename": "document.pdf",
      "size": 123456,
      "mimetype": "application/pdf"
    }
  },
  "processing_time": 2.34,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**Response (format=docx or pdf):**
- Binary file download

**Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

### GET /api/download/<job_id>/<format>

Download converted file.

**Request:**
- Method: `GET`
- Parameters:
  - `job_id`: UUID from conversion response
  - `format`: `docx` or `pdf`

**Response:**
- Binary file download

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "md-converter",
  "version": "1.0.0",
  "dependencies": {
    "pandoc": "available",
    "weasyprint": "62.3"
  },
  "timestamp": "2025-10-31T10:30:00Z"
}
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_converter.py
```

### Code Style

The project follows:
- **PEP 8**: Python style guide
- **Type hints**: For better code clarity
- **Docstrings**: Google-style documentation
- **Logging**: Comprehensive logging at all levels

### Adding New Features

1. Review architecture documentation in `docs/architecture/`
2. Implement feature in appropriate module
3. Add tests in `tests/`
4. Update documentation
5. Submit pull request

## Troubleshooting

### Pandoc not found

```bash
# Ubuntu/Debian
sudo apt-get install pandoc

# macOS
brew install pandoc

# Or use pypandoc-binary (already in requirements.txt)
pip install pypandoc-binary
```

### WeasyPrint installation fails

```bash
# Ubuntu/Debian
sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0

# macOS
brew install pango gdk-pixbuf
```

### Port already in use

```bash
# Change port
export PORT=8081
python wsgi.py
```

## Performance

- **Conversion speed**: ~2-5 seconds per file
- **Concurrent requests**: Supports multiple simultaneous conversions
- **File size limit**: 10 MB (configurable)
- **Throughput**: 10-20 conversions/minute on standard hardware

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Pandoc](https://pandoc.org/) - Universal document converter
- [WeasyPrint](https://weasyprint.org/) - PDF generation
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Review documentation in `docs/`
- Check API specification in `docs/architecture/API_SPECIFICATION.md`

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2025-10-31
