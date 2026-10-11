"""Entry point for hosting (PythonAnywhere, gunicorn, ...)."""
from app import create_app
application = app = create_app()
