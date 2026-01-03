from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database import get_db_connection
import re

auth = Blueprint('auth', __name__, url_prefix='/auth')

def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

@auth.route('/signup', methods=['POST'])
def signup():
    """Register new user"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()

        # Validation
        if not email or not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        if not password or len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        if not full_name or len(full_name) < 2:
            return jsonify({'error': 'Full name is required'}), 400

        # Check if email already exists
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        existing_user = cursor.fetchone()

        if existing_user:
            conn.close()
            return jsonify({'error': 'Email already registered'}), 409

        # Hash password and insert user
        password_hash = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
            (email, password_hash, full_name)
        )
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Account created successfully'
        }), 201

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth.route('/login', methods=['POST'])
def login():
    """Authenticate user and create session"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        # Find user
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, email, password_hash, full_name FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Create session
        session['user_id'] = user['id']

        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name']
            }
        }), 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth.route('/logout', methods=['POST'])
def logout():
    """Clear user session"""
    session.clear()
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200

@auth.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Basic forgot password handling (placeholder MVP)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        email = data.get('email', '').strip()

        if not email or not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # For MVP: Always return success (security best practice - don't reveal if email exists)
        # Future: Generate reset token and send email

        return jsonify({
            'success': True,
            'message': 'Password reset instructions sent to your email'
        }), 200

    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({'error': 'Request failed'}), 500

@auth.route('/check-session', methods=['GET'])
def check_session():
    """Check if user is logged in"""
    try:
        user_id = session.get('user_id')

        if not user_id:
            return jsonify({'authenticated': False}), 401

        # Get user data
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, email, full_name FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            session.clear()
            return jsonify({'authenticated': False}), 401

        return jsonify({
            'authenticated': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name']
            }
        }), 200

    except Exception as e:
        print(f"Check session error: {str(e)}")
        return jsonify({'authenticated': False}), 401
