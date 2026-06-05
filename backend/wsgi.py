"""
wsgi.py — Entry point for Gunicorn (used by Render in production)

Render runs this command to start the server:
    gunicorn wsgi:app

This file must be inside the backend/ folder.
It imports the Flask app AND calls config.connect()
so the database connects when Render starts the server.
"""

import config          # connects to MongoDB
import sys
import os

# Connect to MongoDB when server starts
config.connect()

# Import the Flask app object
from app import app    # noqa: E402  (import after connect is intentional)

# 'app' is what gunicorn looks for:
# gunicorn wsgi:app  →  wsgi.py file, app variable inside it
