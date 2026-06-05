"""
routes/auth.py — Register, Login, Company Slots
"""
import re, jwt, bcrypt
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from bson  import ObjectId
import config

auth_bp = Blueprint('auth', __name__)

# ── helpers ──────────────────────────────────────────────
def now(): return datetime.now(timezone.utc)

def make_token(user_id, role):
    """Create a JWT token valid for 7 days."""
    payload = {
        'sub':  str(user_id),
        'role': role,
        'exp':  now() + timedelta(days=7)
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm='HS256')

def decode_token(token):
    """Decode JWT; returns payload dict or raises."""
    return jwt.decode(token, config.SECRET_KEY, algorithms=['HS256'])

def get_current_user():
    """Read Bearer token from request header and return user dict or None."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth.split(' ', 1)[1]
    try:
        payload = decode_token(token)
        user = config.users_col.find_one({'_id': ObjectId(payload['sub'])})
        return user
    except Exception:
        return None

def user_to_dict(user):
    """Serialize a MongoDB user document for the frontend."""
    d = {
        'id':    str(user['_id']),
        'email': user['email'],
        'role':  user['role'],
        'token': make_token(user['_id'], user['role']),
    }
    if user['role'] == 'company':
        d['companyName'] = user.get('companyName', '')
        d['industry']    = user.get('industry',    '')
        d['location']    = user.get('location',    '')
        d['website']     = user.get('website',     '')
    else:
        d['name'] = user.get('name', '')
    return d

def valid_email(e): return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', e))

# ── REGISTER ─────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    if config.users_col is None:
        return jsonify({'error': 'Database not connected'}), 503

    data = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role     = data.get('role', '')

    # Basic validation
    if role not in ('company', 'applicant'):
        return jsonify({'error': 'Role must be company or applicant'}), 400
    if not valid_email(email):
        return jsonify({'error': 'Invalid email address'}), 422
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 422

    # Check email uniqueness
    if config.users_col.find_one({'email': email}):
        return jsonify({'error': 'An account with this email already exists'}), 409

    # Company slot check
    if role == 'company':
        company_count = config.users_col.count_documents({'role': 'company'})
        if company_count >= config.MAX_COMPANIES:
            return jsonify({'error': f'Company slots are full ({config.MAX_COMPANIES}/{config.MAX_COMPANIES}). No new companies can register.'}), 403

        company_name = data.get('companyName', '').strip()
        industry     = data.get('industry',    '').strip()
        location     = data.get('location',    '').strip()
        website      = data.get('website',     '').strip()

        if not company_name: return jsonify({'error': 'Company name is required'}), 422
        if not industry:     return jsonify({'error': 'Industry is required'}), 422
        if not location:     return jsonify({'error': 'Location is required'}), 422

        new_user = {
            'email':       email,
            'password':    bcrypt.hashpw(password.encode(), bcrypt.gensalt()),
            'role':        'company',
            'companyName': company_name,
            'industry':    industry,
            'location':    location,
            'website':     website,
            'createdAt':   now().isoformat(),
        }
    else:
        name = data.get('name', '').strip()
        if not name or len(name) < 2:
            return jsonify({'error': 'Full name is required (min 2 characters)'}), 422

        new_user = {
            'email':     email,
            'password':  bcrypt.hashpw(password.encode(), bcrypt.gensalt()),
            'role':      'applicant',
            'name':      name,
            'createdAt': now().isoformat(),
        }

    result = config.users_col.insert_one(new_user)
    new_user['_id'] = result.inserted_id

    print(f"✅ New {role} registered: {email}")
    return jsonify({'success': True, 'user': user_to_dict(new_user)}), 201

# ── LOGIN ────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    if config.users_col is None:
        return jsonify({'error': 'Database not connected'}), 503

    data = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role     = data.get('role', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = config.users_col.find_one({'email': email})

    if not user or not bcrypt.checkpw(password.encode(), user['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user['role'] != role:
        friendly = 'Company' if user['role'] == 'company' else 'Applicant'
        return jsonify({'error': f'This account is registered as a {friendly}. Please select the correct role.'}), 403

    print(f"✅ Login: {email} ({role})")
    return jsonify({'success': True, 'user': user_to_dict(user)}), 200

# ── COMPANY SLOTS ────────────────────────────────────────
@auth_bp.route('/company-slots', methods=['GET'])
def company_slots():
    if config.users_col is None:
        return jsonify({'available': config.MAX_COMPANIES, 'total': config.MAX_COMPANIES}), 200
    used = config.users_col.count_documents({'role': 'company'})
    return jsonify({
        'used':      used,
        'total':     config.MAX_COMPANIES,
        'available': max(0, config.MAX_COMPANIES - used),
    }), 200
