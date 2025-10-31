# Flask API Integration - Frontend Implementation Guide

## Executive Summary

This document provides comprehensive integration patterns for connecting the vanilla JavaScript frontend with the Flask backend API. It covers file upload, conversion triggering, status checking, and file download workflows with complete, production-ready code examples.

The recommended integration pattern uses:
- **FormData API** for multipart file uploads
- **Fetch API** for all HTTP requests
- **Blob API** for file downloads
- **JSON responses** for status and error handling
- **No CORS configuration** (same-origin deployment)

---

## API Endpoint Design

### Recommended API Structure

```
GET  /                          → Serve frontend (index.html)
POST /api/upload                → Upload markdown file
POST /api/convert               → Trigger conversion (upload + convert in one)
GET  /api/status/<job_id>       → Check conversion status
GET  /api/download/<file_id>    → Download converted file
GET  /api/download/<file_id>/<format> → Download specific format (docx/pdf)
```

### Alternative: Simplified API

For a simpler implementation, combine upload and convert:

```
POST /api/convert               → Upload + convert in one request
GET  /api/download/<job_id>/docx → Download Word document
GET  /api/download/<job_id>/pdf  → Download PDF document
```

---

## Flask Backend Implementation

### Basic Flask Setup

```python
from flask import Flask, request, send_file, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
import uuid
from pathlib import Path

app = Flask(__name__, static_folder='static')

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'converted'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size
ALLOWED_EXTENSIONS = {'md', 'markdown'}

# Ensure directories exist
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
Path(app.config['OUTPUT_FOLDER']).mkdir(exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve static files (CSS, JS)
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)
```

### File Upload Endpoint

```python
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload a markdown file
    Returns: JSON with file_id and filename
    """
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        # Check if file was selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload a .md or .markdown file'}), 400

        # Generate unique file ID
        file_id = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)

        # Save file
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.md")
        file.save(upload_path)

        return jsonify({
            'success': True,
            'file_id': file_id,
            'filename': original_filename,
            'message': 'File uploaded successfully'
        }), 200

    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Upload failed. Please try again.'}), 500
```

### Convert Endpoint (Combined Upload + Convert)

```python
@app.route('/api/convert', methods=['POST'])
def convert_file():
    """
    Upload and convert markdown file to Word and/or PDF
    Form data:
        - file: markdown file
        - format: 'docx', 'pdf', or 'both' (optional, default: 'both')
    Returns: JSON with job_id and conversion status
    """
    try:
        # Validate file upload
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload a .md or .markdown file'}), 400

        # Get conversion format
        output_format = request.form.get('format', 'both')  # docx, pdf, or both
        if output_format not in ['docx', 'pdf', 'both']:
            return jsonify({'error': 'Invalid format. Choose docx, pdf, or both'}), 400

        # Generate job ID
        job_id = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)
        base_filename = os.path.splitext(original_filename)[0]

        # Save uploaded file
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}.md")
        file.save(upload_path)

        # Perform conversion
        results = {}

        if output_format in ['docx', 'both']:
            docx_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{job_id}.docx")
            # TODO: Call your markdown to Word conversion function
            # convert_md_to_docx(upload_path, docx_path)
            results['docx'] = f"/api/download/{job_id}/docx"

        if output_format in ['pdf', 'both']:
            pdf_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{job_id}.pdf")
            # TODO: Call your markdown to PDF conversion function
            # convert_md_to_pdf(upload_path, pdf_path)
            results['pdf'] = f"/api/download/{job_id}/pdf"

        return jsonify({
            'success': True,
            'job_id': job_id,
            'filename': original_filename,
            'downloads': results,
            'message': 'Conversion completed successfully'
        }), 200

    except Exception as e:
        app.logger.error(f"Conversion error: {str(e)}")
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500
```

### Download Endpoint

```python
@app.route('/api/download/<job_id>/<format>', methods=['GET'])
def download_file(job_id, format):
    """
    Download converted file
    Args:
        job_id: unique identifier for the conversion job
        format: 'docx' or 'pdf'
    Returns: File download
    """
    try:
        # Validate format
        if format not in ['docx', 'pdf']:
            return jsonify({'error': 'Invalid format. Choose docx or pdf'}), 400

        # Construct file path
        filename = f"{job_id}.{format}"
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)

        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        # Determine MIME type
        mime_types = {
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'pdf': 'application/pdf'
        }

        # Send file
        return send_file(
            file_path,
            mimetype=mime_types[format],
            as_attachment=True,
            download_name=f"converted.{format}"
        )

    except Exception as e:
        app.logger.error(f"Download error: {str(e)}")
        return jsonify({'error': 'Download failed'}), 500
```

### Error Handler

```python
@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        'error': 'File is too large. Maximum size is 10MB'
    }), 413

@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors"""
    app.logger.error(f"Internal error: {str(error)}")
    return jsonify({
        'error': 'An internal error occurred. Please try again.'
    }), 500
```

---

## Frontend JavaScript Implementation

### Complete API Client

```javascript
// api.js - API client module

class MarkdownConverterAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;  // Empty string for same-origin requests
  }

  /**
   * Upload and convert markdown file
   * @param {File} file - The markdown file to convert
   * @param {string} format - Output format: 'docx', 'pdf', or 'both'
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise} - Conversion result
   */
  async convertFile(file, format = 'both', onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    try {
      // Create XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
      if (onProgress) {
        return this._uploadWithProgress('/api/convert', formData, onProgress);
      }

      // Standard fetch for simple uploads
      const response = await fetch(`${this.baseURL}/api/convert`, {
        method: 'POST',
        body: formData
        // NOTE: Do NOT set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }

      return await response.json();

    } catch (error) {
      console.error('Conversion error:', error);
      throw error;
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   * @private
   */
  _uploadWithProgress(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Send request
      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.send(formData);
    });
  }

  /**
   * Download converted file
   * @param {string} jobId - The job identifier
   * @param {string} format - File format: 'docx' or 'pdf'
   * @param {string} filename - Optional custom filename
   */
  async downloadFile(jobId, format, filename = null) {
    try {
      const response = await fetch(`${this.baseURL}/api/download/${jobId}/${format}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || `converted.${format}`;

      // Trigger download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} - Validation result {valid: boolean, error: string}
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validExtensions = ['.md', '.markdown'];

    // Check if file exists
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return { valid: false, error: 'Please upload a .md or .markdown file' };
    }

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    // Check if file is empty
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }
}

// Export singleton instance
const api = new MarkdownConverterAPI();
```

### Main Application Logic

```javascript
// app.js - Main application logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileNameDisplay = document.getElementById('fileName');
  const convertBtn = document.getElementById('convertBtn');
  const formatSelect = document.getElementById('formatSelect');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const statusMessage = document.getElementById('statusMessage');
  const downloadContainer = document.getElementById('downloadContainer');
  const downloadDocxBtn = document.getElementById('downloadDocx');
  const downloadPdfBtn = document.getElementById('downloadPdf');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');

  let selectedFile = null;
  let currentJobId = null;

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }, false);
  });

  // Handle dropped files
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }, false);

  // Handle click to upload
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Handle file selection
  function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file
    const validation = api.validateFile(file);
    if (!validation.valid) {
      showError(validation.error);
      return;
    }

    // Store selected file
    selectedFile = file;

    // Update UI
    fileNameDisplay.textContent = file.name;
    fileNameDisplay.classList.remove('hidden');
    convertBtn.disabled = false;
    hideError();
    hideDownloads();
  }

  // Handle convert button click
  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      showError('Please select a file first');
      return;
    }

    try {
      // Disable button and show progress
      convertBtn.disabled = true;
      showProgress('Uploading file...');
      hideError();
      hideDownloads();

      const format = formatSelect.value;

      // Upload and convert
      const result = await api.convertFile(
        selectedFile,
        format,
        (progress) => {
          updateProgress(progress, 'Uploading...');
        }
      );

      // Update UI for success
      updateProgress(100, 'Conversion complete!');
      currentJobId = result.job_id;

      // Show download buttons
      setTimeout(() => {
        hideProgress();
        showDownloads(result.downloads, format);
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      showError(error.message || 'Conversion failed. Please try again.');
      hideProgress();
      convertBtn.disabled = false;
    }
  });

  // Handle download buttons
  downloadDocxBtn.addEventListener('click', () => {
    downloadFile('docx');
  });

  downloadPdfBtn.addEventListener('click', () => {
    downloadFile('pdf');
  });

  // Download file
  async function downloadFile(format) {
    if (!currentJobId) return;

    try {
      const baseFilename = selectedFile.name.replace(/\.(md|markdown)$/i, '');
      await api.downloadFile(currentJobId, format, `${baseFilename}.${format}`);
    } catch (error) {
      showError(`Download failed: ${error.message}`);
    }
  }

  // UI Helper Functions
  function showProgress(message) {
    progressContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    updateProgress(0);
  }

  function hideProgress() {
    progressContainer.classList.add('hidden');
  }

  function updateProgress(percent, message = null) {
    progressBar.style.width = `${percent}%`;
    if (message) {
      statusMessage.textContent = message;
    }
  }

  function showDownloads(downloads, format) {
    downloadContainer.classList.remove('hidden');

    if (format === 'docx' || format === 'both') {
      downloadDocxBtn.classList.remove('hidden');
    } else {
      downloadDocxBtn.classList.add('hidden');
    }

    if (format === 'pdf' || format === 'both') {
      downloadPdfBtn.classList.remove('hidden');
    } else {
      downloadPdfBtn.classList.add('hidden');
    }
  }

  function hideDownloads() {
    downloadContainer.classList.add('hidden');
  }

  function showError(message) {
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = message;
  }

  function hideError() {
    errorContainer.classList.add('hidden');
  }
});
```

---

## File Upload Patterns

### Pattern 1: FormData with Fetch (Simple)

**When to Use**: Standard file uploads without progress tracking

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return await response.json();
}
```

### Pattern 2: XMLHttpRequest with Progress (Advanced)

**When to Use**: When you need upload progress tracking

```javascript
function uploadFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}
```

### Pattern 3: Chunked Upload (Large Files)

**When to Use**: Files larger than 10MB, resumable uploads

```javascript
async function uploadFileInChunks(file, chunkSize = 1024 * 1024) {
  const chunks = Math.ceil(file.size / chunkSize);
  const uploadId = generateUploadId();

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', i);
    formData.append('totalChunks', chunks);

    await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData
    });
  }

  // Finalize upload
  await fetch('/api/upload-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId })
  });
}
```

---

## File Download Patterns

### Pattern 1: Blob + Object URL (Recommended)

**Advantages**: Works with all file types, proper cleanup

```javascript
async function downloadFile(url, filename) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  // Cleanup
  window.URL.revokeObjectURL(objectUrl);
  document.body.removeChild(a);
}
```

### Pattern 2: Direct Link (Simple)

**Advantages**: Simple, no JavaScript needed
**Disadvantages**: No error handling, opens in new tab for some file types

```html
<a href="/api/download/abc123/docx" download="document.docx">
  Download Word Document
</a>
```

### Pattern 3: With Progress Tracking

```javascript
async function downloadFileWithProgress(url, filename, onProgress) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const reader = response.body.getReader();
  const contentLength = +response.headers.get('Content-Length');

  let receivedLength = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (contentLength) {
      const percent = (receivedLength / contentLength) * 100;
      onProgress(percent);
    }
  }

  const blob = new Blob(chunks);
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(objectUrl);
}
```

---

## Error Handling Strategies

### Backend Error Responses (Flask)

Consistent error response format:

```python
def error_response(message, status_code=400):
    return jsonify({
        'error': message,
        'success': False
    }), status_code

# Usage
if not file:
    return error_response('No file provided', 400)
```

### Frontend Error Handling

```javascript
async function safeAPICall(apiFunction, fallbackMessage) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API Error:', error);

    // Check if error has a message
    const message = error.message || fallbackMessage;

    // Display to user
    showErrorNotification(message);

    // Re-throw for caller to handle if needed
    throw error;
  }
}

// Usage
try {
  await safeAPICall(
    () => api.convertFile(file, 'docx'),
    'Conversion failed. Please try again.'
  );
} catch (error) {
  // Additional error handling if needed
}
```

### User-Friendly Error Messages

```javascript
const ERROR_MESSAGES = {
  // Network errors
  'Failed to fetch': 'Unable to connect to server. Please check your internet connection.',
  'NetworkError': 'Network error occurred. Please try again.',

  // File errors
  'File too large': 'File size exceeds 10MB limit. Please upload a smaller file.',
  'Invalid file type': 'Please upload a .md or .markdown file.',

  // Server errors
  '500': 'Server error occurred. Please try again later.',
  '413': 'File is too large. Maximum size is 10MB.',
  '404': 'Requested resource not found.',

  // Generic
  'default': 'An error occurred. Please try again.'
};

function getUserFriendlyError(error) {
  const errorText = error.message || error.toString();

  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorText.includes(key)) {
      return message;
    }
  }

  return ERROR_MESSAGES.default;
}
```

---

## CORS Configuration (If Needed)

### When CORS is Required

Only if deploying frontend and backend separately (NOT recommended for this project).

### Flask CORS Setup

```python
from flask_cors import CORS

# Allow all origins (development only)
CORS(app)

# Production: Specific origins
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-frontend-domain.com"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})
```

### Frontend with CORS

```javascript
// No changes needed to fetch calls
// Browser handles CORS automatically

fetch('https://api.example.com/upload', {
  method: 'POST',
  body: formData
  // Browser adds Origin header automatically
});
```

---

## Testing the Integration

### Manual Testing Checklist

- [ ] Upload a valid .md file
- [ ] Upload an invalid file type (should show error)
- [ ] Upload a file larger than 10MB (should show error)
- [ ] Upload with no file selected (should show error)
- [ ] Convert to Word only
- [ ] Convert to PDF only
- [ ] Convert to both formats
- [ ] Download Word document
- [ ] Download PDF document
- [ ] Test on mobile device
- [ ] Test with slow network (check progress bar)
- [ ] Test error scenarios (server down, network error)

### Automated Testing (Optional)

**Frontend Tests** (using Jest):

```javascript
describe('MarkdownConverterAPI', () => {
  test('validates file correctly', () => {
    const api = new MarkdownConverterAPI();

    const validFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    expect(api.validateFile(validFile).valid).toBe(true);

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    expect(api.validateFile(invalidFile).valid).toBe(false);
  });
});
```

**Backend Tests** (using pytest):

```python
def test_upload_endpoint(client):
    data = {
        'file': (io.BytesIO(b'# Test Markdown'), 'test.md')
    }
    response = client.post('/api/upload', data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    assert 'file_id' in response.json

def test_invalid_file_type(client):
    data = {
        'file': (io.BytesIO(b'test'), 'test.txt')
    }
    response = client.post('/api/upload', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'error' in response.json
```

---

## Performance Optimization

### 1. Debounce File Validation

```javascript
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const validateFileDebounced = debounce((file) => {
  const validation = api.validateFile(file);
  if (!validation.valid) {
    showError(validation.error);
  }
}, 300);
```

### 2. Cancel Previous Requests

```javascript
let currentUploadController = null;

async function uploadFile(file) {
  // Cancel previous upload if still in progress
  if (currentUploadController) {
    currentUploadController.abort();
  }

  currentUploadController = new AbortController();

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: currentUploadController.signal
    });

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Upload cancelled');
    } else {
      throw error;
    }
  }
}
```

### 3. Lazy Load Preview Libraries

Only load markdown preview libraries when needed:

```javascript
let marked = null;
let DOMPurify = null;

async function loadPreviewLibraries() {
  if (!marked) {
    const markedModule = await import('https://cdn.jsdelivr.net/npm/marked@12.0.0/+esm');
    marked = markedModule.marked;

    const purifyModule = await import('https://cdn.jsdelivr.net/npm/dompurify@3.0.9/+esm');
    DOMPurify = purifyModule.default;
  }
}

// Load when file is selected
fileInput.addEventListener('change', async () => {
  await loadPreviewLibraries();
  // Now can show preview
});
```

---

## Security Best Practices

### 1. Input Validation

**Always validate on both client and server**:

```javascript
// Client-side (UX)
function validateFileClient(file) {
  // Fast feedback for user
  return api.validateFile(file);
}

// Server-side (Security)
@app.route('/api/upload', methods=['POST'])
def upload_file():
    # Always validate here - never trust client
    if not allowed_file(file.filename):
        return error_response('Invalid file type', 400)
```

### 2. Filename Sanitization

```python
from werkzeug.utils import secure_filename

# ALWAYS use secure_filename
filename = secure_filename(file.filename)

# Additional sanitization
import re
filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
```

### 3. Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/upload', methods=['POST'])
@limiter.limit("10 per minute")
def upload_file():
    # Handle upload
    pass
```

### 4. File Size Limits

```python
# Flask config
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB

# JavaScript validation
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

---

## Common Integration Issues

### Issue 1: FormData Content-Type

**Problem**: Setting Content-Type header manually breaks file upload

**Solution**: Let browser set it automatically
```javascript
// WRONG
fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data'  // DON'T DO THIS
  },
  body: formData
});

// CORRECT
fetch('/api/upload', {
  method: 'POST',
  body: formData  // Browser sets Content-Type with boundary
});
```

### Issue 2: File Download Not Working

**Problem**: Using `response.json()` instead of `response.blob()`

**Solution**:
```javascript
// WRONG
const data = await response.json();  // Errors for binary data

// CORRECT
const blob = await response.blob();
const url = URL.createObjectURL(blob);
```

### Issue 3: CORS Errors

**Problem**: Frontend and backend on different origins

**Solution**: Deploy together (recommended) or configure CORS properly
```python
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

### Issue 4: Large Files Timeout

**Problem**: Default timeout too short for large file uploads

**Solution**: Increase timeout or implement chunked upload
```python
# Gunicorn config
timeout = 120  # 2 minutes

# Or use chunked upload pattern
```

---

## API Response Examples

### Success Response - Convert

```json
{
  "success": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "my-document.md",
  "downloads": {
    "docx": "/api/download/550e8400-e29b-41d4-a716-446655440000/docx",
    "pdf": "/api/download/550e8400-e29b-41d4-a716-446655440000/pdf"
  },
  "message": "Conversion completed successfully"
}
```

### Error Response - Invalid File

```json
{
  "success": false,
  "error": "Invalid file type. Please upload a .md or .markdown file"
}
```

### Error Response - File Too Large

```json
{
  "success": false,
  "error": "File is too large. Maximum size is 10MB"
}
```

### Error Response - Server Error

```json
{
  "success": false,
  "error": "Conversion failed: pandoc command not found"
}
```

---

## Complete Integration Flow

```
User Action          Frontend                API Endpoint           Backend
-----------          --------                ------------           -------
1. Select file   →   Validate file
                     Show filename
                     Enable convert button

2. Click convert →   Show progress bar  →   POST /api/convert  →   Receive file
                     Disable button                                 Validate file
                                                                    Generate job ID
                                                                    Convert to DOCX
                                                                    Convert to PDF
                                            ← JSON response     ←   Return job ID
                     Store job ID                                   and download URLs
                     Show download buttons

3. Click download →  Fetch file         →   GET /api/download/  →  Locate file
                     Create blob            <job_id>/<format>      Send file
                     Trigger download   ←   Binary response     ←   with headers
                     Save to disk
```

---

## Resource Links

### Flask Documentation
- [Flask File Uploads](https://flask.palletsprojects.com/en/stable/patterns/fileuploads/)
- [Flask send_file](https://flask.palletsprojects.com/en/stable/api/#flask.send_file)
- [Werkzeug secure_filename](https://werkzeug.palletsprojects.com/en/stable/utils/#werkzeug.utils.secure_filename)

### JavaScript APIs
- [FormData API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [Fetch API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Blob API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [File API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File)

### Stack Overflow Solutions
- [Flask send_file with JavaScript fetch](https://stackoverflow.com/questions/56546795/)
- [FormData with fetch POST](https://stackoverflow.com/questions/35192841/)
- [Download blob in JavaScript](https://stackoverflow.com/questions/62475123/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Author**: PACT Preparer - Documentation Specialist
