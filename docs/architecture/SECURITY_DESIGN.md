# Security Design

## Document Information

**Project:** Markdown to Word/PDF Converter
**Version:** 1.0.0
**Phase:** Architecture (PACT Framework)
**Date:** 2025-10-31
**Author:** PACT Architect

---

## Overview

This document defines the comprehensive security architecture for the Markdown Converter application, covering all security layers from network to application to data security. It provides specific implementations, threat models, and security best practices.

---

## Security Architecture Overview

### Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security                                  │
│  - HTTPS/TLS encryption                                     │
│  - DDoS protection (Railway)                                │
│  - Firewall rules                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Layer 2: Application Security                              │
│  - Input validation                                         │
│  - Request sanitization                                     │
│  - Security headers                                         │
│  - Rate limiting (future)                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Layer 3: File Security                                     │
│  - File type validation                                     │
│  - Size limits                                              │
│  - Content scanning                                         │
│  - Secure filename handling                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Layer 4: Process Security                                  │
│  - Non-root execution                                       │
│  - Resource limits                                          │
│  - Isolated temporary storage                               │
│  - No shell execution                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Layer 5: Data Security                                     │
│  - Automatic cleanup                                        │
│  - No persistent storage of uploads                         │
│  - Secure deletion                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Threat Model

### STRIDE Threat Analysis

#### Spoofing Identity
**Threat:** Unauthorized user accessing conversion service
**Mitigation:**
- Currently: Public API (no authentication)
- Future: API key authentication, rate limiting per IP
**Risk Level:** Low (utility application)

#### Tampering
**Threat:** Malicious file upload attempting code injection
**Mitigation:**
- File type validation (extension + MIME type)
- Content scanning (markdown parsing only)
- No execution of uploaded files
- Sandboxed conversion process
**Risk Level:** Medium → Low (mitigated)

#### Repudiation
**Threat:** User denying actions
**Mitigation:**
- Comprehensive logging (IP, timestamp, file info)
- Audit trail of all conversions
**Risk Level:** Low

#### Information Disclosure
**Threat:** Sensitive data exposure through error messages or logs
**Mitigation:**
- Generic error messages to users
- Detailed errors only in server logs
- No stack traces in responses
- Automatic file cleanup
**Risk Level:** Medium → Low (mitigated)

#### Denial of Service
**Threat:** Resource exhaustion through large/many file uploads
**Mitigation:**
- File size limits (10MB)
- Request timeout (30s)
- Worker limits (2-4)
- Automatic cleanup
- Future: Rate limiting
**Risk Level:** Medium → Medium (partial mitigation)

#### Elevation of Privilege
**Threat:** Container escape or privilege escalation
**Mitigation:**
- Non-root user in container
- Read-only filesystem (except /tmp)
- No sudo/privileged operations
- Minimal base image
**Risk Level:** Low

---

## Input Validation and Sanitization

### File Upload Validation

#### Client-Side Validation (First Line of Defense)

```javascript
// static/js/app.js
function validateFile(file) {
    // 1. Extension check
    const validExtensions = ['.md', '.markdown', '.txt'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(extension)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload .md or .markdown files only.'
        };
    }

    // 2. Size check (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size is 10 MB.`
        };
    }

    // 3. Filename character check
    const dangerousChars = /[<>:"\/\\|?*\x00-\x1F]/;
    if (dangerousChars.test(file.name)) {
        return {
            valid: false,
            error: 'Filename contains invalid characters.'
        };
    }

    return { valid: true };
}
```

#### Server-Side Validation (Security Boundary)

```python
# app/api/validators.py
from werkzeug.utils import secure_filename
import magic
import os

def validate_upload(request):
    """
    Comprehensive server-side validation
    NEVER trust client-side validation alone
    """
    # 1. File presence
    if 'file' not in request.files:
        return error_response('MISSING_FILE', 'No file provided', 400)

    file = request.files['file']

    # 2. Filename check
    if file.filename == '':
        return error_response('EMPTY_FILENAME', 'No file selected', 400)

    # 3. Extension validation
    if not allowed_file(file.filename):
        return error_response(
            'INVALID_FILE_TYPE',
            'Invalid file type. Allowed: .md, .markdown, .txt',
            415,
            extra={'allowed_types': ['.md', '.markdown', '.txt']}
        )

    # 4. File size (Flask handles via MAX_CONTENT_LENGTH)
    # But double-check for custom handling
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    max_size = current_app.config['MAX_FILE_SIZE']
    if size > max_size:
        return error_response(
            'FILE_TOO_LARGE',
            f'File exceeds maximum size of {max_size} bytes',
            413
        )

    # 5. MIME type validation (defense in depth)
    mime = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)

    allowed_mimes = ['text/plain', 'text/markdown', 'text/x-markdown']
    if mime not in allowed_mimes:
        return error_response(
            'INVALID_MIME_TYPE',
            f'Invalid file type. Detected: {mime}',
            415
        )

    # 6. Content validation (check for binary data in "text" file)
    sample = file.read(4096)
    file.seek(0)

    if b'\x00' in sample:  # Null bytes indicate binary file
        return error_response(
            'BINARY_FILE_DETECTED',
            'File appears to be binary, not text',
            415
        )

    return None  # Valid


def allowed_file(filename):
    """Check file extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def sanitize_filename(filename):
    """
    Sanitize filename to prevent directory traversal and other attacks
    """
    # Use werkzeug's secure_filename
    safe_name = secure_filename(filename)

    # Additional sanitization
    # Remove any remaining path separators
    safe_name = safe_name.replace('/', '').replace('\\', '')

    # Limit length
    if len(safe_name) > 255:
        base, ext = os.path.splitext(safe_name)
        safe_name = base[:250] + ext

    # Ensure not empty after sanitization
    if not safe_name:
        safe_name = 'unnamed.md'

    return safe_name
```

### Markdown Content Validation

```python
# app/converter/converter.py
def parse_markdown(self, content: str) -> Tuple[Dict, str]:
    """
    Parse markdown with validation and sanitization
    """
    # 1. Check content size
    if len(content) > 10 * 1024 * 1024:  # 10MB in characters
        raise ValueError('Content too large')

    # 2. Check for suspicious patterns (no script tags in markdown)
    suspicious_patterns = [
        r'<script[^>]*>',
        r'javascript:',
        r'onerror=',
        r'onload='
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            logger.warning(f"Suspicious pattern detected: {pattern}")
            # Don't reject, but log for monitoring
            # Markdown rendering will escape HTML anyway

    # 3. Parse front matter safely
    try:
        import frontmatter
        post = frontmatter.loads(content)

        # Validate metadata
        metadata = sanitize_metadata(post.metadata)

        return metadata, post.content

    except yaml.YAMLError as e:
        raise ValueError(f'Invalid YAML front matter: {str(e)}')
    except Exception as e:
        logger.error(f'Failed to parse markdown: {e}')
        raise ValueError('Malformed markdown')


def sanitize_metadata(metadata: dict) -> dict:
    """
    Sanitize metadata fields
    """
    sanitized = {}

    for key, value in metadata.items():
        # Sanitize key (alphanumeric and underscore only)
        clean_key = re.sub(r'[^\w]', '_', str(key))[:50]

        # Sanitize value
        if isinstance(value, str):
            # Remove potential HTML/script tags
            clean_value = re.sub(r'<[^>]+>', '', value)
            # Limit length
            clean_value = clean_value[:500]
        elif isinstance(value, (int, float, bool)):
            clean_value = value
        elif isinstance(value, list):
            clean_value = [str(v)[:100] for v in value[:10]]
        else:
            clean_value = str(value)[:500]

        sanitized[clean_key] = clean_value

    return sanitized
```

---

## Security Headers

### HTTP Security Headers

```python
# app/__init__.py
@app.after_request
def add_security_headers(response):
    """
    Add security headers to all responses
    """
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'

    # XSS protection (legacy browsers)
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Enforce HTTPS
    if not app.debug:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; "
        "style-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    response.headers['Content-Security-Policy'] = csp

    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Permissions policy (restrict features)
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

    return response
```

---

## File System Security

### Secure File Handling

```python
# app/utils/file_handler.py
import os
import uuid
import tempfile
from pathlib import Path

def save_upload_securely(file, job_id):
    """
    Save uploaded file with security measures
    """
    # 1. Create isolated directory for this job
    job_dir = Path(current_app.config['CONVERTED_FOLDER']) / job_id
    job_dir.mkdir(parents=True, exist_ok=True, mode=0o755)

    # 2. Sanitize filename
    safe_filename = sanitize_filename(file.filename)

    # 3. Create unique filename (prevent overwrite)
    file_path = job_dir / safe_filename

    # 4. Save with restricted permissions
    file.save(str(file_path))
    os.chmod(file_path, 0o644)  # Read/write for owner, read for group/others

    return str(file_path)


def get_file_path(job_id, format_type):
    """
    Get file path with directory traversal protection
    """
    # 1. Validate job_id format (UUID)
    try:
        uuid.UUID(job_id)
    except ValueError:
        raise ValueError('Invalid job ID')

    # 2. Validate format
    if format_type not in ['docx', 'pdf']:
        raise ValueError('Invalid format')

    # 3. Build path safely
    base_dir = Path(current_app.config['CONVERTED_FOLDER'])
    job_dir = base_dir / job_id

    # 4. Verify path is within base directory (prevent traversal)
    try:
        job_dir = job_dir.resolve()
        base_dir = base_dir.resolve()

        if not str(job_dir).startswith(str(base_dir)):
            raise ValueError('Path traversal attempt detected')
    except Exception:
        raise ValueError('Invalid path')

    # 5. Find file with correct extension
    for file in job_dir.glob(f'*.{format_type}'):
        return str(file)

    return None
```

### Secure File Deletion

```python
# app/utils/file_handler.py
import shutil
import logging

def secure_delete_file(file_path):
    """
    Securely delete file
    """
    try:
        path = Path(file_path)

        if path.exists():
            # Overwrite with random data (paranoid mode)
            if path.is_file():
                size = path.stat().st_size
                with open(path, 'wb') as f:
                    f.write(os.urandom(size))

            # Delete file/directory
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                shutil.rmtree(path)

            logger.info(f"Securely deleted: {file_path}")

    except Exception as e:
        logger.error(f"Failed to delete {file_path}: {e}")


def cleanup_job_directory(job_id):
    """
    Clean up entire job directory
    """
    job_dir = Path(current_app.config['CONVERTED_FOLDER']) / job_id

    if job_dir.exists() and job_dir.is_dir():
        secure_delete_file(job_dir)
```

---

## Container Security

### Dockerfile Security Best Practices

```dockerfile
# Security hardening in Dockerfile

# 1. Use minimal base image
FROM python:3.12-slim

# 2. Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser

# 3. Set restrictive permissions
RUN mkdir -p /app /tmp/converted && \
    chown -R appuser:appuser /app /tmp/converted && \
    chmod 755 /app && \
    chmod 700 /tmp/converted

# 4. Switch to non-root user early
USER appuser

# 5. Don't expose unnecessary ports
EXPOSE 8080

# 6. Use HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:8080/health || exit 1

# 7. Set read-only filesystem (where possible)
# Runtime: docker run --read-only --tmpfs /tmp:rw,noexec,nosuid,size=1g
```

### Runtime Security

```bash
# Docker run with security options
docker run \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=1g \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  --user appuser \
  -p 8080:8080 \
  md-converter:latest
```

---

## Rate Limiting (Future Implementation)

### Flask-Limiter Integration

```python
# app/__init__.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def create_app(config_name='default'):
    app = Flask(__name__)

    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["100 per hour"],
        storage_uri="memory://"  # Use Redis in production
    )

    return app


# app/api/routes.py
from flask_limiter import Limiter

@api_blueprint.route('/convert', methods=['POST'])
@limiter.limit("10 per minute")  # Max 10 conversions per minute per IP
def convert():
    # Implementation...
    pass
```

---

## Logging and Monitoring for Security

### Security Event Logging

```python
# app/utils/security.py
import logging

security_logger = logging.getLogger('security')

def log_security_event(event_type, details, severity='INFO'):
    """
    Log security-relevant events
    """
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'event_type': event_type,
        'details': details,
        'ip': request.remote_addr if request else 'N/A',
        'user_agent': request.user_agent.string if request else 'N/A'
    }

    if severity == 'CRITICAL':
        security_logger.critical(json.dumps(log_entry))
    elif severity == 'ERROR':
        security_logger.error(json.dumps(log_entry))
    elif severity == 'WARNING':
        security_logger.warning(json.dumps(log_entry))
    else:
        security_logger.info(json.dumps(log_entry))


# Usage examples
# app/api/routes.py
def convert():
    # Log suspicious activity
    if file_size > 50 * 1024 * 1024:  # Unusually large file
        log_security_event(
            'LARGE_FILE_UPLOAD',
            {'size': file_size, 'filename': filename},
            severity='WARNING'
        )

    # Log failed validation
    if not allowed_file(filename):
        log_security_event(
            'INVALID_FILE_TYPE',
            {'filename': filename, 'extension': ext},
            severity='WARNING'
        )
```

### Security Monitoring Alerts

**Monitor for:**
- Multiple failed upload attempts from same IP
- Unusually large file uploads
- Suspicious filename patterns
- High error rates
- Potential DDoS (many requests in short time)

---

## Data Privacy

### Data Retention Policy

**Uploaded Files:**
- Retention: 24 hours maximum
- Storage: Ephemeral (/tmp)
- Deletion: Automatic cleanup

**Conversion Results:**
- Retention: 24 hours
- Access: Single-use (ideally)
- Deletion: Secure deletion

**Logs:**
- Retention: 30 days (Railway default)
- Content: No file contents, only metadata
- Access: Admin only

### GDPR Compliance Considerations

**If deploying in EU:**
- Privacy policy disclosure
- Data processing agreement
- Right to deletion (automatic via 24h cleanup)
- Data breach notification procedures
- Cookie consent (if adding analytics)

---

## Dependency Security

### Vulnerability Scanning

```bash
# Check for known vulnerabilities
pip install safety
safety check -r requirements.txt

# Update dependencies
pip install --upgrade pip
pip install --upgrade -r requirements.txt
```

### Dependency Pinning

```txt
# requirements.txt - Pin exact versions
python-frontmatter==1.0.1
pypandoc-binary==1.13
markdown==3.6
weasyprint==62.3
flask==3.0.3
gunicorn==22.0.0
```

### Regular Updates

**Monthly:**
- Review security advisories
- Update dependencies with patches
- Run vulnerability scans
- Test updated dependencies

---

## Security Testing

### Security Test Checklist

**Input Validation:**
- [ ] Upload non-markdown files
- [ ] Upload files with malicious filenames (../, null bytes)
- [ ] Upload extremely large files
- [ ] Submit empty requests
- [ ] Submit invalid format parameters

**Injection Attacks:**
- [ ] SQL injection (if database added)
- [ ] Command injection via filename
- [ ] HTML injection in metadata
- [ ] YAML injection in front matter

**Authentication/Authorization (future):**
- [ ] Access without credentials
- [ ] Use expired tokens
- [ ] Access other users' files

**Information Disclosure:**
- [ ] Error messages leak stack traces
- [ ] Error messages leak file paths
- [ ] Directory listing enabled

**Denial of Service:**
- [ ] Rapid-fire requests
- [ ] Large payload uploads
- [ ] Recursive file processing (if applicable)

---

## Incident Response Plan

### Security Incident Severity Levels

| Level | Description | Response Time | Actions |
|-------|-------------|---------------|---------|
| Critical | Active attack, data breach | Immediate | Isolate, investigate, notify |
| High | Vulnerability exploitation attempt | < 1 hour | Block IP, patch, monitor |
| Medium | Suspicious activity | < 4 hours | Investigate, log, monitor |
| Low | Anomaly detected | < 24 hours | Review logs, document |

### Response Procedures

**1. Detect**
- Monitor logs for suspicious patterns
- Alert on unusual activity
- Track security metrics

**2. Contain**
- Block attacking IPs
- Throttle suspicious requests
- Isolate affected systems

**3. Investigate**
- Review logs
- Identify attack vector
- Assess damage

**4. Remediate**
- Patch vulnerability
- Update security rules
- Deploy fixes

**5. Document**
- Record incident details
- Document lessons learned
- Update security procedures

---

## Security Best Practices Summary

### Development Phase
1. Input validation on all user inputs
2. Output encoding/escaping
3. Secure coding practices
4. Regular code reviews
5. SAST (Static Application Security Testing)

### Deployment Phase
1. HTTPS enforcement
2. Security headers
3. Non-root container execution
4. Minimal attack surface
5. Regular updates

### Operations Phase
1. Log monitoring
2. Security alerts
3. Regular vulnerability scans
4. Incident response procedures
5. Regular security audits

---

## Conclusion

This security design provides multiple layers of protection:

1. **Network Layer:** HTTPS, DDoS protection
2. **Application Layer:** Input validation, security headers
3. **File Layer:** Type checking, size limits, sanitization
4. **Process Layer:** Non-root execution, isolation
5. **Data Layer:** Automatic cleanup, no persistence

The security measures are appropriate for a utility application while maintaining scalability for future enhancements requiring stronger security (authentication, user accounts, etc.).

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Flask Security Best Practices](https://flask.palletsprojects.com/en/latest/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [STRIDE Threat Model](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)

---

**Next Steps:**
1. Review Implementation Guide for coding standards
2. Implement security measures during Code phase
3. Conduct security testing before deployment
