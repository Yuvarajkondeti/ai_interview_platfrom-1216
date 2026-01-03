from flask import Flask
from flask_cors import CORS
from backend.database import init_db
from auth import auth
from interview_routes import interview
from backend.emotion_api import emotion
import os
import secrets

# Create Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS

# Enable CORS for frontend
CORS(app, supports_credentials=True, origins=[
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:5500',  # VS Code Live Server
    'http://127.0.0.1:5500'
])

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(interview)
app.register_blueprint(emotion)

# Root route
@app.route('/')
def index():
    return {
        'message': 'AI Interview Platform API',
        'version': '1.0',
        'status': 'running'
    }

# Initialize database on startup
with app.app_context():
    init_db()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("AI Interview Platform Backend Server")
    print("="*60)
    print(f"Server running at: http://localhost:5000")
    print(f"Database location: {os.path.join(os.path.dirname(__file__), 'instance', 'interview.db')}")
    print("\nMake sure Ollama is running at: http://localhost:11434")
    print("To start Ollama: ollama serve")
    print("To pull model: ollama pull llama2")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
