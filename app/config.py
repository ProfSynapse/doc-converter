"""
Configuration Settings
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/app/config.py

This module defines configuration classes for different environments.
It loads environment variables and sets default values.

Used by: app/__init__.py for application configuration
"""
import os
from pathlib import Path


class Config:
    """Base configuration class"""

    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Application settings
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 10 * 1024 * 1024))  # 10MB
    ALLOWED_EXTENSIONS = {'md', 'markdown', 'txt'}
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE

    # Paths
    BASE_DIR = Path(__file__).parent.parent
    CONVERTED_FOLDER = BASE_DIR / 'tmp' / 'converted'
    TEMPLATE_PATH = BASE_DIR / 'app' / 'templates' / 'template.docx'

    # Conversion settings
    INCLUDE_FRONT_MATTER = True
    CLEANUP_INTERVAL = 24 * 3600  # 24 hours in seconds

    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

    # Production secret key should be set via environment variable
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        import secrets
        SECRET_KEY = secrets.token_hex(32)


class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING = True
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB for testing


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': Config
}
