# Implementation Patterns and Code Examples

## Overview

This document provides complete, production-ready code examples for implementing the markdown to Word/PDF converter using the recommended technology stack.

## Recommended Architecture

```
md-converter/
├── app.py                 # Main Flask application
├── converter.py           # Conversion logic
├── config.py             # Configuration
├── requirements.txt      # Python dependencies
├── Dockerfile            # Container configuration
├── railway.toml          # Railway configuration
├── .dockerignore         # Docker ignore file
├── templates/            # HTML templates
│   └── template.docx     # Word template with page numbers
└── tests/                # Unit tests
    └── test_converter.py
```

## Core Conversion Module

### converter.py

```python
"""
Markdown to Word/PDF Converter
Handles parsing front matter and converting to multiple formats
"""
import frontmatter
import pypandoc
from pathlib import Path
from typing import Dict, Tuple, Optional
import tempfile
import logging
from weasyprint import HTML, CSS

logger = logging.getLogger(__name__)


class MarkdownConverter:
    """Converts markdown files with YAML front matter to Word and PDF"""

    def __init__(self, template_path: Optional[str] = None):
        """
        Initialize converter

        Args:
            template_path: Optional path to Word template with page numbers
        """
        self.template_path = template_path
        self._verify_pandoc()

    def _verify_pandoc(self):
        """Verify Pandoc is available"""
        try:
            pypandoc.get_pandoc_version()
        except OSError:
            raise RuntimeError(
                "Pandoc not found. Install with: pip install pypandoc-binary"
            )

    def parse_markdown(self, content: str) -> Tuple[Dict, str]:
        """
        Parse markdown with front matter

        Args:
            content: Raw markdown string with YAML front matter

        Returns:
            Tuple of (metadata dict, content string)
        """
        try:
            post = frontmatter.loads(content)
            return post.metadata, post.content
        except Exception as e:
            logger.error(f"Failed to parse front matter: {e}")
            # If no front matter, return empty dict and full content
            return {}, content

    def format_front_matter(self, metadata: Dict) -> str:
        """
        Format front matter for display at document top

        Args:
            metadata: Dictionary of front matter fields

        Returns:
            Formatted markdown string
        """
        if not metadata:
            return ""

        lines = []

        # Title (use as H1)
        title = metadata.get('title', 'Untitled Document')
        lines.append(f"# {title}\n")

        # Other metadata
        if 'author' in metadata:
            lines.append(f"**Author:** {metadata['author']}  ")
        if 'date' in metadata:
            lines.append(f"**Date:** {metadata['date']}  ")
        if 'tags' in metadata:
            tags = metadata['tags']
            if isinstance(tags, list):
                tags = ', '.join(tags)
            lines.append(f"**Tags:** {tags}  ")

        # Custom fields
        excluded = {'title', 'author', 'date', 'tags'}
        for key, value in metadata.items():
            if key not in excluded:
                lines.append(f"**{key.title()}:** {value}  ")

        lines.append("\n---\n")
        return '\n'.join(lines)

    def convert_to_docx(
        self,
        content: str,
        output_path: str,
        include_front_matter: bool = True
    ) -> str:
        """
        Convert markdown to Word document

        Args:
            content: Markdown content with YAML front matter
            output_path: Path for output .docx file
            include_front_matter: Include front matter at top of document

        Returns:
            Path to generated document
        """
        logger.info(f"Converting to DOCX: {output_path}")

        # Parse content
        metadata, md_content = self.parse_markdown(content)

        # Build document
        document_parts = []

        if include_front_matter:
            document_parts.append(self.format_front_matter(metadata))

        document_parts.append(md_content)

        full_document = '\n'.join(document_parts)

        # Prepare Pandoc arguments
        extra_args = [
            '--standalone',
            '--highlight-style=pygments',
        ]

        # Add template if provided
        if self.template_path and Path(self.template_path).exists():
            extra_args.append(f'--reference-doc={self.template_path}')

        # Convert with pypandoc
        try:
            pypandoc.convert_text(
                full_document,
                'docx',
                format='md',
                outputfile=output_path,
                extra_args=extra_args
            )
            logger.info(f"Successfully created DOCX: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"DOCX conversion failed: {e}")
            raise

    def convert_to_pdf(
        self,
        content: str,
        output_path: str,
        include_front_matter: bool = True,
        css_style: Optional[str] = None
    ) -> str:
        """
        Convert markdown to PDF with page numbers

        Args:
            content: Markdown content with YAML front matter
            output_path: Path for output .pdf file
            include_front_matter: Include front matter at top of document
            css_style: Optional custom CSS for styling

        Returns:
            Path to generated document
        """
        logger.info(f"Converting to PDF: {output_path}")

        # Parse content
        metadata, md_content = self.parse_markdown(content)

        # Convert markdown to HTML
        import markdown
        md = markdown.Markdown(extensions=[
            'extra',        # Tables, fenced code, etc.
            'codehilite',   # Syntax highlighting
            'toc',          # Table of contents
            'nl2br',        # Newline to break
            'sane_lists',   # Better list handling
        ])

        html_body = md.convert(md_content)

        # Build front matter HTML
        front_matter_html = ""
        if include_front_matter and metadata:
            front_matter_html = '<div class="front-matter">'
            front_matter_html += '<h2>Document Information</h2>'

            for key, value in metadata.items():
                key_display = key.replace('_', ' ').title()
                if isinstance(value, list):
                    value = ', '.join(str(v) for v in value)
                front_matter_html += f'<p><strong>{key_display}:</strong> {value}</p>'

            front_matter_html += '</div>'

        # Default CSS if none provided
        if css_style is None:
            css_style = self._get_default_css(metadata.get('title', ''))

        # Build complete HTML document
        html_document = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{metadata.get('title', 'Document')}</title>
            <style>{css_style}</style>
        </head>
        <body>
            {front_matter_html}
            {html_body}
        </body>
        </html>
        """

        # Generate PDF with WeasyPrint
        try:
            HTML(string=html_document).write_pdf(output_path)
            logger.info(f"Successfully created PDF: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"PDF conversion failed: {e}")
            raise

    def convert_to_both(
        self,
        content: str,
        base_name: str,
        output_dir: str = '.'
    ) -> Tuple[str, str]:
        """
        Convert markdown to both DOCX and PDF

        Args:
            content: Markdown content with YAML front matter
            base_name: Base name for output files (without extension)
            output_dir: Directory for output files

        Returns:
            Tuple of (docx_path, pdf_path)
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        docx_path = str(output_dir / f"{base_name}.docx")
        pdf_path = str(output_dir / f"{base_name}.pdf")

        self.convert_to_docx(content, docx_path)
        self.convert_to_pdf(content, pdf_path)

        return docx_path, pdf_path

    def _get_default_css(self, title: str = '') -> str:
        """Get default CSS styling for PDF"""
        return f"""
        @page {{
            size: A4;
            margin: 1in 0.75in;

            @bottom-center {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
                font-family: 'Helvetica', sans-serif;
            }}

            @top-right {{
                content: "{title}";
                font-size: 9pt;
                color: #999;
                font-family: 'Helvetica', sans-serif;
            }}
        }}

        @page :first {{
            @bottom-center {{
                content: "";
            }}
            @top-right {{
                content: "";
            }}
        }}

        body {{
            font-family: 'Georgia', serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }}

        h1, h2, h3, h4, h5, h6 {{
            font-family: 'Helvetica', sans-serif;
            color: #000;
            page-break-after: avoid;
        }}

        h1 {{
            font-size: 24pt;
            margin-top: 0;
            border-bottom: 2px solid #333;
            padding-bottom: 10pt;
        }}

        h2 {{
            font-size: 18pt;
            margin-top: 20pt;
            border-bottom: 1px solid #999;
            padding-bottom: 5pt;
        }}

        h3 {{
            font-size: 14pt;
            margin-top: 15pt;
        }}

        p {{
            margin: 0.5em 0;
            text-align: justify;
        }}

        code {{
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            color: #c7254e;
        }}

        pre {{
            background-color: #f4f4f4;
            padding: 10pt;
            border-left: 3px solid #666;
            overflow-x: auto;
            page-break-inside: avoid;
            margin: 1em 0;
        }}

        pre code {{
            background-color: transparent;
            padding: 0;
            color: inherit;
        }}

        blockquote {{
            border-left: 4px solid #ddd;
            padding-left: 15pt;
            margin-left: 0;
            color: #666;
            font-style: italic;
            page-break-inside: avoid;
        }}

        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 15pt 0;
            page-break-inside: avoid;
        }}

        th, td {{
            border: 1px solid #ddd;
            padding: 8pt;
            text-align: left;
        }}

        th {{
            background-color: #f4f4f4;
            font-weight: bold;
            color: #000;
        }}

        tr:nth-child(even) {{
            background-color: #fafafa;
        }}

        img {{
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
        }}

        a {{
            color: #0066cc;
            text-decoration: none;
        }}

        a:hover {{
            text-decoration: underline;
        }}

        ul, ol {{
            margin: 0.5em 0;
            padding-left: 2em;
        }}

        li {{
            margin: 0.25em 0;
        }}

        .front-matter {{
            border: 2px solid #333;
            background-color: #f9f9f9;
            padding: 15pt;
            margin-bottom: 20pt;
            page-break-after: avoid;
        }}

        .front-matter h2 {{
            margin-top: 0;
            font-size: 14pt;
            border-bottom: none;
        }}

        .front-matter p {{
            margin: 0.25em 0;
            text-align: left;
        }}

        hr {{
            border: none;
            border-top: 1px solid #ccc;
            margin: 2em 0;
        }}
        """


# Convenience functions for simple use cases
def convert_markdown_to_docx(markdown_content: str, output_path: str) -> str:
    """Simple function to convert markdown to DOCX"""
    converter = MarkdownConverter()
    return converter.convert_to_docx(markdown_content, output_path)


def convert_markdown_to_pdf(markdown_content: str, output_path: str) -> str:
    """Simple function to convert markdown to PDF"""
    converter = MarkdownConverter()
    return converter.convert_to_pdf(markdown_content, output_path)
```

## Flask API Application

### app.py

```python
"""
Flask API for Markdown Conversion Service
Provides endpoints for converting markdown to Word and PDF
"""
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import logging
import tempfile
from pathlib import Path
from converter import MarkdownConverter

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))  # 10MB
app.config['ALLOWED_EXTENSIONS'] = {'md', 'markdown', 'txt'}

# Initialize converter
converter = MarkdownConverter()


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    """Root endpoint - API information"""
    return jsonify({
        'service': 'Markdown to Word/PDF Converter',
        'version': '1.0.0',
        'endpoints': {
            '/health': 'Health check',
            '/convert/docx': 'Convert markdown to Word (POST)',
            '/convert/pdf': 'Convert markdown to PDF (POST)',
            '/convert/both': 'Convert to both formats (POST)',
        },
        'status': 'running'
    })


@app.route('/health')
def health():
    """Health check endpoint for Railway"""
    try:
        # Verify converter is working
        import pypandoc
        pypandoc.get_pandoc_version()

        return jsonify({
            'status': 'healthy',
            'service': 'md-converter',
            'pandoc': 'available'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@app.route('/convert/docx', methods=['POST'])
def convert_docx():
    """
    Convert markdown to Word document

    Accepts:
        - File upload (multipart/form-data) with 'file' field
        - Raw markdown (application/json) with 'content' field

    Returns:
        Word document file
    """
    try:
        # Get markdown content
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            if not allowed_file(file.filename):
                return jsonify({'error': 'Invalid file type'}), 400

            content = file.read().decode('utf-8')
            filename = secure_filename(file.filename)
            base_name = Path(filename).stem
        elif request.is_json:
            data = request.get_json()
            content = data.get('content')
            if not content:
                return jsonify({'error': 'No content provided'}), 400
            base_name = data.get('filename', 'document')
        else:
            return jsonify({'error': 'Invalid request format'}), 400

        # Convert to DOCX
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / f"{base_name}.docx"
            converter.convert_to_docx(content, str(output_path))

            logger.info(f"Successfully converted {base_name} to DOCX")
            return send_file(
                str(output_path),
                as_attachment=True,
                download_name=f"{base_name}.docx",
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

    except Exception as e:
        logger.error(f"DOCX conversion error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/convert/pdf', methods=['POST'])
def convert_pdf():
    """
    Convert markdown to PDF

    Accepts:
        - File upload (multipart/form-data) with 'file' field
        - Raw markdown (application/json) with 'content' field

    Returns:
        PDF file
    """
    try:
        # Get markdown content
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            if not allowed_file(file.filename):
                return jsonify({'error': 'Invalid file type'}), 400

            content = file.read().decode('utf-8')
            filename = secure_filename(file.filename)
            base_name = Path(filename).stem
        elif request.is_json:
            data = request.get_json()
            content = data.get('content')
            if not content:
                return jsonify({'error': 'No content provided'}), 400
            base_name = data.get('filename', 'document')
        else:
            return jsonify({'error': 'Invalid request format'}), 400

        # Convert to PDF
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / f"{base_name}.pdf"
            converter.convert_to_pdf(content, str(output_path))

            logger.info(f"Successfully converted {base_name} to PDF")
            return send_file(
                str(output_path),
                as_attachment=True,
                download_name=f"{base_name}.pdf",
                mimetype='application/pdf'
            )

    except Exception as e:
        logger.error(f"PDF conversion error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/convert/both', methods=['POST'])
def convert_both():
    """
    Convert markdown to both Word and PDF

    Returns:
        JSON with URLs or base64-encoded files
    """
    try:
        # Get markdown content
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            if not allowed_file(file.filename):
                return jsonify({'error': 'Invalid file type'}), 400

            content = file.read().decode('utf-8')
            filename = secure_filename(file.filename)
            base_name = Path(filename).stem
        elif request.is_json:
            data = request.get_json()
            content = data.get('content')
            if not content:
                return jsonify({'error': 'No content provided'}), 400
            base_name = data.get('filename', 'document')
        else:
            return jsonify({'error': 'Invalid request format'}), 400

        # Convert to both formats
        import base64
        with tempfile.TemporaryDirectory() as tmpdir:
            docx_path, pdf_path = converter.convert_to_both(
                content, base_name, tmpdir
            )

            # Read files as base64
            with open(docx_path, 'rb') as f:
                docx_b64 = base64.b64encode(f.read()).decode('utf-8')

            with open(pdf_path, 'rb') as f:
                pdf_b64 = base64.b64encode(f.read()).decode('utf-8')

            logger.info(f"Successfully converted {base_name} to both formats")
            return jsonify({
                'docx': {
                    'filename': f"{base_name}.docx",
                    'data': docx_b64,
                    'mimetype': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                },
                'pdf': {
                    'filename': f"{base_name}.pdf",
                    'data': pdf_b64,
                    'mimetype': 'application/pdf'
                }
            })

    except Exception as e:
        logger.error(f"Conversion error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'error': 'File too large. Maximum size is 10MB'}), 413


@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    logger.error(f"Internal error: {e}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting Markdown Converter API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
```

## Configuration

### config.py

```python
"""Configuration settings"""
import os

class Config:
    """Base configuration"""
    PORT = int(os.environ.get('PORT', 8080))
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))

    # Conversion settings
    INCLUDE_FRONT_MATTER = True
    TEMPLATE_PATH = os.environ.get('TEMPLATE_PATH', None)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'INFO'

# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': Config
}
```

### requirements.txt

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

# Utilities
werkzeug==3.0.3
```

## Usage Examples

### CLI Usage

```python
#!/usr/bin/env python3
"""Command-line interface for converter"""
import argparse
from converter import MarkdownConverter
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Convert Markdown to Word/PDF')
    parser.add_argument('input', help='Input markdown file')
    parser.add_argument('-o', '--output', help='Output directory', default='.')
    parser.add_argument('-f', '--format', choices=['docx', 'pdf', 'both'],
                       default='both', help='Output format')
    parser.add_argument('-t', '--template', help='Word template file')

    args = parser.parse_args()

    # Read input
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        return 1

    content = input_path.read_text()
    base_name = input_path.stem

    # Initialize converter
    converter = MarkdownConverter(template_path=args.template)

    # Convert
    try:
        if args.format == 'docx':
            output = Path(args.output) / f"{base_name}.docx"
            converter.convert_to_docx(content, str(output))
            print(f"Created: {output}")

        elif args.format == 'pdf':
            output = Path(args.output) / f"{base_name}.pdf"
            converter.convert_to_pdf(content, str(output))
            print(f"Created: {output}")

        else:  # both
            docx_path, pdf_path = converter.convert_to_both(
                content, base_name, args.output
            )
            print(f"Created: {docx_path}")
            print(f"Created: {pdf_path}")

    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0

if __name__ == '__main__':
    exit(main())
```

**Usage:**
```bash
# Convert to both formats
python cli.py document.md

# Convert to PDF only
python cli.py document.md -f pdf

# Convert with custom template
python cli.py document.md -t template.docx -o output/
```

### API Usage Examples

**cURL:**
```bash
# File upload to DOCX
curl -X POST http://localhost:8080/convert/docx \
  -F "file=@document.md" \
  --output document.docx

# JSON content to PDF
curl -X POST http://localhost:8080/convert/pdf \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello\n\nThis is **markdown**.", "filename": "test"}' \
  --output test.pdf

# Convert to both formats
curl -X POST http://localhost:8080/convert/both \
  -F "file=@document.md"
```

**Python client:**
```python
import requests

# Upload file
with open('document.md', 'rb') as f:
    response = requests.post(
        'http://localhost:8080/convert/docx',
        files={'file': f}
    )

with open('output.docx', 'wb') as f:
    f.write(response.content)

# Send content directly
markdown_content = """---
title: My Document
author: John Doe
---

# Hello World

This is **markdown** content.
"""

response = requests.post(
    'http://localhost:8080/convert/pdf',
    json={'content': markdown_content, 'filename': 'test'}
)

with open('output.pdf', 'wb') as f:
    f.write(response.content)
```

---

**Complete implementation ready for deployment on Railway with all requirements met.**
