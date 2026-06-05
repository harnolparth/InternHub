"""
app.py — InternHub Flask Server Entry Point

Run with:
    cd backend
    python app.py
"""
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import config
from routes.auth         import auth_bp
from routes.roles        import roles_bp
from routes.applications import applications_bp

# ── Create Flask app ──────────────────────────────────────
app = Flask(
    __name__,
    static_folder='../frontend',
    static_url_path=''
)
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['DEBUG']      = config.FLASK_ENV == 'development'

if config.db is None:
    config.connect()

# ── CORS ──────────────────────────────────────────────────
# Allow requests from any localhost port (dev) and file://
CORS(app, resources={
    r'/api/*': {
        'origins':'*',
        'methods': ['GET','POST','PUT','DELETE','OPTIONS'],
        'allow_headers': ['Content-Type','Authorization']
    }
})

# ── Register blueprints ───────────────────────────────────
app.register_blueprint(auth_bp,         url_prefix='/api/auth')
app.register_blueprint(roles_bp,        url_prefix='/api/roles')
app.register_blueprint(applications_bp, url_prefix='/api/applications')

# ── Serve frontend HTML pages ─────────────────────────────
@app.route('/')
def index():        return send_from_directory(app.static_folder, 'index.html')

@app.route('/login')
@app.route('/login.html')
def login_page():   return send_from_directory(app.static_folder, 'login.html')

@app.route('/register')
@app.route('/register.html')
def register_page(): return send_from_directory(app.static_folder, 'register.html')

@app.route('/company-dashboard')
@app.route('/company-dashboard.html')
def company_dash(): return send_from_directory(app.static_folder, 'company-dashboard.html')

@app.route('/post-role')
@app.route('/post-role.html')
def post_role():    return send_from_directory(app.static_folder, 'post-role.html')

@app.route('/applicant-dashboard')
@app.route('/applicant-dashboard.html')
def applicant_dash(): return send_from_directory(app.static_folder, 'applicant-dashboard.html')

# ── Health check ──────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({
        'status':   'running',
        'database': 'connected' if config.db is not None else 'disconnected',
        'message':  '✅ InternHub API is running'
    }), 200

# ── Error handlers ────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

# ── Start ─────────────────────────────────────────────────
if __name__ == '__main__':
    config.connect()   # Connect to MongoDB

    print("\n" + "="*56)
    print("  🚀  InternHub — Starting Server")
    print("="*56)
    print(f"  🗄️   Database : {'✅ Connected' if config.db is not None else '⚠️  Not connected'}")
    print(f"  🌐  URL      : http://localhost:{config.PORT}")
    print(f"  🔧  Mode     : {config.FLASK_ENV.upper()}")
    
    app.run(host='0.0.0.0', port=config.PORT, debug=app.config['DEBUG'])