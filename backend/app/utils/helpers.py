"""
Helper Utilities
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/app/utils/helpers.py

This module provides general helper functions including:
- Error response formatting
- File size formatting
- Timestamp utilities
- MIME type detection

Used by: app/api/routes.py for response formatting
"""
import os
import mimetypes
import logging
from datetime import datetime
from typing import Dict, Any, Optional


logger = logging.getLogger(__name__)


def format_error_response(
    code: str,
    message: str,
    status: int,
    extra: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format error response in standard format.

    Args:
        code: Error code identifier
        message: Human-readable error message
        status: HTTP status code
        extra: Optional extra fields to include

    Returns:
        Formatted error response dictionary

    Example:
        >>> error = format_error_response(
        ...     'FILE_TOO_LARGE',
        ...     'File exceeds 10MB limit',
        ...     413,
        ...     {'max_size': 10485760}
        ... )
    """
    response = {
        'error': message,
        'code': code,
        'status': status,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }

    if extra:
        response.update(extra)

    return response


def format_success_response(
    data: Dict[str, Any],
    status: int = 200
) -> tuple:
    """
    Format success response with timestamp.

    Args:
        data: Response data dictionary
        status: HTTP status code (default 200)

    Returns:
        Tuple of (response dict, status code)

    Example:
        >>> response, code = format_success_response({
        ...     'job_id': '12345',
        ...     'filename': 'doc.pdf'
        ... })
    """
    response = {
        'status': 'success',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    response.update(data)

    return response, status


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.

    Args:
        size_bytes: File size in bytes

    Returns:
        Formatted size string

    Example:
        >>> format_file_size(1024)
        '1.0 KB'
        >>> format_file_size(1536000)
        '1.5 MB'
    """
    if size_bytes == 0:
        return '0 B'

    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)

    while size >= 1024.0 and unit_index < len(units) - 1:
        size /= 1024.0
        unit_index += 1

    return f'{size:.1f} {units[unit_index]}'


def get_mime_type(format_type: str) -> str:
    """
    Get MIME type for file format.

    Args:
        format_type: File format (docx, pdf, etc.)

    Returns:
        MIME type string

    Example:
        >>> get_mime_type('docx')
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        >>> get_mime_type('pdf')
        'application/pdf'
    """
    mime_types = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pdf': 'application/pdf',
        'md': 'text/markdown',
        'markdown': 'text/markdown',
        'txt': 'text/plain'
    }

    return mime_types.get(format_type.lower(), 'application/octet-stream')


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename.

    Args:
        filename: Filename

    Returns:
        File extension without dot

    Example:
        >>> get_file_extension('document.md')
        'md'
        >>> get_file_extension('report.pdf')
        'pdf'
    """
    if '.' not in filename:
        return ''

    return filename.rsplit('.', 1)[1].lower()


def calculate_processing_time(start_time: datetime) -> float:
    """
    Calculate processing time in seconds.

    Args:
        start_time: Start timestamp

    Returns:
        Processing time in seconds

    Example:
        >>> from datetime import datetime
        >>> start = datetime.utcnow()
        >>> # ... do work ...
        >>> duration = calculate_processing_time(start)
        >>> print(f'Took {duration:.2f} seconds')
    """
    end_time = datetime.utcnow()
    delta = end_time - start_time
    return delta.total_seconds()


def generate_timestamp() -> str:
    """
    Generate ISO 8601 timestamp.

    Returns:
        ISO formatted timestamp string

    Example:
        >>> timestamp = generate_timestamp()
        >>> print(timestamp)
        '2025-10-31T10:30:00Z'
    """
    return datetime.utcnow().isoformat() + 'Z'


def safe_int(value: Any, default: int = 0) -> int:
    """
    Safely convert value to integer.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Integer value or default

    Example:
        >>> safe_int('42')
        42
        >>> safe_int('invalid', default=10)
        10
    """
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_bool(value: Any, default: bool = False) -> bool:
    """
    Safely convert value to boolean.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Boolean value or default

    Example:
        >>> safe_bool('true')
        True
        >>> safe_bool('yes')
        True
        >>> safe_bool('invalid', default=False)
        False
    """
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.lower() in ('true', 'yes', '1', 'on')

    try:
        return bool(value)
    except (ValueError, TypeError):
        return default


def truncate_string(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """
    Truncate string to maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated

    Returns:
        Truncated string

    Example:
        >>> truncate_string('This is a very long string', max_length=10)
        'This is...'
    """
    if len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix


def ensure_directory_exists(directory: str) -> bool:
    """
    Ensure directory exists, create if it doesn't.

    Args:
        directory: Directory path

    Returns:
        True if directory exists or was created

    Example:
        >>> ensure_directory_exists('/tmp/mydir')
        True
    """
    try:
        os.makedirs(directory, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f'Failed to create directory {directory}: {e}')
        return False


def build_download_response(job_id: str, filename: str, format_type: str) -> Dict[str, Any]:
    """
    Build download URL response.

    Args:
        job_id: Job identifier
        filename: Original filename
        format_type: File format (docx, pdf)

    Returns:
        Response dictionary with download information

    Example:
        >>> response = build_download_response('abc123', 'doc.docx', 'docx')
        >>> print(response['download_url'])
        '/api/download/abc123/docx'
    """
    return {
        'download_url': f'/api/download/{job_id}/{format_type}',
        'filename': filename,
        'mimetype': get_mime_type(format_type)
    }
