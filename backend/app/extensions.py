"""
Flask Extensions
Location: /Users/jrosenbaum/Documents/Code/md-converter/app/extensions.py

This module initializes Flask extensions for database access.
Extensions are initialized here and then registered with the app in app/__init__.py.

Used by: app/__init__.py for application factory pattern
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions (will be bound to app in create_app)
db = SQLAlchemy()
migrate = Migrate()
# Cache bust Tue Dec 30 06:35:22 EST 2025
