"""
API Package
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/app/api/__init__.py

This package contains the API endpoints and request validation logic.

Modules:
    - routes: API endpoint definitions
    - validators: Request validation utilities
"""
from flask import Blueprint

api_blueprint = Blueprint('api', __name__)

# Import routes to register them with the blueprint
from app.api import routes
