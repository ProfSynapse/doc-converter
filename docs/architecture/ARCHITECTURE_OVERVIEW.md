# System Architecture Overview

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Executive Summary

This document provides a comprehensive architectural overview of the Markdown to Word/PDF converter application. The system is designed as a monolithic web application that accepts markdown files with YAML front matter, converts them to Word (.docx) and PDF formats with page numbering, and serves both the conversion API and frontend interface from a single Flask application deployed on Railway.

### Key Architectural Decisions

1. **Monolithic Architecture**: Single Flask application serving both API and static frontend
2. **Python Backend**: Leveraging pypandoc and WeasyPrint for document conversion
3. **Vanilla JavaScript Frontend**: No framework, minimal dependencies, served as static files
4. **Stateless Design**: No database, temporary file storage with automatic cleanup
5. **Railway Deployment**: Single Docker container, simple horizontal scaling

---

## System Context

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Railway Platform                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Docker Container (md-converter)               │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │           Flask Application (Gunicorn)              │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌──────────────────┐    ┌────────────────────┐    │  │  │
│  │  │  │   Static Files   │    │    API Endpoints   │    │  │  │
│  │  │  │                  │    │                    │    │  │  │
│  │  │  │  - index.html    │    │  - POST /convert   │    │  │  │
│  │  │  │  - app.js        │    │  - GET /health     │    │  │  │
│  │  │  │  - api.js        │    │                    │    │  │  │
│  │  │  └──────────────────┘    └────────────────────┘    │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │         Conversion Engine                     │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  │  - python-frontmatter (YAML parsing)         │  │  │  │
│  │  │  │  - pypandoc (Word generation)                │  │  │  │
│  │  │  │  - weasyprint (PDF generation)               │  │  │  │
│  │  │  │  - markdown (HTML rendering)                 │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │      Temporary Storage (Ephemeral)            │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  │  - uploads/ (incoming markdown)              │  │  │  │
│  │  │  │  - converted/ (generated documents)          │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                   ┌────────────────────┐                         │
│                   │  Automatic HTTPS   │                         │
│                   │  Load Balancing    │                         │
│                   └────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Client Browser  │
                    │                  │
                    │  - Upload files  │
                    │  - Download docs │
                    └──────────────────┘
```

### External Dependencies

The system has minimal external runtime dependencies:

1. **Railway Platform**
   - Container orchestration
   - HTTPS termination
   - Environment variable management
   - Automatic deployments

2. **System Libraries (in Docker container)**
   - Pandoc: Universal document converter
   - Pango/Cairo: Font rendering for PDF generation
   - GDK-PixBuf: Image handling

3. **CDN Resources (Frontend)**
   - Tailwind CSS: UI styling
   - Optional: Marked.js for markdown preview
   - Optional: DOMPurify for XSS protection

---

## Technology Stack

### Backend

```
┌─────────────────────────────────────────┐
│           Backend Stack                 │
├─────────────────────────────────────────┤
│ Language:  Python 3.12+                 │
│ Framework: Flask 3.0.3                  │
│ Server:    Gunicorn 22.0.0              │
│                                         │
│ Core Libraries:                         │
│ - python-frontmatter 1.0.1              │
│ - pypandoc-binary 1.13                  │
│ - weasyprint 62.3                       │
│ - markdown 3.6                          │
│ - pygments 2.18.0 (syntax highlighting) │
└─────────────────────────────────────────┘
```

### Frontend

```
┌─────────────────────────────────────────┐
│           Frontend Stack                │
├─────────────────────────────────────────┤
│ Language:  JavaScript ES6+              │
│ Markup:    HTML5 (semantic)             │
│ Styling:   Tailwind CSS 3.4+ (CDN)      │
│                                         │
│ No Framework Required:                  │
│ - No build tools                        │
│ - No transpilation                      │
│ - No bundlers                           │
│                                         │
│ Browser APIs:                           │
│ - Fetch API (HTTP requests)             │
│ - FormData API (file uploads)           │
│ - File API (file handling)              │
│ - Blob API (downloads)                  │
└─────────────────────────────────────────┘
```

### Deployment

```
┌─────────────────────────────────────────┐
│        Deployment Stack                 │
├─────────────────────────────────────────┤
│ Platform:    Railway                    │
│ Container:   Docker                     │
│ Base Image:  python:3.12-slim           │
│ HTTPS:       Automatic (Railway)        │
│ Scaling:     Horizontal (if needed)     │
│                                         │
│ Cost: $5-20/month (single service)      │
└─────────────────────────────────────────┘
```

---

## System Architecture Patterns

### 1. Monolithic Architecture

**Rationale:**
- Simple deployment and maintenance
- No cross-origin issues (same-origin policy)
- Lower cost (single Railway service)
- Suitable for utility application scale
- Atomic deployments (frontend + backend together)

**Trade-offs:**
- Less flexible scaling (must scale entire application)
- Tighter coupling between frontend and backend
- All components share same resources

**Justification for This Project:**
The application is a focused utility with limited complexity. A microservices architecture would add unnecessary overhead, cost, and complexity without providing meaningful benefits at this scale.

### 2. Stateless Design

**Implementation:**
- No persistent storage or database
- All file processing is ephemeral
- Each request is independent
- Temporary files cleaned up automatically

**Benefits:**
- Horizontal scaling without session affinity
- No state synchronization complexity
- Simpler error recovery (restart clears state)
- Lower operational complexity

**File Lifecycle:**
```
Upload → Process → Download → Cleanup (24 hours)
```

### 3. Request-Response Pattern

All interactions follow a simple synchronous request-response model:

```
Client Request → Server Processing → Client Response
```

**No asynchronous processing because:**
- Conversion time is typically < 5 seconds
- Simpler error handling
- Immediate user feedback
- No queue infrastructure needed

### 4. Separation of Concerns

The system is divided into clear layers:

```
┌──────────────────────────────────┐
│      Presentation Layer          │
│  (HTML, CSS, JavaScript)         │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│      API Layer                   │
│  (Flask routes, validation)      │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│      Business Logic Layer        │
│  (Conversion engine)             │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│      Library Layer               │
│  (pypandoc, weasyprint)          │
└──────────────────────────────────┘
```

---

## Component Overview

### 1. Frontend Components

```
static/
├── index.html          # Main UI (upload, preview, download)
├── js/
│   ├── app.js         # Main application logic
│   └── api.js         # API client (fetch wrappers)
└── css/
    └── styles.css     # Custom styles (minimal, optional)
```

**Responsibilities:**
- File selection (drag-drop or click)
- Client-side validation (file type, size)
- Upload with progress tracking
- Format selection (DOCX, PDF, both)
- Download handling
- Error display

### 2. Backend Components

```
app/
├── app.py             # Flask application and routes
├── converter.py       # Conversion engine
├── config.py          # Configuration management
├── utils.py           # Helper functions
└── templates/
    └── template.docx  # Word template with page numbers
```

**Responsibilities:**
- API endpoint handling
- Request validation
- File upload processing
- Document conversion orchestration
- Response formatting
- Error handling

### 3. Conversion Engine

**Core Converter Class:**
- Parses YAML front matter
- Formats metadata for display
- Converts markdown to Word (pypandoc)
- Converts markdown to PDF (weasyprint)
- Applies styling and page numbers

---

## Data Flow Architecture

### Complete Request Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. User uploads .md file
     ▼
┌─────────────────────┐
│  Frontend (app.js)  │
│  - Validate file    │
│  - Show progress    │
└──────────┬──────────┘
           │ 2. POST /convert (multipart/form-data)
           ▼
┌─────────────────────────────┐
│  API Layer (Flask routes)   │
│  - Validate request         │
│  - Check file type/size     │
│  - Generate job_id          │
└──────────┬──────────────────┘
           │ 3. Call converter
           ▼
┌─────────────────────────────────────┐
│  Conversion Engine (converter.py)   │
│  - Parse front matter               │
│  - Format metadata                  │
│  - Convert to DOCX (pypandoc)       │
│  - Convert to PDF (weasyprint)      │
│  - Save to temp directory           │
└──────────┬──────────────────────────┘
           │ 4. Return file paths
           ▼
┌─────────────────────────────┐
│  API Layer (Flask routes)   │
│  - Send file as blob        │
│  - Set content headers      │
└──────────┬──────────────────┘
           │ 5. HTTP response with binary file
           ▼
┌─────────────────────┐
│  Frontend (app.js)  │
│  - Receive blob     │
│  - Create download  │
└──────────┬──────────┘
           │ 6. Browser downloads file
           ▼
     ┌──────────┐
     │  Client  │
     └──────────┘
```

---

## Scalability Considerations

### Vertical Scaling (Resource-Based)

**Current Resources (Railway default):**
- CPU: 1 vCPU
- RAM: 512 MB
- Expected throughput: 10-20 conversions/minute

**Scaling Triggers:**
- CPU > 80% sustained
- Memory > 90% sustained
- Request latency > 10 seconds

**Scaling Actions:**
- Increase Railway plan (more RAM/CPU)
- Optimize worker count (Gunicorn)
- Add request queuing

### Horizontal Scaling (Instance-Based)

**Current State:** Single instance sufficient for anticipated load

**When to Scale Horizontally:**
- Traffic > 1000 conversions/day
- Need for high availability (99.9% uptime)
- Geographic distribution requirements

**Implementation:**
```
Railway Load Balancer
        │
    ┌───┴───┐
    │       │
 Instance1  Instance2
```

**Considerations:**
- Stateless design enables easy horizontal scaling
- No shared state between instances
- Railway handles load balancing automatically

### Performance Optimization

**Current Optimizations:**
1. Temporary file cleanup (prevent disk filling)
2. Gunicorn worker pool (concurrent requests)
3. Static file caching (browser cache headers)
4. Minimal frontend bundle size

**Future Optimizations (if needed):**
1. Redis caching for repeated conversions
2. CDN for static assets
3. Background job processing (Celery)
4. Persistent storage (S3) with cleanup policies

---

## Security Architecture Overview

### Multi-Layer Security

```
┌─────────────────────────────────────────┐
│  Layer 1: Network Security              │
│  - HTTPS (Railway automatic)            │
│  - DDoS protection (Railway)            │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Layer 2: Input Validation              │
│  - File type checking                   │
│  - File size limits (10MB)              │
│  - MIME type verification               │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Layer 3: Application Security          │
│  - Secure filename handling             │
│  - Request sanitization                 │
│  - Error message sanitization           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Layer 4: Container Security            │
│  - Non-root user execution              │
│  - Read-only filesystem (except temp)   │
│  - Minimal base image                   │
└─────────────────────────────────────────┘
```

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal permissions for all components
3. **Fail Secure**: Errors don't expose sensitive information
4. **Input Validation**: Never trust user input

---

## Error Handling Strategy

### Error Categories

```
┌────────────────────────────────────────────┐
│  Client Errors (4xx)                       │
│  - 400: Invalid request format             │
│  - 413: File too large                     │
│  - 415: Unsupported file type              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  Server Errors (5xx)                       │
│  - 500: Conversion failed                  │
│  - 503: Service unavailable                │
└────────────────────────────────────────────┘
```

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field that failed (if applicable)"
  }
}
```

### Error Recovery

1. **Validation Errors**: Return immediately with 4xx
2. **Conversion Errors**: Log details, return generic 500
3. **Temporary Failures**: Implement retry logic (client-side)
4. **Critical Failures**: Alert monitoring, return 503

---

## Monitoring and Observability

### Health Checks

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "service": "md-converter",
  "version": "1.0.0",
  "dependencies": {
    "pandoc": "available",
    "weasyprint": "available"
  }
}
```

**Railway Integration:**
- Automatic health checks every 30 seconds
- Container restart on 3 consecutive failures

### Logging Strategy

**Log Levels:**
- **DEBUG**: Development details
- **INFO**: Request/response lifecycle
- **WARNING**: Recoverable errors
- **ERROR**: Conversion failures
- **CRITICAL**: Service unavailability

**Log Format:**
```
[2025-10-31 10:30:15] [INFO] converter: Converting document.md to DOCX
[2025-10-31 10:30:17] [INFO] converter: Successfully created document.docx
```

### Metrics (via Railway Dashboard)

- Request count
- Response times (p50, p95, p99)
- Error rate
- Memory usage
- CPU usage
- Disk usage

---

## Deployment Architecture

### Docker Container Structure

```
Container: md-converter
├── Base: python:3.12-slim (~200MB)
├── System packages (~150MB)
│   ├── Pandoc
│   ├── Pango/Cairo
│   └── GDK-PixBuf
├── Python packages (~100MB)
│   ├── Flask
│   ├── pypandoc
│   ├── weasyprint
│   └── dependencies
└── Application code (~5MB)
    ├── app.py
    ├── converter.py
    └── static/

Total size: ~400-450MB
```

### Railway Deployment Flow

```
1. Code Push to Git
        │
        ▼
2. Railway Webhook
        │
        ▼
3. Docker Build
        │
        ▼
4. Image Push to Registry
        │
        ▼
5. Container Deploy
        │
        ▼
6. Health Check
        │
        ▼
7. Traffic Routing
```

**Deployment Time:** 2-3 minutes
**Zero Downtime:** Railway handles rolling deployments

---

## Development Workflow

### Local Development

```bash
# 1. Setup virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run locally
python app.py

# 4. Test in browser
open http://localhost:8080
```

### Testing Strategy

```
Unit Tests (pytest)
├── test_converter.py (conversion logic)
├── test_api.py (API endpoints)
└── test_validation.py (input validation)

Integration Tests
├── test_upload_flow.py (end-to-end upload)
└── test_conversion_flow.py (end-to-end conversion)

Manual Tests
├── Browser compatibility
├── Mobile responsiveness
└── Error scenarios
```

### CI/CD Pipeline (Future)

```
Git Push → GitHub Actions
            │
            ├─→ Linting (flake8)
            ├─→ Unit Tests (pytest)
            ├─→ Security Scan (bandit)
            └─→ Deploy to Railway
```

---

## Architecture Trade-offs and Decisions

### Decision 1: Monolithic vs Microservices

**Decision:** Monolithic
**Rationale:**
- Application complexity doesn't justify microservices
- Single team, small codebase
- Lower operational cost
- Simpler deployment and debugging

**Trade-off Accepted:** Less flexible individual component scaling

### Decision 2: Synchronous vs Asynchronous Processing

**Decision:** Synchronous
**Rationale:**
- Conversion time < 5 seconds (acceptable for UX)
- Simpler error handling
- No queue infrastructure needed
- Immediate feedback to users

**Trade-off Accepted:** Server resources blocked during conversion

### Decision 3: Stateless vs Stateful Design

**Decision:** Stateless
**Rationale:**
- Easier horizontal scaling
- No database costs or complexity
- Simpler error recovery
- Fits utility application model

**Trade-off Accepted:** No conversion history or user accounts

### Decision 4: Vanilla JS vs Frontend Framework

**Decision:** Vanilla JavaScript
**Rationale:**
- Simple UI (4-5 interactions)
- No build tools needed
- Faster load times
- Lower maintenance burden

**Trade-off Accepted:** More verbose code for complex features (if added later)

### Decision 5: Pypandoc vs python-docx

**Decision:** Pypandoc (with pypandoc-binary)
**Rationale:**
- Native markdown support
- Superior conversion quality
- Simpler page numbering
- Battle-tested in production

**Trade-off Accepted:** Larger Docker image (~150MB additional)

---

## Future Architecture Considerations

### Phase 2 Enhancements (If Needed)

1. **User Accounts**
   - Add PostgreSQL database
   - Implement authentication (Flask-Login)
   - Track conversion history

2. **Asynchronous Processing**
   - Add Redis for job queue
   - Implement Celery workers
   - Support batch conversions

3. **Persistent Storage**
   - Integrate Railway Volumes or S3
   - Enable file history and retrieval
   - Implement cleanup policies

4. **Advanced Features**
   - Real-time markdown preview
   - Custom styling templates
   - Batch processing
   - API key authentication

### Migration Path to Microservices (If Needed)

```
Current Monolith
       │
       ▼
Step 1: Extract Conversion Service
       │
       ├─→ Frontend Service
       └─→ Conversion Service (API)
       │
       ▼
Step 2: Add Queue System
       │
       ├─→ Frontend Service
       ├─→ API Gateway
       ├─→ Queue (Redis/RabbitMQ)
       └─→ Worker Pool (Conversion)
```

---

## Conclusion

This architecture provides a solid foundation for a production-ready markdown conversion application. The design prioritizes:

1. **Simplicity**: Monolithic architecture with minimal dependencies
2. **Reliability**: Stateless design with automatic error recovery
3. **Cost-Efficiency**: Single Railway service ($5-20/month)
4. **Maintainability**: Clear separation of concerns, well-documented
5. **Scalability**: Horizontal scaling capability when needed

The architecture is intentionally designed to match the application's scope and requirements, avoiding over-engineering while maintaining flexibility for future growth.

---

## References

- [Preparation Phase Documentation](/docs/preparation/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Pandoc User's Guide](https://pandoc.org/MANUAL.html)
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/)

---

**Next Steps:**
1. Review API Specification document for endpoint details
2. Review Project Structure document for file organization
3. Review Data Flow document for processing details
4. Review Component Design document for implementation specifics
