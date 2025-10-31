# API Specification

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document provides the complete API specification for the Markdown Converter service. The API follows RESTful principles and uses standard HTTP methods, status codes, and content types. All responses are in JSON format except for file downloads which return binary streams.

### API Base URL

**Development:** `http://localhost:8080`
**Production:** `https://[your-app].railway.app`

### API Version

**Current Version:** v1
**Versioning Strategy:** URL path versioning (future: `/api/v2/...`)

---

## Authentication and Authorization

### Current Implementation

**Authentication:** None (public API)
**Rate Limiting:** None (Railway provides basic DDoS protection)

### Future Considerations

For production at scale, consider:
- API key authentication
- Rate limiting (Flask-Limiter)
- User accounts with quota management

---

## Common Elements

### Standard Headers

**Request Headers:**
```http
Content-Type: multipart/form-data (for file uploads)
Content-Type: application/json (for JSON requests)
Accept: application/json
```

**Response Headers:**
```http
Content-Type: application/json (for API responses)
Content-Type: application/octet-stream (for file downloads)
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE_IDENTIFIER",
  "status": 400,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

### HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input or malformed request |
| 413 | Payload Too Large | File exceeds size limit |
| 415 | Unsupported Media Type | Invalid file type |
| 422 | Unprocessable Entity | Valid format but semantic errors |
| 500 | Internal Server Error | Server-side processing error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## API Endpoints

## 1. Root Endpoint

### `GET /`

Returns API information and available endpoints.

**Purpose:** API discovery and health verification

**Request:**
```http
GET / HTTP/1.1
Host: localhost:8080
Accept: application/json
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "service": "Markdown to Word/PDF Converter",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "/": "API information",
    "/health": "Health check",
    "/api/convert": "Convert markdown to document formats"
  },
  "documentation": "https://github.com/your-repo/docs/api",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**Error Responses:** None (always returns 200)

---

## 2. Health Check Endpoint

### `GET /health`

Returns service health status and dependency availability.

**Purpose:** Container health monitoring, load balancer checks

**Request:**
```http
GET /health HTTP/1.1
Host: localhost:8080
Accept: application/json
```

**Success Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "service": "md-converter",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "pandoc": "available",
    "weasyprint": "available",
    "python": "3.12.1"
  },
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**Unhealthy Response:**
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "unhealthy",
  "service": "md-converter",
  "error": "Pandoc not available",
  "dependencies": {
    "pandoc": "unavailable",
    "weasyprint": "available"
  },
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| status | string | "healthy" or "unhealthy" |
| service | string | Service identifier |
| version | string | Application version |
| uptime | integer | Seconds since service start |
| dependencies | object | Status of required dependencies |
| timestamp | string | ISO 8601 timestamp |

**Error Responses:**
- `503 Service Unavailable`: Service or dependencies unavailable

**Monitoring Integration:**
- Railway: Automatic health checks every 30 seconds
- Restart policy: 3 consecutive failures triggers restart

---

## 3. Convert Markdown Endpoint

### `POST /api/convert`

Converts a markdown file to Word (.docx) and/or PDF format.

**Purpose:** Main conversion endpoint for file processing

**Request (Multipart Form Data):**

```http
POST /api/convert HTTP/1.1
Host: localhost:8080
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="document.md"
Content-Type: text/markdown

---
title: My Document
author: John Doe
date: 2025-10-31
---

# Introduction

This is **markdown** content.
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="format"

both
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Request Parameters:**

| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| file | file | Yes | Markdown file to convert | .md, .markdown, .txt |
| format | string | No | Output format(s) | "docx", "pdf", "both" (default: "both") |

**Request Constraints:**
- Maximum file size: 10 MB
- Allowed extensions: .md, .markdown, .txt
- Allowed MIME types: text/markdown, text/x-markdown, text/plain
- File encoding: UTF-8 (recommended)

**Success Response (both formats):**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "document",
  "formats": {
    "docx": {
      "download_url": "/api/download/a1b2c3d4-e5f6-7890-abcd-ef1234567890/docx",
      "filename": "document.docx",
      "size": 45678,
      "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    "pdf": {
      "download_url": "/api/download/a1b2c3d4-e5f6-7890-abcd-ef1234567890/pdf",
      "filename": "document.pdf",
      "size": 123456,
      "mimetype": "application/pdf"
    }
  },
  "metadata": {
    "title": "My Document",
    "author": "John Doe",
    "date": "2025-10-31"
  },
  "processing_time": 2.34,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**Success Response (single format):**

```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.docx"
Content-Length: 45678

[Binary file data]
```

**Response Fields (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| status | string | "success" or "error" |
| job_id | string | Unique identifier for this conversion |
| filename | string | Original filename (without extension) |
| formats | object | Details for each generated format |
| formats.{format}.download_url | string | URL to download the file |
| formats.{format}.filename | string | Generated filename |
| formats.{format}.size | integer | File size in bytes |
| formats.{format}.mimetype | string | MIME type of the file |
| metadata | object | Extracted YAML front matter |
| processing_time | float | Time taken for conversion (seconds) |
| timestamp | string | ISO 8601 timestamp |

**Error Responses:**

**400 Bad Request - No file provided:**
```json
{
  "error": "No file provided in request",
  "code": "MISSING_FILE",
  "status": 400,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**400 Bad Request - Empty filename:**
```json
{
  "error": "No file selected",
  "code": "EMPTY_FILENAME",
  "status": 400,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**413 Payload Too Large:**
```json
{
  "error": "File size exceeds maximum limit of 10 MB",
  "code": "FILE_TOO_LARGE",
  "status": 413,
  "max_size": 10485760,
  "uploaded_size": 15728640,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**415 Unsupported Media Type:**
```json
{
  "error": "Invalid file type. Allowed types: .md, .markdown, .txt",
  "code": "INVALID_FILE_TYPE",
  "status": 415,
  "allowed_types": [".md", ".markdown", ".txt"],
  "received_type": ".docx",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**422 Unprocessable Entity - Invalid markdown:**
```json
{
  "error": "Unable to parse markdown content",
  "code": "INVALID_MARKDOWN",
  "status": 422,
  "details": "Malformed YAML front matter at line 3",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**500 Internal Server Error - Conversion failed:**
```json
{
  "error": "Document conversion failed",
  "code": "CONVERSION_ERROR",
  "status": 500,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**cURL Example:**

```bash
# Convert to both formats
curl -X POST http://localhost:8080/api/convert \
  -F "file=@document.md" \
  -F "format=both"

# Convert to DOCX only (direct download)
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

**JavaScript Example:**

```javascript
// Using FormData API
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('format', 'both');

const response = await fetch('/api/convert', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Conversion complete:', result);

// Download files
const docxResponse = await fetch(result.formats.docx.download_url);
const docxBlob = await docxResponse.blob();
// Trigger download...
```

**Python Example:**

```python
import requests

# Upload and convert
with open('document.md', 'rb') as f:
    files = {'file': f}
    data = {'format': 'both'}
    response = requests.post(
        'http://localhost:8080/api/convert',
        files=files,
        data=data
    )

result = response.json()
print(f"Job ID: {result['job_id']}")

# Download DOCX
docx_url = result['formats']['docx']['download_url']
docx_response = requests.get(f"http://localhost:8080{docx_url}")
with open('output.docx', 'wb') as f:
    f.write(docx_response.content)
```

---

## 4. Download Converted File Endpoint

### `GET /api/download/<job_id>/<format>`

Downloads a previously converted file.

**Purpose:** Retrieve converted files using job ID from conversion response

**Request:**
```http
GET /api/download/a1b2c3d4-e5f6-7890-abcd-ef1234567890/docx HTTP/1.1
Host: localhost:8080
Accept: application/octet-stream
```

**URL Parameters:**

| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| job_id | string | Yes | Job identifier from conversion | UUID format |
| format | string | Yes | File format to download | "docx" or "pdf" |

**Success Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="document.docx"
Content-Length: 45678
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0

[Binary file data]
```

**Response Headers:**

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Type | application/vnd...document (DOCX) or application/pdf | File MIME type |
| Content-Disposition | attachment; filename="..." | Triggers browser download |
| Content-Length | File size in bytes | File size |
| Cache-Control | no-cache, no-store, must-revalidate | Prevent caching |

**Error Responses:**

**404 Not Found - Job not found:**
```json
{
  "error": "Conversion job not found",
  "code": "JOB_NOT_FOUND",
  "status": 404,
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**404 Not Found - File not found:**
```json
{
  "error": "Converted file not found or expired",
  "code": "FILE_NOT_FOUND",
  "status": 404,
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "format": "docx",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**410 Gone - File expired:**
```json
{
  "error": "File has expired and been deleted",
  "code": "FILE_EXPIRED",
  "status": 410,
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiration_policy": "24 hours",
  "timestamp": "2025-10-31T10:30:00Z"
}
```

**cURL Example:**

```bash
# Download DOCX file
curl -X GET http://localhost:8080/api/download/a1b2c3d4/docx \
  --output document.docx

# Download PDF file
curl -X GET http://localhost:8080/api/download/a1b2c3d4/pdf \
  --output document.pdf
```

**JavaScript Example:**

```javascript
// Fetch and download file
async function downloadFile(jobId, format) {
  const response = await fetch(`/api/download/${jobId}/${format}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `document.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Usage
downloadFile('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'docx');
```

---

## File Lifecycle and Temporary Storage

### Storage Policy

**Location:** `/tmp/converted/<job_id>/`
**Retention:** 24 hours
**Cleanup:** Automatic background task

**Lifecycle:**

```
Upload → Convert → Store → Download → Cleanup (24h)
                                │
                                └─→ Multiple downloads allowed
```

**Storage Structure:**

```
/tmp/
└── converted/
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
    │   ├── document.docx
    │   └── document.pdf
    ├── b2c3d4e5-f6a7-8901-bcde-f12345678901/
    │   └── report.pdf
    └── ... (auto-cleaned after 24 hours)
```

---

## Rate Limiting (Future Implementation)

### Recommended Rate Limits

| Endpoint | Rate Limit | Window | Burst |
|----------|-----------|--------|-------|
| GET / | 100 req/min | 1 minute | 20 |
| GET /health | 30 req/min | 1 minute | 10 |
| POST /api/convert | 10 req/min | 1 minute | 3 |
| GET /api/download/* | 20 req/min | 1 minute | 5 |

**Rate Limit Headers (Future):**

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1635777600
```

**Rate Limit Exceeded Response:**

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "limit": 10,
  "window": 60,
  "retry_after": 42,
  "timestamp": "2025-10-31T10:30:00Z"
}
```

---

## CORS Configuration

### Current Policy

**Monolithic Deployment:** No CORS needed (same-origin)

### Future Separate Frontend Policy

If frontend is deployed separately:

```python
from flask_cors import CORS

# Allow specific origins
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://your-frontend.railway.app",
            "http://localhost:3000"  # Development
        ],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600
    }
})
```

**Allowed Origins:** Configurable via environment variable
**Allowed Methods:** GET, POST
**Allowed Headers:** Content-Type, Accept
**Credentials:** Not allowed (no cookies/auth)

---

## API Versioning Strategy

### Current Version

**Version:** v1 (implicit)
**Path:** `/api/*` (no version in path)

### Future Versioning

When breaking changes are needed:

**v2 Introduction:**
```
/api/v2/convert  (new version)
/api/convert     (legacy, v1 implicit)
```

**Deprecation Policy:**
1. Announce deprecation 6 months in advance
2. Support both versions for 12 months
3. Add deprecation headers:
   ```http
   Deprecation: true
   Sunset: Wed, 31 Oct 2026 23:59:59 GMT
   Link: </api/v2/convert>; rel="successor-version"
   ```

---

## Error Codes Reference

### Complete Error Code List

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| MISSING_FILE | 400 | No file in request | Include file in form data |
| EMPTY_FILENAME | 400 | File has no name | Select a valid file |
| INVALID_FORMAT | 400 | Invalid format parameter | Use "docx", "pdf", or "both" |
| FILE_TOO_LARGE | 413 | File exceeds 10MB | Reduce file size |
| INVALID_FILE_TYPE | 415 | Wrong file extension | Use .md or .markdown |
| INVALID_MARKDOWN | 422 | Malformed markdown | Fix markdown syntax |
| INVALID_FRONTMATTER | 422 | Malformed YAML | Fix YAML front matter |
| CONVERSION_ERROR | 500 | Conversion failed | Try again or contact support |
| PANDOC_ERROR | 500 | Pandoc unavailable | Service issue, retry later |
| WEASYPRINT_ERROR | 500 | WeasyPrint unavailable | Service issue, retry later |
| JOB_NOT_FOUND | 404 | Job ID doesn't exist | Check job ID |
| FILE_NOT_FOUND | 404 | File not found | File may have expired |
| FILE_EXPIRED | 410 | File deleted (>24h) | Re-convert the document |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests | Wait and retry |
| SERVICE_UNAVAILABLE | 503 | Service down | Retry later |

---

## Testing the API

### Postman Collection

**Import this collection for testing:**

```json
{
  "info": {
    "name": "MD Converter API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Convert Markdown",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": "document.md"
            },
            {
              "key": "format",
              "value": "both",
              "type": "text"
            }
          ]
        },
        "url": "{{base_url}}/api/convert"
      }
    }
  ]
}
```

### Test Cases

**Happy Path:**
```bash
# 1. Check health
curl http://localhost:8080/health

# 2. Convert document
curl -X POST http://localhost:8080/api/convert \
  -F "file=@test.md" \
  -F "format=both"

# 3. Download files
curl -X GET http://localhost:8080/api/download/{job_id}/docx \
  --output test.docx
```

**Error Cases:**
```bash
# Missing file
curl -X POST http://localhost:8080/api/convert

# Invalid file type
curl -X POST http://localhost:8080/api/convert \
  -F "file=@test.txt"

# File too large (create 11MB file)
dd if=/dev/zero of=large.md bs=1M count=11
curl -X POST http://localhost:8080/api/convert \
  -F "file=@large.md"
```

---

## Performance Considerations

### Response Times (Target)

| Endpoint | Target | P95 | P99 |
|----------|--------|-----|-----|
| GET / | < 50ms | 100ms | 150ms |
| GET /health | < 50ms | 100ms | 150ms |
| POST /api/convert | < 5s | 8s | 10s |
| GET /api/download/* | < 500ms | 1s | 2s |

### Timeout Configuration

```python
# Gunicorn timeout
timeout = 30  # 30 seconds

# Flask request timeout
REQUEST_TIMEOUT = 30  # seconds
```

**Client Recommendations:**
- Set request timeout: 30 seconds minimum
- Implement retry logic with exponential backoff
- Show progress indicators for uploads > 1MB

---

## API Evolution and Compatibility

### Breaking Changes (Require New Version)

- Removing endpoints
- Changing required parameters
- Changing response structure
- Changing error codes

### Non-Breaking Changes (Same Version)

- Adding optional parameters
- Adding new endpoints
- Adding response fields
- Improving error messages

### Deprecation Process

1. **Announcement:** 6 months notice via:
   - API documentation
   - Response headers
   - Email notifications (if auth added)

2. **Deprecation Headers:**
   ```http
   Deprecation: true
   Sunset: Wed, 31 Oct 2026 23:59:59 GMT
   Link: </api/v2/convert>; rel="successor-version"
   ```

3. **Support Period:** 12 months minimum

4. **Removal:** After sunset date

---

## API Security Best Practices

### Request Security

1. **Input Validation:**
   - File type checking (extension + MIME type)
   - File size limits (10MB)
   - Filename sanitization (werkzeug.secure_filename)

2. **Content Security:**
   - No execution of uploaded files
   - Isolated temporary storage
   - Automatic cleanup

3. **Rate Limiting:**
   - Implement Flask-Limiter (future)
   - Per-IP or per-user limits

### Response Security

1. **Security Headers:**
   ```python
   @app.after_request
   def add_security_headers(response):
       response.headers['X-Content-Type-Options'] = 'nosniff'
       response.headers['X-Frame-Options'] = 'DENY'
       response.headers['X-XSS-Protection'] = '1; mode=block'
       return response
   ```

2. **Error Message Sanitization:**
   - Never expose internal paths
   - Never expose stack traces in production
   - Generic error messages for 500 errors

3. **HTTPS Enforcement:**
   - Railway provides automatic HTTPS
   - Redirect HTTP to HTTPS in production

---

## Conclusion

This API specification provides a complete contract for the Markdown Converter service. The API is designed to be:

1. **Simple:** RESTful design with intuitive endpoints
2. **Reliable:** Comprehensive error handling and status codes
3. **Performant:** Optimized for typical conversion workloads
4. **Secure:** Multi-layer security with input validation
5. **Well-Documented:** Clear examples and specifications

Developers implementing the Code phase should follow this specification exactly to ensure consistency and compatibility.

---

## References

- [Architecture Overview](/docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [REST API Design Best Practices](https://restfulapi.net/)

---

**Next Steps:**
1. Review Project Structure for implementation organization
2. Review Data Flow for processing pipeline details
3. Review Security Design for security implementation specifics
