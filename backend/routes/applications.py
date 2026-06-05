"""
routes/applications.py — Apply, list by role, list mine, update status
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from bson  import ObjectId
from bson.errors import InvalidId
import re, config
from routes.auth import get_current_user

applications_bp = Blueprint('applications', __name__)

def now(): return datetime.now(timezone.utc).isoformat()

def serialize_app(a, role=None, applicant=None):
    """Convert MongoDB application document to JSON-safe dict."""
    return {
        '_id':            str(a['_id']),
        'roleId':         a.get('roleId', ''),
        'roleTitle':      a.get('roleTitle',  role.get('title','')  if role else ''),
        'domain':         a.get('domain',     role.get('domain','') if role else ''),
        'companyName':    a.get('companyName',role.get('companyName','') if role else ''),
        'applicantId':    a.get('applicantId', ''),
        'applicantName':  a.get('applicantName', applicant.get('name','') if applicant else ''),
        'applicantEmail': a.get('applicantEmail', applicant.get('email','') if applicant else ''),
        'skills':         a.get('skills',  ''),
        'phone':          a.get('phone',   ''),
        'college':        a.get('college', ''),
        'resume':         a.get('resume',  ''),
        'status':         a.get('status',  'Pending'),
        'createdAt':      a.get('createdAt', ''),
        'updatedAt':      a.get('updatedAt', ''),
    }

# ── SUBMIT APPLICATION ────────────────────────────────────
@applications_bp.route('', methods=['POST'])
def submit_application():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Login required to apply'}), 401
    if user['role'] != 'applicant':
        return jsonify({'error': 'Only applicants can submit applications'}), 403

    data    = request.get_json() or {}
    role_id = data.get('roleId', '').strip()
    skills  = data.get('skills', '').strip()
    phone   = data.get('phone',  '').strip()
    college = data.get('college','').strip()
    resume  = data.get('resume', '').strip()

    # Validate
    if not role_id:
        return jsonify({'error': 'Role ID is required'}), 400
    if not skills:
        return jsonify({'error': 'Skills are required'}), 422
    if not re.match(r'^[6-9]\d{9}$', phone):
        return jsonify({'error': 'Enter a valid 10-digit Indian mobile number'}), 422
    if len(college) < 3:
        return jsonify({'error': 'College name is required'}), 422
    if len(resume) < 50:
        return jsonify({'error': 'Resume summary must be at least 50 characters'}), 422

    # Check role exists
    try:
        role = config.roles_col.find_one({'_id': ObjectId(role_id)})
    except Exception:
        return jsonify({'error': 'Invalid role ID'}), 400

    if not role:
        return jsonify({'error': 'Role not found'}), 404
    if not role.get('isOpen', True):
        return jsonify({'error': 'This role is no longer accepting applications'}), 409

    # Check not already applied
    existing = config.apps_col.find_one({
        'roleId':      role_id,
        'applicantId': str(user['_id'])
    })
    if existing:
        return jsonify({'error': 'You have already applied for this role'}), 409

    new_app = {
        'roleId':         role_id,
        'roleTitle':      role.get('title', ''),
        'domain':         role.get('domain', ''),
        'companyName':    role.get('companyName', ''),
        'companyId':      role.get('companyId', ''),
        'applicantId':    str(user['_id']),
        'applicantName':  user.get('name', ''),
        'applicantEmail': user.get('email', ''),
        'skills':         skills,
        'phone':          phone,
        'college':        college,
        'resume':         resume,
        'status':         'Pending',
        'createdAt':      now(),
        'updatedAt':      now(),
    }

    result = config.apps_col.insert_one(new_app)
    new_app['_id'] = result.inserted_id

    print(f"✅ Application: {user.get('name','')} → '{role.get('title','')}' at {role.get('companyName','')}")
    return jsonify({'success': True, 'data': serialize_app(new_app)}), 201


# ── GET APPLICATIONS FOR A ROLE (company sees these) ─────
@applications_bp.route('/role/<role_id>', methods=['GET'])
def get_role_applications(role_id):
    user = get_current_user()
    if not user or user['role'] != 'company':
        return jsonify({'error': 'Company auth required'}), 401

    # Verify this role belongs to the company
    try:
        role = config.roles_col.find_one({'_id': ObjectId(role_id)})
    except Exception:
        return jsonify({'error': 'Invalid role ID'}), 400

    if not role:
        return jsonify({'error': 'Role not found'}), 404
    if role.get('companyId') != str(user['_id']):
        return jsonify({'error': 'Access denied'}), 403

    apps = list(
        config.apps_col
        .find({'roleId': role_id})
        .sort('createdAt', -1)
    )
    return jsonify({
        'success': True,
        'count':   len(apps),
        'data':    [serialize_app(a) for a in apps]
    }), 200


# ── GET MY OWN APPLICATIONS (applicant sees these) ───────
@applications_bp.route('/mine', methods=['GET'])
def get_my_applications():
    user = get_current_user()
    if not user or user['role'] != 'applicant':
        return jsonify({'error': 'Applicant auth required'}), 401

    apps = list(
        config.apps_col
        .find({'applicantId': str(user['_id'])})
        .sort('createdAt', -1)
    )
    return jsonify({
        'success': True,
        'data':    [serialize_app(a) for a in apps]
    }), 200


# ── UPDATE APPLICATION STATUS (company action) ───────────
@applications_bp.route('/<app_id>/status', methods=['PUT'])
def update_status(app_id):
    user = get_current_user()
    if not user or user['role'] != 'company':
        return jsonify({'error': 'Company auth required'}), 401

    data       = request.get_json() or {}
    new_status = data.get('status', '')

    valid_statuses = ['Pending', 'Shortlisted', 'Selected', 'Rejected']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 422

    try:
        oid = ObjectId(app_id)
    except InvalidId:
        return jsonify({'error': 'Invalid application ID'}), 400

    app = config.apps_col.find_one({'_id': oid})
    if not app:
        return jsonify({'error': 'Application not found'}), 404

    # Verify the application belongs to a role owned by this company
    role = config.roles_col.find_one({'_id': ObjectId(app['roleId'])})
    if not role or role.get('companyId') != str(user['_id']):
        return jsonify({'error': 'Access denied'}), 403

    config.apps_col.update_one(
        {'_id': oid},
        {'$set': {'status': new_status, 'updatedAt': now()}}
    )

    updated = config.apps_col.find_one({'_id': oid})
    print(f"✅ Status → {new_status}: app {app_id}")
    return jsonify({'success': True, 'data': serialize_app(updated)}), 200
