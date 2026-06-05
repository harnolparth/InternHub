"""
config.py — MongoDB connection + config loader
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI   = os.getenv('MONGO_URI')
DB_NAME     = os.getenv('DB_NAME', 'internhub')
SECRET_KEY  = os.getenv('SECRET_KEY', 'dev-secret-internhub-2025')
PORT        = int(os.getenv('PORT', 5000))
FLASK_ENV   = os.getenv('FLASK_ENV', 'development')

# Max companies allowed on the platform
MAX_COMPANIES = 5

client     = None
db         = None
users_col  = None
roles_col  = None
apps_col   = None

def connect():
    global client, db, users_col, roles_col, apps_col

    if not MONGO_URI:
        print("⚠️  MONGO_URI not set in .env — database disabled")
        return False

    try:
        client    = MongoClient(MONGO_URI, serverSelectionTimeoutMS=6000)
        client.admin.command('ping')
        db        = client[DB_NAME]
        users_col = db['users']
        roles_col = db['roles']
        apps_col  = db['applications']

        # Create indexes for fast lookups
        users_col.create_index('email', unique=True)
        roles_col.create_index('companyId')
        apps_col.create_index([('roleId', 1), ('applicantId', 1)], unique=True)

        print(f"✅ MongoDB connected — database: '{DB_NAME}'")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False
