"""
routes/roles.py — Internship Role CRUD
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from bson  import ObjectId
from bson.errors import InvalidId
import config
from routes.auth import get_current_user

roles_bp = Blueprint('roles', __name__)

def now(): return datetime.now(timezone.utc).isoformat()

def serialize_role(r, app_count=None, pending=None, selected=None):
    return {
        '_id':              str(r['_id']),
        'companyId':        str(r.get('companyId', '')),
        'companyName':      r.get('companyName', ''),
        'title':            r.get('title', ''),
        'domain':           r.get('domain', ''),
        'location':         r.get('location', ''),
        'duration':         r.get('duration', ''),
        'stipend':          r.get('stipend', ''),
        'openings':         r.get('openings', 1),
        'deadline':         r.get('deadline', ''),
        'skills':           r.get('skills', ''),
        'description':      r.get('description', ''),
        'isOpen':           r.get('isOpen', True),
        'createdAt':        r.get('createdAt', ''),
        'applicationCount': app_count if app_count is not None else 0,
        'pendingCount':     pending   if pending   is not None else 0,
        'selectedCount':    selected  if selected  is not None else 0,
    }

def enrich_with_counts(roles):
    """Attach application counts to each role."""
    result = []
    for r in roles:
        rid   = r['_id']
        total = config.apps_col.count_documents({'roleId': str(rid)})
        pend  = config.apps_col.count_documents({'roleId': str(rid), 'status': 'Pending'})
        sel   = config.apps_col.count_documents({'roleId': str(rid), 'status': 'Selected'})
        result.append(serialize_role(r, total, pend, sel))
    return result

# ── POST A ROLE ──────────────────────────────────────────
@roles_bp.route('', methods=['POST'])
def post_role():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    if user['role'] != 'company':
        return jsonify({'error': 'Only companies can post roles'}), 403

    data = request.get_json() or {}
    required = ['title', 'domain', 'location', 'duration', 'stipend', 'openings', 'deadline', 'skills', 'description']
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 422

    if len(data.get('description', '')) < 30:
        return jsonify({'error': 'Description must be at least 30 characters'}), 422

    new_role = {
        'companyId':   str(user['_id']),
        'companyName': user.get('companyName', ''),
        'title':       data['title'].strip(),
        'domain':      data['domain'],
        'location':    data['location'],
        'duration':    data['duration'],
        'stipend':     data['stipend'].strip(),
        'openings':    int(data['openings']),
        'deadline':    data['deadline'],
        'skills':      data['skills'].strip(),
        'description': data['description'].strip(),
        'isOpen':      True,
        'createdAt':   now(),
    }

    result = config.roles_col.insert_one(new_role)
    new_role['_id'] = result.inserted_id
    print(f"✅ Role posted: '{new_role['title']}' by {user.get('companyName','')}")
    return jsonify({'success': True, 'data': serialize_role(new_role)}), 201

# ── GET ALL ROLES (for applicants) ───────────────────────
@roles_bp.route('', methods=['GET'])
def get_all_roles():
    if config.roles_col is None:
        return jsonify({'success': True, 'data': []}), 200

    roles = list(config.roles_col.find({'isOpen': True}).sort('createdAt', -1))
    return jsonify({'success': True, 'data': enrich_with_counts(roles)}), 200

# ── GET COMPANY'S OWN ROLES ──────────────────────────────
@roles_bp.route('/mine', methods=['GET'])
def get_my_roles():
    user = get_current_user()
    if not user or user['role'] != 'company':
        return jsonify({'error': 'Company auth required'}), 401

    roles = list(config.roles_col.find({'companyId': str(user['_id'])}).sort('createdAt', -1))
    return jsonify({'success': True, 'data': enrich_with_counts(roles)}), 200

# ── DELETE A ROLE ─────────────────────────────────────────
@roles_bp.route('/<role_id>', methods=['DELETE'])
def delete_role(role_id):
    user = get_current_user()
    if not user or user['role'] != 'company':
        return jsonify({'error': 'Company auth required'}), 401

    try:
        oid = ObjectId(role_id)
    except InvalidId:
        return jsonify({'error': 'Invalid role ID'}), 400

    role = config.roles_col.find_one({'_id': oid})
    if not role:
        return jsonify({'error': 'Role not found'}), 404
    if role['companyId'] != str(user['_id']):
        return jsonify({'error': 'You can only delete your own roles'}), 403

    config.roles_col.delete_one({'_id': oid})
    config.apps_col.delete_many({'roleId': role_id})   # cascade delete applications
    print(f"🗑️  Role deleted: {role_id}")
    return jsonify({'success': True, 'message': 'Role and its applications deleted'}), 200
