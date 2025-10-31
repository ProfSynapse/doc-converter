# Component Design Specification

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document provides detailed specifications for each component in the Markdown Converter application. It defines interfaces, responsibilities, dependencies, and implementation guidelines for all backend and frontend components.

---

## Component Architecture

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  Frontend        │              │  API Layer       │        │
│  │  Components      │◄────────────►│  Components      │        │
│  │                  │   HTTP/JSON  │                  │        │
│  │  - index.html    │              │  - routes.py     │        │
│  │  - app.js        │              │  - validators.py │        │
│  │  - api.js        │              │                  │        │
│  └──────────────────┘              └────────┬─────────┘        │
│                                              │                  │
│                                              │                  │
│                            ┌─────────────────▼─────────────┐   │
│                            │  Business Logic Layer         │   │
│                            │                               │   │
│                            │  - converter.py               │   │
│                            │  - frontmatter.py             │   │
│                            │  - styles.py                  │   │
│                            └─────────────┬─────────────────┘   │
│                                          │                     │
│                            ┌─────────────▼─────────────┐       │
│                            │  Utility Layer             │       │
│                            │                            │       │
│                            │  - file_handler.py         │       │
│                            │  - security.py             │       │
│                            │  - helpers.py              │       │
│                            └─────────────┬──────────────┘       │
│                                          │                      │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                            ┌──────────────▼──────────────┐
                            │  External Libraries         │
                            │                             │
                            │  - pypandoc                 │
                            │  - weasyprint               │
                            │  - python-frontmatter       │
                            │  - markdown                 │
                            └─────────────────────────────┘
```

---

## Backend Components

### 1. MarkdownConverter Component

**Location:** `app/converter/converter.py`
**Purpose:** Core conversion engine for markdown to document formats
**Type:** Business Logic

#### Class Definition

```python
class MarkdownConverter:
    """
    Converts markdown files with YAML front matter to Word and PDF formats.

    This is the primary conversion engine that orchestrates the entire
    markdown-to-document pipeline.
    """

    def __init__(self, template_path: Optional[str] = None):
        """
        Initialize converter with optional Word template.

        Args:
            template_path: Path to .docx template with page numbers
        """
        self.template_path = template_path
        self._verify_pandoc()
        self.logger = logging.getLogger(__name__)

    def _verify_pandoc(self) -> None:
        """
        Verify Pandoc is available in system.

        Raises:
            RuntimeError: If Pandoc is not found
        """

    def parse_markdown(self, content: str) -> Tuple[Dict, str]:
        """
        Parse markdown with YAML front matter.

        Args:
            content: Raw markdown string with optional YAML front matter

        Returns:
            Tuple of (metadata dict, content string)

        Example:
            >>> metadata, content = converter.parse_markdown(md_string)
            >>> print(metadata['title'])
            'My Document'
        """

    def format_front_matter(self, metadata: Dict) -> str:
        """
        Format front matter for display in document.

        Args:
            metadata: Dictionary of front matter fields

        Returns:
            Formatted markdown string for document header

        Example:
            >>> formatted = converter.format_front_matter({
            ...     'title': 'Report',
            ...     'author': 'Jane'
            ... })
            >>> print(formatted)
            # Report
            **Author:** Jane
            ---
        """

    def convert_to_docx(
        self,
        content: str,
        output_path: str,
        include_front_matter: bool = True
    ) -> str:
        """
        Convert markdown to Word document.

        Args:
            content: Markdown content with YAML front matter
            output_path: Path for output .docx file
            include_front_matter: Include front matter in document

        Returns:
            Path to generated document

        Raises:
            ConversionError: If conversion fails
            IOError: If file cannot be written

        Example:
            >>> path = converter.convert_to_docx(
            ...     markdown_string,
            ...     '/tmp/output.docx'
            ... )
        """

    def convert_to_pdf(
        self,
        content: str,
        output_path: str,
        include_front_matter: bool = True,
        css_style: Optional[str] = None
    ) -> str:
        """
        Convert markdown to PDF with page numbers.

        Args:
            content: Markdown content with YAML front matter
            output_path: Path for output .pdf file
            include_front_matter: Include front matter in document
            css_style: Custom CSS for styling (uses default if None)

        Returns:
            Path to generated document

        Raises:
            ConversionError: If conversion fails
            IOError: If file cannot be written
        """

    def convert_to_both(
        self,
        content: str,
        base_name: str,
        output_dir: str = '.'
    ) -> Tuple[str, str]:
        """
        Convert markdown to both DOCX and PDF.

        Args:
            content: Markdown content with YAML front matter
            base_name: Base name for output files (no extension)
            output_dir: Directory for output files

        Returns:
            Tuple of (docx_path, pdf_path)

        Example:
            >>> docx, pdf = converter.convert_to_both(
            ...     markdown_string,
            ...     'document',
            ...     '/tmp/output'
            ... )
        """

    def _get_default_css(self, title: str = '') -> str:
        """
        Get default CSS styling for PDF generation.

        Args:
            title: Document title for header

        Returns:
            CSS string with page layout and styling
        """
```

#### Dependencies

- **Internal:**
  - `app.converter.frontmatter` - YAML parsing
  - `app.converter.styles` - CSS configuration
  - `app.utils.helpers` - Utility functions

- **External:**
  - `pypandoc` - Word generation
  - `weasyprint` - PDF generation
  - `markdown` - HTML rendering
  - `python-frontmatter` - Front matter parsing

#### Error Handling

```python
class ConversionError(Exception):
    """Raised when document conversion fails"""
    pass

class FrontMatterError(Exception):
    """Raised when front matter parsing fails"""
    pass

# Usage in converter
try:
    pypandoc.convert_text(...)
except RuntimeError as e:
    self.logger.error(f"Pandoc conversion failed: {e}")
    raise ConversionError(f"Failed to generate DOCX: {str(e)}")
```

#### Testing Requirements

```python
# test_converter.py
def test_parse_markdown_with_front_matter(converter):
    """Test parsing markdown with valid YAML front matter"""

def test_parse_markdown_without_front_matter(converter):
    """Test parsing markdown without front matter"""

def test_format_front_matter(converter):
    """Test front matter formatting"""

def test_convert_to_docx(converter, tmp_path):
    """Test DOCX conversion"""

def test_convert_to_pdf(converter, tmp_path):
    """Test PDF conversion"""

def test_convert_to_both(converter, tmp_path):
    """Test conversion to both formats"""

def test_conversion_error_handling(converter):
    """Test error handling during conversion"""
```

---

### 2. API Routes Component

**Location:** `app/api/routes.py`
**Purpose:** HTTP request handling and routing
**Type:** API Layer

#### Route Definitions

```python
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename

api_blueprint = Blueprint('api', __name__)

@api_blueprint.route('/convert', methods=['POST'])
def convert():
    """
    Convert markdown file to document format(s).

    Accepts: multipart/form-data
    Parameters:
        - file: Markdown file (required)
        - format: Output format (docx|pdf|both, default: both)

    Returns:
        JSON response with conversion details or binary file

    Status Codes:
        200: Success
        400: Invalid request
        413: File too large
        415: Invalid file type
        500: Conversion error
    """
    # 1. Validate request
    validation_error = validate_upload(request)
    if validation_error:
        return jsonify(validation_error), validation_error['status']

    # 2. Extract parameters
    file = request.files['file']
    format_type = request.form.get('format', 'both')
    filename = secure_filename(file.filename)

    # 3. Read content
    try:
        content = file.read().decode('utf-8')
    except UnicodeDecodeError:
        return jsonify({
            'error': 'File must be UTF-8 encoded',
            'code': 'INVALID_ENCODING',
            'status': 422
        }), 422

    # 4. Convert
    converter = MarkdownConverter()
    job_id = generate_job_id()

    try:
        if format_type == 'both':
            # Return JSON with download URLs
            docx_path, pdf_path = converter.convert_to_both(
                content,
                Path(filename).stem,
                get_job_directory(job_id)
            )
            return jsonify(build_response(job_id, docx_path, pdf_path))

        elif format_type == 'docx':
            # Return binary file directly
            output_path = get_output_path(job_id, filename, 'docx')
            converter.convert_to_docx(content, output_path)
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"{Path(filename).stem}.docx",
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

        elif format_type == 'pdf':
            # Return binary file directly
            output_path = get_output_path(job_id, filename, 'pdf')
            converter.convert_to_pdf(content, output_path)
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"{Path(filename).stem}.pdf",
                mimetype='application/pdf'
            )

    except ConversionError as e:
        logger.error(f"Conversion failed: {e}")
        return jsonify({
            'error': 'Document conversion failed',
            'code': 'CONVERSION_ERROR',
            'status': 500
        }), 500


@api_blueprint.route('/download/<job_id>/<format>', methods=['GET'])
def download(job_id: str, format: str):
    """
    Download converted file.

    Args:
        job_id: Unique job identifier
        format: File format (docx or pdf)

    Returns:
        Binary file stream

    Status Codes:
        200: Success
        404: File not found
        410: File expired
    """
    # Validate format
    if format not in ['docx', 'pdf']:
        return jsonify({
            'error': 'Invalid format',
            'code': 'INVALID_FORMAT',
            'status': 400
        }), 400

    # Locate file
    file_path = get_file_path(job_id, format)

    if not os.path.exists(file_path):
        # Check if expired
        if is_expired(job_id):
            return jsonify({
                'error': 'File has expired and been deleted',
                'code': 'FILE_EXPIRED',
                'status': 410
            }), 410
        else:
            return jsonify({
                'error': 'File not found',
                'code': 'FILE_NOT_FOUND',
                'status': 404
            }), 404

    # Send file
    return send_file(
        file_path,
        as_attachment=True,
        download_name=os.path.basename(file_path),
        mimetype=get_mimetype(format)
    )
```

#### Response Builders

```python
def build_response(job_id: str, docx_path: str, pdf_path: str) -> dict:
    """
    Build JSON response for successful conversion.

    Args:
        job_id: Unique job identifier
        docx_path: Path to generated DOCX
        pdf_path: Path to generated PDF

    Returns:
        Response dictionary
    """
    return {
        'status': 'success',
        'job_id': job_id,
        'filename': Path(docx_path).stem,
        'formats': {
            'docx': {
                'download_url': f'/api/download/{job_id}/docx',
                'filename': os.path.basename(docx_path),
                'size': os.path.getsize(docx_path),
                'mimetype': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            },
            'pdf': {
                'download_url': f'/api/download/{job_id}/pdf',
                'filename': os.path.basename(pdf_path),
                'size': os.path.getsize(pdf_path),
                'mimetype': 'application/pdf'
            }
        },
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
```

---

### 3. Validation Component

**Location:** `app/api/validators.py`
**Purpose:** Request validation and sanitization
**Type:** API Layer

#### Validator Functions

```python
def validate_upload(request) -> Optional[dict]:
    """
    Validate file upload request.

    Args:
        request: Flask request object

    Returns:
        Error dict if validation fails, None if valid
    """
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
            'allowed_types': ['.md', '.markdown', '.txt'],
            'received_type': Path(file.filename).suffix
        }

    # Validate format parameter
    format_type = request.form.get('format', 'both')
    format_error = validate_format(format_type)
    if format_error:
        return format_error

    return None  # Valid


def allowed_file(filename: str) -> bool:
    """
    Check if file extension is allowed.

    Args:
        filename: Filename to check

    Returns:
        True if allowed, False otherwise
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def validate_format(format_str: str) -> Optional[dict]:
    """
    Validate output format parameter.

    Args:
        format_str: Format string to validate

    Returns:
        Error dict if invalid, None if valid
    """
    if format_str not in ['docx', 'pdf', 'both']:
        return {
            'error': 'Invalid format. Allowed: docx, pdf, both',
            'code': 'INVALID_FORMAT',
            'status': 400,
            'allowed_formats': ['docx', 'pdf', 'both'],
            'received_format': format_str
        }
    return None
```

---

## Frontend Components

### 4. Application Controller

**Location:** `static/js/app.js`
**Purpose:** Main application logic and UI coordination
**Type:** Frontend Controller

#### Application Structure

```javascript
/**
 * Main application controller
 * Coordinates UI interactions, API calls, and state management
 */
class MarkdownConverterApp {
    constructor() {
        this.apiClient = new APIClient();
        this.currentState = 'IDLE';
        this.currentFile = null;
        this.conversionResult = null;

        this.init();
    }

    /**
     * Initialize application
     * Set up event listeners and UI
     */
    init() {
        this.setupEventListeners();
        this.setupDragDrop();
        this.showSection('upload');
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // File input
        document.getElementById('file-input')
            .addEventListener('change', (e) => this.handleFileSelect(e));

        // Format selection
        document.querySelectorAll('input[name="format"]')
            .forEach(radio => radio.addEventListener('change', () => this.updateFormatSelection()));

        // Convert button
        document.getElementById('convert-btn')
            .addEventListener('click', () => this.handleConvert());

        // Download buttons
        document.getElementById('download-docx')
            .addEventListener('click', () => this.handleDownload('docx'));
        document.getElementById('download-pdf')
            .addEventListener('click', () => this.handleDownload('pdf'));

        // Reset button
        document.getElementById('reset-btn')
            .addEventListener('click', () => this.reset());
    }

    /**
     * Handle file selection
     * @param {Event} event - File input change event
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.currentFile = file;
        this.currentState = 'FILE_SELECTED';
        this.updateUI();
    }

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
        // Check extension
        const validExtensions = ['.md', '.markdown', '.txt'];
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validExtensions.includes(extension)) {
            return {
                valid: false,
                error: `Invalid file type. Please upload a ${validExtensions.join(', ')} file.`
            };
        }

        // Check size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File too large. Maximum size is 10 MB. Your file is ${this.formatFileSize(file.size)}.`
            };
        }

        return { valid: true };
    }

    /**
     * Handle convert button click
     */
    async handleConvert() {
        if (!this.currentFile) {
            this.showError('Please select a file first');
            return;
        }

        this.currentState = 'UPLOADING';
        this.updateUI();

        try {
            const format = document.querySelector('input[name="format"]:checked').value;
            const result = await this.apiClient.convertMarkdown(this.currentFile, format);

            this.conversionResult = result;
            this.currentState = 'COMPLETE';
            this.updateUI();

        } catch (error) {
            this.currentState = 'ERROR';
            this.showError(error.message);
        }
    }

    /**
     * Handle download button click
     * @param {string} format - Format to download (docx or pdf)
     */
    async handleDownload(format) {
        if (!this.conversionResult) return;

        try {
            const downloadUrl = this.conversionResult.formats[format].download_url;
            const filename = this.conversionResult.formats[format].filename;

            await this.apiClient.downloadFile(downloadUrl, filename);

        } catch (error) {
            this.showError(`Download failed: ${error.message}`);
        }
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        switch (this.currentState) {
            case 'IDLE':
                this.showSection('upload');
                break;

            case 'FILE_SELECTED':
                this.showFileInfo();
                document.getElementById('convert-btn').disabled = false;
                break;

            case 'UPLOADING':
                this.showSection('progress');
                this.updateProgress('Uploading file...', 25);
                break;

            case 'PROCESSING':
                this.updateProgress('Converting document...', 50);
                break;

            case 'COMPLETE':
                this.showSection('download');
                this.displayResults();
                break;

            case 'ERROR':
                this.showSection('error');
                break;
        }
    }

    /**
     * Show specific UI section
     * @param {string} sectionId - Section to show
     */
    showSection(sectionId) {
        const sections = ['upload', 'progress', 'download', 'error'];
        sections.forEach(id => {
            const element = document.getElementById(`${id}-section`);
            if (element) {
                element.style.display = id === sectionId ? 'block' : 'none';
            }
        });
    }

    /**
     * Display error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
        this.showSection('error');
    }

    /**
     * Reset application to initial state
     */
    reset() {
        this.currentState = 'IDLE';
        this.currentFile = null;
        this.conversionResult = null;
        document.getElementById('file-input').value = '';
        this.updateUI();
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MarkdownConverterApp();
});
```

---

### 5. API Client Component

**Location:** `static/js/api.js`
**Purpose:** HTTP communication with backend API
**Type:** Frontend Service

#### API Client Class

```javascript
/**
 * API client for markdown converter backend
 * Handles all HTTP communication with the server
 */
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    /**
     * Convert markdown file
     * @param {File} file - Markdown file
     * @param {string} format - Output format (docx|pdf|both)
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
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        // Handle different response types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // Binary file response (single format)
            return await this.handleBinaryResponse(response, format);
        }
    }

    /**
     * Download converted file
     * @param {string} url - Download URL
     * @param {string} filename - Filename for download
     */
    async downloadFile(url, filename) {
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }

        const blob = await response.blob();
        this.triggerDownload(blob, filename);
    }

    /**
     * Handle binary file response
     * @param {Response} response - Fetch response
     * @param {string} format - File format
     * @returns {Promise<Object>} Download result
     */
    async handleBinaryResponse(response, format) {
        const blob = await response.blob();
        const filename = this.getFilenameFromHeader(response) ||
                        `document.${format}`;
        this.triggerDownload(blob, filename);
        return { filename, format };
    }

    /**
     * Extract filename from Content-Disposition header
     * @param {Response} response - Fetch response
     * @returns {string|null} Filename or null
     */
    getFilenameFromHeader(response) {
        const disposition = response.headers.get('Content-Disposition');
        if (!disposition) return null;

        const match = disposition.match(/filename="(.+)"/);
        return match ? match[1] : null;
    }

    /**
     * Trigger browser download
     * @param {Blob} blob - File blob
     * @param {string} filename - Filename
     */
    triggerDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * Check service health
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        const response = await fetch(`${this.baseURL}/health`);
        return await response.json();
    }
}
```

---

## Utility Components

### 6. File Handler Component

**Location:** `app/utils/file_handler.py`
**Purpose:** File operations and management
**Type:** Utility

```python
"""File handling utilities"""
import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta

def generate_job_id() -> str:
    """Generate unique job identifier"""
    return str(uuid.uuid4())

def get_job_directory(job_id: str) -> str:
    """Get directory path for job"""
    base_dir = Path(current_app.config['CONVERTED_FOLDER'])
    job_dir = base_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return str(job_dir)

def cleanup_old_files(max_age_hours: int = 24):
    """Delete files older than max_age_hours"""
    converted_dir = Path(current_app.config['CONVERTED_FOLDER'])
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

    for job_dir in converted_dir.iterdir():
        if not job_dir.is_dir():
            continue

        # Check directory age
        dir_mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)
        if dir_mtime < cutoff_time:
            shutil.rmtree(job_dir)
            logger.info(f"Deleted expired job directory: {job_dir}")
```

---

## Component Integration

### Dependency Injection Pattern

```python
# app/__init__.py
def create_app(config_name='default'):
    app = Flask(__name__)

    # Initialize converter (singleton pattern)
    template_path = app.config.get('TEMPLATE_PATH')
    converter = MarkdownConverter(template_path=template_path)

    # Make available to routes
    app.converter = converter

    return app

# app/api/routes.py
@api_blueprint.route('/convert', methods=['POST'])
def convert():
    converter = current_app.converter
    # Use converter...
```

---

## Conclusion

This component design provides:

1. **Clear Interfaces:** Well-defined public APIs for each component
2. **Separation of Concerns:** Each component has a single responsibility
3. **Testability:** All components can be unit tested independently
4. **Maintainability:** Clear documentation and structure
5. **Extensibility:** Easy to add new features and components

Developers in the Code phase should implement components exactly as specified to ensure consistency and maintainability.

---

## References

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [API Specification](./API_SPECIFICATION.md)
- [Data Flow](./DATA_FLOW.md)
- [Project Structure](./PROJECT_STRUCTURE.md)

---

**Next Steps:**
1. Review Deployment Architecture for container configuration
2. Review Security Design for security implementation
3. Review Implementation Guide before beginning coding
