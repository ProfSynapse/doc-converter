"""
Security Utilities
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/app/utils/security.py

This module provides security utilities including:
- Filename sanitization
- Content validation
- Input sanitization for metadata

Used by: app/api/validators.py and app/converters/markdown_converter.py
"""
import re
import logging
from pathlib import Path
from typing import Dict, Any
from werkzeug.utils import secure_filename as werkzeug_secure_filename


logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and other attacks.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for storage

    Example:
        >>> sanitize_filename("../../etc/passwd")
        'passwd'
        >>> sanitize_filename("my document.md")
        'my_document.md'
    """
    # Use werkzeug's secure_filename as base
    safe_name = werkzeug_secure_filename(filename)

    # Additional sanitization
    # Remove any remaining path separators
    safe_name = safe_name.replace('/', '').replace('\\', '')

    # Remove special characters that could cause issues
    safe_name = re.sub(r'[^\w\s.-]', '', safe_name)

    # Replace multiple spaces/underscores with single underscore
    safe_name = re.sub(r'[\s_]+', '_', safe_name)

    # Limit length to 255 characters (filesystem limit)
    if len(safe_name) > 255:
        base, ext = Path(safe_name).stem, Path(safe_name).suffix
        max_base_len = 255 - len(ext)
        safe_name = base[:max_base_len] + ext

    # Ensure not empty after sanitization
    if not safe_name or safe_name == '.':
        safe_name = 'unnamed.md'

    logger.debug(f'Sanitized filename: {filename} -> {safe_name}')
    return safe_name


def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize metadata fields to prevent injection attacks.

    Args:
        metadata: Dictionary of metadata fields

    Returns:
        Sanitized metadata dictionary

    Example:
        >>> metadata = {'title': '<script>alert("xss")</script>'}
        >>> sanitized = sanitize_metadata(metadata)
        >>> print(sanitized['title'])
        'alert("xss")'
    """
    sanitized = {}

    for key, value in metadata.items():
        # Sanitize key (alphanumeric, underscore, hyphen only)
        clean_key = re.sub(r'[^\w-]', '_', str(key))[:50]

        # Sanitize value based on type
        if isinstance(value, str):
            # Remove HTML/script tags
            clean_value = re.sub(r'<[^>]+>', '', value)
            # Remove potential JavaScript
            clean_value = re.sub(r'javascript:', '', clean_value, flags=re.IGNORECASE)
            # Limit length
            clean_value = clean_value[:500]

        elif isinstance(value, (int, float, bool)):
            clean_value = value

        elif isinstance(value, list):
            # Sanitize list items
            clean_value = []
            for item in value[:10]:  # Limit list size
                if isinstance(item, str):
                    item_clean = re.sub(r'<[^>]+>', '', str(item))[:100]
                    clean_value.append(item_clean)
                else:
                    clean_value.append(str(item)[:100])

        elif isinstance(value, dict):
            # Recursively sanitize nested dicts
            clean_value = sanitize_metadata(value)

        else:
            # Convert other types to string and sanitize
            clean_value = re.sub(r'<[^>]+>', '', str(value))[:500]

        if clean_key:
            sanitized[clean_key] = clean_value

    return sanitized


def validate_file_content(content: str, max_size: int = 10 * 1024 * 1024) -> bool:
    """
    Validate file content for safety.

    Args:
        content: File content string
        max_size: Maximum allowed size in bytes

    Returns:
        True if valid, False otherwise

    Raises:
        ValueError: If content is invalid with reason
    """
    # Check size
    content_size = len(content.encode('utf-8'))
    if content_size > max_size:
        raise ValueError(f'Content too large: {content_size} bytes (max: {max_size})')

    # Check for null bytes (binary file indicator)
    if '\x00' in content:
        raise ValueError('Binary content detected in text file')

    # Check for suspicious patterns (log but don't block)
    suspicious_patterns = [
        r'<script[^>]*>',
        r'javascript:',
        r'onerror=',
        r'onload=',
        r'eval\(',
        r'exec\('
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            logger.warning(f'Suspicious pattern detected in content: {pattern}')
            # Don't block - markdown rendering will escape HTML

    return True


def check_allowed_extension(filename: str, allowed_extensions: set) -> bool:
    """
    Check if file extension is allowed.

    Args:
        filename: Filename to check
        allowed_extensions: Set of allowed extensions (without dots)

    Returns:
        True if allowed, False otherwise

    Example:
        >>> check_allowed_extension('doc.md', {'md', 'markdown'})
        True
        >>> check_allowed_extension('doc.exe', {'md', 'markdown'})
        False
    """
    if '.' not in filename:
        return False

    ext = filename.rsplit('.', 1)[1].lower()
    return ext in allowed_extensions


def sanitize_path_component(component: str) -> str:
    """
    Sanitize a path component to prevent directory traversal.

    Args:
        component: Path component string

    Returns:
        Sanitized path component

    Example:
        >>> sanitize_path_component("../../../etc")
        'etc'
    """
    # Remove parent directory references
    component = component.replace('..', '')
    component = component.replace('./', '')

    # Remove leading/trailing slashes
    component = component.strip('/')
    component = component.strip('\\')

    # Remove special characters
    component = re.sub(r'[^\w.-]', '_', component)

    return component


def is_safe_redirect_url(url: str, allowed_hosts: list) -> bool:
    """
    Check if a redirect URL is safe.

    Args:
        url: URL to validate
        allowed_hosts: List of allowed hostnames

    Returns:
        True if safe, False otherwise
    """
    if not url:
        return False

    # Only allow relative URLs or URLs from allowed hosts
    if url.startswith('/'):
        return True

    # Check for allowed hosts
    from urllib.parse import urlparse
    parsed = urlparse(url)

    if not parsed.scheme or not parsed.netloc:
        return True  # Relative URL

    return parsed.netloc in allowed_hosts


def generate_csrf_token() -> str:
    """
    Generate a CSRF token.

    Returns:
        Random CSRF token string
    """
    import secrets
    return secrets.token_urlsafe(32)


def validate_csrf_token(token: str, session_token: str) -> bool:
    """
    Validate CSRF token against session token.

    Args:
        token: Token from request
        session_token: Token from session

    Returns:
        True if valid, False otherwise
    """
    import secrets
    try:
        return secrets.compare_digest(token, session_token)
    except (TypeError, ValueError):
        return False
