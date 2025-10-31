# Data Flow Architecture

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document details the complete data flow through the Markdown Converter application, from file upload through conversion to download. It includes sequence diagrams, state transitions, error flows, and data transformation specifications.

---

## Complete Request Flow

### High-Level Flow Diagram

```
┌──────────┐
│  Client  │
│ Browser  │
└────┬─────┘
     │ 1. User selects .md file
     ▼
┌─────────────────────────┐
│  Frontend (app.js)      │
│  - Validate file type   │
│  - Check file size      │
│  - Read file content    │
└────┬────────────────────┘
     │ 2. POST /api/convert (multipart/form-data)
     │    - file: <binary data>
     │    - format: "both"
     ▼
┌─────────────────────────────────┐
│  Flask API (routes.py)          │
│  - Receive request              │
│  - Extract file                 │
│  - Validate content-type        │
│  - Validate file size           │
│  - Sanitize filename            │
└────┬────────────────────────────┘
     │ 3. File validated, call converter
     │    - content: markdown string
     │    - format: "both"
     ▼
┌─────────────────────────────────────┐
│  Converter (converter.py)           │
│  - Parse YAML front matter          │
│  - Extract metadata                 │
│  - Format metadata for display      │
│  - Build complete document          │
└────┬────────────────────────────────┘
     │ 4a. Convert to DOCX
     ├──→ ┌────────────────────────┐
     │    │  pypandoc              │
     │    │  - Parse markdown      │
     │    │  - Apply template      │
     │    │  - Generate .docx      │
     │    └────────────────────────┘
     │
     │ 4b. Convert to PDF
     └──→ ┌────────────────────────┐
          │  markdown + weasyprint │
          │  - Convert MD to HTML  │
          │  - Apply CSS styles    │
          │  - Generate PDF        │
          │  - Add page numbers    │
          └────────────────────────┘
               │
               ▼
     ┌─────────────────────────────┐
     │  File System                │
     │  /tmp/converted/<job_id>/   │
     │  - document.docx            │
     │  - document.pdf             │
     └────┬────────────────────────┘
          │ 5. Files saved, return response
          ▼
┌─────────────────────────────┐
│  Flask API (routes.py)      │
│  - Build JSON response      │
│  - Include download URLs    │
│  - Include metadata         │
└────┬────────────────────────┘
     │ 6. HTTP 200 with JSON response
     ▼
┌─────────────────────────┐
│  Frontend (app.js)      │
│  - Parse response       │
│  - Display download UI  │
│  - Create download btns │
└────┬────────────────────┘
     │ 7. User clicks download button
     ▼
     GET /api/download/<job_id>/docx
     │
     ▼
┌─────────────────────────────┐
│  Flask API (routes.py)      │
│  - Locate file              │
│  - Read file                │
│  - Set headers              │
└────┬────────────────────────┘
     │ 8. HTTP 200 with binary file
     ▼
┌─────────────────────────┐
│  Frontend (app.js)      │
│  - Receive blob         │
│  - Create object URL    │
│  - Trigger download     │
└────┬────────────────────┘
     │ 9. Browser downloads file
     ▼
┌──────────┐
│  Client  │
│   Disk   │
└──────────┘
```

---

## Detailed Sequence Diagrams

### 1. Upload and Validation Flow

```
Client          Frontend          API            Validator         FileSystem
  │                │                │                │                 │
  ├─Select File───►│                │                │                 │
  │                │                │                │                 │
  │                ├─Validate Type─►│                │                 │
  │                │   (.md check)  │                │                 │
  │                │                │                │                 │
  │                ├─Validate Size─►│                │                 │
  │                │   (<10MB)      │                │                 │
  │                │                │                │                 │
  │◄──Show Progress│                │                │                 │
  │    (0%)        │                │                │                 │
  │                │                │                │                 │
  │                ├─POST /convert─►│                │                 │
  │                │  (FormData)    │                │                 │
  │                │                │                │                 │
  │                │                ├─Extract File──►│                 │
  │                │                │                │                 │
  │                │                ├─Check MIME───►│                 │
  │                │                │                │                 │
  │                │                ├─Sanitize Name►│                 │
  │                │                │                │                 │
  │                │                ├─Save Upload──►├────────────────►│
  │                │                │                │  /tmp/uploads/  │
  │                │                │                │                 │
  │◄──Show Progress│◄───Response────│◄───Valid───────│                 │
  │    (25%)       │                │                │                 │
```

### 2. Conversion Pipeline Flow

```
API         Converter       Frontmatter     pypandoc      weasyprint    FileSystem
 │              │               │               │              │             │
 ├─Convert()───►│               │               │              │             │
 │   content    │               │               │              │             │
 │   format     │               │               │              │             │
 │              │               │               │              │             │
 │              ├─Parse()──────►│               │              │             │
 │              │               │               │              │             │
 │              │◄──metadata────┤               │              │             │
 │              │   content     │               │              │             │
 │              │               │               │              │             │
 │              ├─Format FM()───┤               │              │             │
 │              │   display     │               │              │             │
 │              │               │               │              │             │
 │              ├─Build Doc()───┤               │              │             │
 │              │  (FM + body)  │               │              │             │
 │              │               │               │              │             │
 │              ├─To DOCX()────────────────────►│              │             │
 │              │   markdown    │               │              │             │
 │              │   template    │               │              │             │
 │              │               │               │              │             │
 │              │               │               ├─Generate────►├────────────►│
 │              │               │               │   .docx      │  Save file  │
 │              │               │               │              │             │
 │              │◄──────────────────────────────┤              │             │
 │              │    docx_path  │               │              │             │
 │              │               │               │              │             │
 │              ├─To PDF()──────┤               │              │             │
 │              │   markdown    │               │              │             │
 │              │   css         │               │              │             │
 │              │               │               │              │             │
 │              ├─MD to HTML────┤               │              │             │
 │              │               │               │              │             │
 │              ├─────────────────────────────────────────────►│             │
 │              │   html + css  │               │              │             │
 │              │               │               │              │             │
 │              │               │               │              ├────────────►│
 │              │               │               │              │   .pdf      │
 │              │               │               │              │             │
 │              │◄──────────────────────────────────────────────┤             │
 │              │    pdf_path   │               │              │             │
 │              │               │               │              │             │
 │◄─Response────┤               │               │              │             │
 │  docx_path   │               │               │              │             │
 │  pdf_path    │               │               │              │             │
 │  metadata    │               │               │              │             │
```

### 3. Download Flow

```
Client      Frontend         API            FileSystem
  │            │              │                 │
  ├─Click─────►│              │                 │
  │  Download │              │                 │
  │           │              │                 │
  │           ├─GET /download│                 │
  │           │   /job_id/   │                 │
  │           │   format     │                 │
  │           │              │                 │
  │           │              ├─Locate File────►│
  │           │              │  /tmp/converted/│
  │           │              │                 │
  │           │              │◄──File Path─────┤
  │           │              │                 │
  │           │              ├─Read File──────►│
  │           │              │                 │
  │           │              │◄──Binary Data───┤
  │           │              │                 │
  │           │◄─HTTP 200────┤                 │
  │           │  Binary blob │                 │
  │           │              │                 │
  │◄─Download─┤              │                 │
  │  to disk  │              │                 │
```

---

## Data Transformation Pipeline

### Input: Markdown File

```markdown
---
title: Technical Specification
author: Jane Smith
date: 2025-10-31
tags: [documentation, technical]
---

# Introduction

This document describes the **technical architecture**.

## Requirements

1. System must support X
2. System must support Y

## Code Example

```python
def hello():
    print("Hello World")
```
```

### Stage 1: YAML Front Matter Parsing

**Input:** Raw markdown string
**Output:** Metadata dict + Content string

```python
# After frontmatter.loads()
metadata = {
    'title': 'Technical Specification',
    'author': 'Jane Smith',
    'date': '2025-10-31',
    'tags': ['documentation', 'technical']
}

content = """
# Introduction

This document describes the **technical architecture**.

## Requirements

1. System must support X
2. System must support Y

## Code Example

```python
def hello():
    print("Hello World")
```
"""
```

### Stage 2: Front Matter Formatting

**Input:** Metadata dict
**Output:** Formatted markdown string

```markdown
# Technical Specification

**Author:** Jane Smith
**Date:** 2025-10-31
**Tags:** documentation, technical

---
```

### Stage 3: Document Assembly

**Input:** Formatted front matter + Content
**Output:** Complete markdown document

```markdown
# Technical Specification

**Author:** Jane Smith
**Date:** 2025-10-31
**Tags:** documentation, technical

---

# Introduction

This document describes the **technical architecture**.

## Requirements

1. System must support X
2. System must support Y

## Code Example

```python
def hello():
    print("Hello World")
```
```

### Stage 4a: Word Conversion (pypandoc)

**Input:** Complete markdown document
**Process:** Pandoc markdown → DOCX
**Output:** Binary .docx file

**Pandoc Processing:**
1. Parse markdown syntax
2. Apply template styles
3. Insert page numbers (from template)
4. Render code blocks with syntax highlighting
5. Generate OpenXML document structure

**File Output:** `document.docx` (~45KB)

### Stage 4b: PDF Conversion (weasyprint)

**Input:** Complete markdown document
**Process:** Markdown → HTML → PDF

**Step 1: Markdown to HTML**

```python
import markdown
md = markdown.Markdown(extensions=['extra', 'codehilite', 'toc'])
html_content = md.convert(markdown_content)
```

**Step 2: Apply CSS Styling**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: A4;
            margin: 1in;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
            }
        }
        body { font-family: Georgia; }
        h1 { font-size: 24pt; }
        code { background: #f4f4f4; }
        /* ... more styles ... */
    </style>
</head>
<body>
    <!-- HTML content here -->
</body>
</html>
```

**Step 3: Generate PDF**

```python
from weasyprint import HTML
HTML(string=html_document).write_pdf(output_path)
```

**File Output:** `document.pdf` (~120KB)

---

## State Management

### Application States

```
┌──────────────┐
│    IDLE      │ (Initial state)
└──────┬───────┘
       │ User selects file
       ▼
┌──────────────┐
│  VALIDATING  │ (Checking file)
└──────┬───────┘
       │ File valid
       ▼
┌──────────────┐
│  UPLOADING   │ (Sending to server)
└──────┬───────┘
       │ Upload complete
       ▼
┌──────────────┐
│  PROCESSING  │ (Converting document)
└──────┬───────┘
       │ Conversion complete
       ▼
┌──────────────┐
│   COMPLETE   │ (Ready to download)
└──────┬───────┘
       │ User downloads
       ▼
┌──────────────┐
│ DOWNLOADING  │ (Fetching file)
└──────┬───────┘
       │ Download complete
       ▼
┌──────────────┐
│     DONE     │ (Final state)
└──────────────┘

       Error at any stage
              │
              ▼
       ┌──────────────┐
       │    ERROR     │ (Show error, allow retry)
       └──────────────┘
```

### State Transitions

| Current State | Event | Next State | Actions |
|--------------|-------|------------|---------|
| IDLE | File Selected | VALIDATING | Check type, size |
| VALIDATING | Valid | UPLOADING | Create FormData, POST |
| VALIDATING | Invalid | ERROR | Show error message |
| UPLOADING | Progress | UPLOADING | Update progress bar |
| UPLOADING | Complete | PROCESSING | Show processing UI |
| UPLOADING | Error | ERROR | Show error, enable retry |
| PROCESSING | Complete | COMPLETE | Show download buttons |
| PROCESSING | Error | ERROR | Show error, enable retry |
| COMPLETE | Download Click | DOWNLOADING | Fetch file |
| DOWNLOADING | Complete | DONE | Save to disk |
| ERROR | Retry | IDLE | Reset UI |

---

## Error Flow Diagrams

### Client-Side Error Flow

```
User Action
     │
     ▼
Frontend Validation
     │
     ├─→ Type Check ──→ Invalid Type ──→ Show Error ──→ IDLE
     │                      ▲
     ├─→ Size Check ──→ Too Large ──┘
     │
     └─→ Valid ──→ Continue Upload
```

### Server-Side Error Flow

```
API Request
     │
     ▼
Request Validation
     │
     ├─→ Missing File ──→ 400 Error ──→ Client Error Display
     │
     ├─→ Invalid Type ──→ 415 Error ──→ Client Error Display
     │
     ├─→ Too Large ──→ 413 Error ──→ Client Error Display
     │
     └─→ Valid ──→ Process Conversion
              │
              ▼
         Conversion
              │
              ├─→ Parse Error ──→ 422 Error ──→ Client Error Display
              │
              ├─→ Pandoc Error ──→ 500 Error ──→ Client Error Display
              │
              ├─→ WeasyPrint Error ──→ 500 Error ──→ Client Error Display
              │
              └─→ Success ──→ 200 Response ──→ Client Download UI
```

### Error Recovery Flow

```
Error Occurs
     │
     ▼
Log Error Details
     │
     ▼
Determine Error Type
     │
     ├─→ Client Error (4xx) ──→ Return specific error message
     │                          │
     │                          └─→ Client shows actionable feedback
     │                              ("Use .md file", "Reduce size")
     │
     ├─→ Temporary Error (503) ──→ Return retry message
     │                             │
     │                             └─→ Client implements retry logic
     │                                 (exponential backoff)
     │
     └─→ Server Error (500) ──→ Return generic error
                                │
                                ├─→ Log full details internally
                                │
                                └─→ Client shows error + support info
```

---

## Data Storage Patterns

### Temporary File Storage

**Pattern:** Job-based directory structure

```
/tmp/converted/
├── <job_id_1>/
│   ├── original.md
│   ├── document.docx
│   ├── document.pdf
│   └── metadata.json
├── <job_id_2>/
│   └── report.docx
└── <job_id_3>/
    └── notes.pdf
```

**Metadata Storage (metadata.json):**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "document",
  "created_at": "2025-10-31T10:30:00Z",
  "expires_at": "2025-11-01T10:30:00Z",
  "formats": ["docx", "pdf"],
  "sizes": {
    "docx": 45678,
    "pdf": 123456
  },
  "metadata": {
    "title": "Technical Specification",
    "author": "Jane Smith"
  }
}
```

### File Lifecycle

```
Creation
    │
    ├─→ /tmp/converted/<job_id>/
    │      Files created: .docx, .pdf
    │      Timestamp recorded
    │
    ▼
Active Period (0-24 hours)
    │
    ├─→ Downloads allowed
    │      Multiple downloads permitted
    │      No file modification
    │
    ▼
Expiration (24 hours)
    │
    ├─→ Cleanup job runs
    │      Check file age
    │      Delete expired files
    │      Remove empty directories
    │
    ▼
Deleted
    │
    └─→ 410 Gone response if accessed
```

---

## Performance Data Flow

### Request Processing Times

```
┌────────────────────────────────────────────────────────┐
│              Total Request Time: ~5 seconds            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Upload (0-1s)        ████                            │
│  - Network transfer                                    │
│  - File write to disk                                  │
│                                                        │
│  Validation (0.1s)    █                               │
│  - Type check                                          │
│  - Size check                                          │
│  - MIME verification                                   │
│                                                        │
│  Parse FM (0.1s)      █                               │
│  - YAML parsing                                        │
│  - Content extraction                                  │
│                                                        │
│  DOCX Conv (1-2s)     ████████                        │
│  - Pandoc processing                                   │
│  - Template application                                │
│                                                        │
│  PDF Conv (1-2s)      ████████                        │
│  - Markdown to HTML                                    │
│  - CSS application                                     │
│  - PDF rendering                                       │
│                                                        │
│  Response (0.1s)      █                               │
│  - JSON formatting                                     │
│  - HTTP transmission                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Bottleneck Analysis

**Primary Bottlenecks:**
1. **PDF Generation (weasyprint):** ~1-2 seconds
   - Font rendering
   - Page layout calculation
   - CSS processing

2. **DOCX Generation (pandoc):** ~1-2 seconds
   - Markdown parsing
   - OpenXML generation
   - Template merging

**Optimization Opportunities:**
1. Parallel conversion (DOCX + PDF simultaneously)
2. Template caching
3. Font subset optimization
4. CSS pre-compilation

---

## Concurrent Request Handling

### Gunicorn Worker Model

```
Load Balancer (Railway)
        │
        ▼
Gunicorn Master Process
        │
        ├─→ Worker 1 ──┐
        │               ├─→ Request A (Converting document)
        │               └─→ Request B (Waiting)
        │
        ├─→ Worker 2 ──┐
        │               ├─→ Request C (Converting document)
        │               └─→ Request D (Waiting)
        │
        └─→ Worker 3 ──┐
                        ├─→ Request E (Converting document)
                        └─→ (Available)
```

**Configuration:**
- Workers: 2-4 (based on CPU cores)
- Threads: 1 per worker (CPU-bound tasks)
- Timeout: 30 seconds
- Max requests: 1000 (worker recycling)

**Concurrency Limits:**
- Max simultaneous conversions: 2-4
- Queue depth: Handled by Railway load balancer
- Request timeout: 30 seconds

---

## Data Security Flow

### Secure Data Handling

```
File Upload
     │
     ▼
Client Validation (defense in depth)
     │
     ▼
HTTPS Transport (encrypted)
     │
     ▼
Server Validation
     │ ├─→ File type check
     │ ├─→ Size check
     │ ├─→ MIME type verification
     │ └─→ Content scanning
     ▼
Secure Filename
     │ ├─→ Remove path traversal
     │ ├─→ Remove special chars
     │ └─→ Limit length
     ▼
Temporary Storage
     │ ├─→ Isolated directory
     │ ├─→ Non-executable location
     │ └─→ Limited permissions
     ▼
Processing (sandboxed)
     │ ├─→ No shell execution
     │ ├─→ No file system access outside tmp
     │ └─→ Memory limits
     ▼
Download
     │ ├─→ Authenticated (future)
     │ ├─→ Time-limited access
     │ └─→ HTTPS only
     ▼
Cleanup
     │ ├─→ Secure deletion
     │ └─→ No recovery possible
```

---

## Monitoring Data Flow

### Logging Pipeline

```
Application Event
        │
        ▼
Python Logger
        │
        ├─→ Console (stdout/stderr)
        │      │
        │      └─→ Railway Logs
        │             │
        │             └─→ Dashboard
        │
        └─→ File (optional)
               │
               └─→ /var/log/app.log
```

### Metrics Collection

```
Request
    │
    ├─→ Start Time
    ├─→ End Time
    ├─→ Duration
    ├─→ Status Code
    ├─→ File Size
    ├─→ Format(s)
    └─→ Error (if any)
         │
         ▼
    Log Entry
         │
         ▼
    Railway Metrics
         │
         ├─→ Request Count
         ├─→ Error Rate
         ├─→ Response Time (p50, p95, p99)
         ├─→ Memory Usage
         └─→ CPU Usage
```

---

## Cleanup Flow

### Automatic Cleanup Process

```
Scheduled Task (cron or background worker)
        │
        ▼
Scan /tmp/converted/
        │
        ├─→ For each job_id directory:
        │      │
        │      ├─→ Check metadata.json
        │      │      │
        │      │      └─→ Get created_at timestamp
        │      │
        │      ├─→ Calculate age
        │      │      age = current_time - created_at
        │      │
        │      ├─→ If age > 24 hours:
        │      │      │
        │      │      ├─→ Delete all files
        │      │      ├─→ Delete metadata.json
        │      │      └─→ Remove directory
        │      │
        │      └─→ Log deletion
        │
        └─→ Complete
```

**Cleanup Schedule:**
- Frequency: Every 6 hours
- Retention: 24 hours
- Batch size: All expired files
- Logging: Delete count, freed space

---

## Conclusion

This data flow architecture ensures:

1. **Clear Data Transformation:** Each stage is well-defined
2. **Error Handling:** Comprehensive error flows at each stage
3. **Performance:** Optimized processing pipeline
4. **Security:** Secure data handling throughout
5. **Monitoring:** Complete observability
6. **Cleanup:** Automatic resource management

The flow diagrams and specifications provide complete guidance for implementation in the Code phase.

---

## References

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [API Specification](./API_SPECIFICATION.md)
- [Component Design](./COMPONENT_DESIGN.md)
- [Security Design](./SECURITY_DESIGN.md)

---

**Next Steps:**
1. Review Component Design for implementation specifics
2. Review Security Design for security implementation details
3. Begin implementation following these data flows
