"""
WSGI Entry Point
Location: /mnt/c/Users/Joseph/Documents/Code/md-converter/wsgi.py

This module serves as the WSGI entry point for production deployment.
It creates the Flask application instance using the application factory pattern.

Used by: Gunicorn for production serving
Command: gunicorn --bind 0.0.0.0:8080 wsgi:app
"""
import os
from app import create_app

# Determine environment
env = os.environ.get('FLASK_ENV', 'production')

# Create application instance
app = create_app(env)

if __name__ == '__main__':
    # This block is used for development only
    # In production, use Gunicorn instead
    port = int(os.environ.get('PORT', 8080))
    debug = env == 'development'

    print(f'Starting application in {env} mode on port {port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
