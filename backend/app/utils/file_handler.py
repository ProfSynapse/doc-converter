"""
File Handler Utilities
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/app/utils/file_handler.py

This module provides file operation utilities including:
- Generating unique job identifiers
- Managing job directories
- Cleaning up old files
- Retrieving file paths safely

Used by: app/api/routes.py for file management
"""
import os
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional


logger = logging.getLogger(__name__)


def generate_job_id() -> str:
    """
    Generate unique job identifier.

    Returns:
        UUID string for job identification

    Example:
        >>> job_id = generate_job_id()
        >>> print(job_id)
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    """
    return str(uuid.uuid4())


def get_job_directory(job_id: str, base_dir: str) -> str:
    """
    Get or create directory path for job.

    Args:
        job_id: Unique job identifier
        base_dir: Base directory for converted files

    Returns:
        Path to job directory

    Raises:
        ValueError: If job_id is invalid UUID format
    """
    # Validate job_id format
    try:
        uuid.UUID(job_id)
    except ValueError as e:
        raise ValueError(f'Invalid job ID format: {job_id}') from e

    job_dir = Path(base_dir) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    logger.debug(f'Job directory created/verified: {job_dir}')

    return str(job_dir)


def get_file_path(job_id: str, format_type: str, base_dir: str) -> Optional[str]:
    """
    Get path to converted file with directory traversal protection.

    Args:
        job_id: Unique job identifier
        format_type: File format (docx or pdf)
        base_dir: Base directory for converted files

    Returns:
        Path to file if exists, None otherwise

    Raises:
        ValueError: If job_id or format is invalid
    """
    # Validate job_id format
    try:
        uuid.UUID(job_id)
    except ValueError as e:
        raise ValueError(f'Invalid job ID format: {job_id}') from e

    # Validate format
    if format_type not in ['docx', 'pdf']:
        raise ValueError(f'Invalid format: {format_type}. Must be docx or pdf.')

    # Build path safely
    base_path = Path(base_dir).resolve()
    job_dir = (base_path / job_id).resolve()

    # Verify path is within base directory (prevent traversal)
    if not str(job_dir).startswith(str(base_path)):
        logger.warning(f'Path traversal attempt detected: {job_id}')
        raise ValueError('Path traversal attempt detected')

    # Check if job directory exists
    if not job_dir.exists():
        logger.debug(f'Job directory not found: {job_dir}')
        return None

    # Find file with correct extension
    for file_path in job_dir.glob(f'*.{format_type}'):
        logger.debug(f'Found file: {file_path}')
        return str(file_path)

    logger.debug(f'No {format_type} file found in {job_dir}')
    return None


def cleanup_old_files(base_dir: str, max_age_hours: int = 24) -> int:
    """
    Delete files and directories older than specified age.

    Args:
        base_dir: Base directory for converted files
        max_age_hours: Maximum age in hours before deletion

    Returns:
        Number of directories deleted

    Example:
        >>> deleted = cleanup_old_files('/tmp/converted', max_age_hours=24)
        >>> print(f'Deleted {deleted} old job directories')
    """
    if not os.path.exists(base_dir):
        logger.warning(f'Base directory does not exist: {base_dir}')
        return 0

    converted_dir = Path(base_dir)
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    deleted_count = 0

    logger.info(f'Starting cleanup of files older than {max_age_hours} hours')

    for job_dir in converted_dir.iterdir():
        if not job_dir.is_dir():
            continue

        try:
            # Check directory age
            dir_mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)

            if dir_mtime < cutoff_time:
                # Delete directory and contents
                shutil.rmtree(job_dir)
                deleted_count += 1
                logger.info(f'Deleted expired job directory: {job_dir.name}')

        except Exception as e:
            logger.error(f'Failed to delete directory {job_dir}: {e}')
            continue

    logger.info(f'Cleanup completed. Deleted {deleted_count} directories.')
    return deleted_count


def secure_delete_file(file_path: str) -> bool:
    """
    Securely delete a file or directory.

    Args:
        file_path: Path to file or directory to delete

    Returns:
        True if deletion successful, False otherwise
    """
    try:
        path = Path(file_path)

        if not path.exists():
            logger.debug(f'Path does not exist: {file_path}')
            return False

        if path.is_file():
            # For extra security, overwrite with random data before deletion
            size = path.stat().st_size
            with open(path, 'wb') as f:
                f.write(os.urandom(min(size, 1024)))  # Overwrite first KB
            path.unlink()
            logger.debug(f'Securely deleted file: {file_path}')

        elif path.is_dir():
            shutil.rmtree(path)
            logger.debug(f'Deleted directory: {file_path}')

        return True

    except Exception as e:
        logger.error(f'Failed to delete {file_path}: {e}')
        return False


def get_file_info(file_path: str) -> dict:
    """
    Get information about a file.

    Args:
        file_path: Path to file

    Returns:
        Dictionary with file information

    Raises:
        FileNotFoundError: If file does not exist
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f'File not found: {file_path}')

    stat = path.stat()

    return {
        'filename': path.name,
        'size': stat.st_size,
        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'extension': path.suffix
    }


def is_job_expired(job_id: str, base_dir: str, max_age_hours: int = 24) -> bool:
    """
    Check if a job has expired based on directory age.

    Args:
        job_id: Unique job identifier
        base_dir: Base directory for converted files
        max_age_hours: Maximum age in hours

    Returns:
        True if expired, False otherwise
    """
    job_dir = Path(base_dir) / job_id

    if not job_dir.exists():
        return True  # Non-existent is considered expired

    try:
        dir_mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        return dir_mtime < cutoff_time
    except Exception as e:
        logger.error(f'Error checking job expiration: {e}')
        return True  # Assume expired on error
