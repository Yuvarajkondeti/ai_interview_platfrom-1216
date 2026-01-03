# AI Interview Platform

A full-stack AI-powered interview practice platform with real-time emotion detection, posture analysis, and voice interaction.

## 🚀 Features

- **Voice-Based Interviews** - Fully voice-driven interviews using Web Speech API (no typing required)
- **AI Question Generation** - Dynamic interview questions powered by Ollama/LLaMA
- **Emotion Detection** - Real-time emotion tracking using DeepFace (updates every 1.5 seconds)
- **Posture Analysis** - Live posture detection with MediaPipe Pose (Good/Average/Poor feedback)
- **Automatic Flow** - 5-second silence detection advances questions automatically
- **Interview History** - Review past interviews with Q&A, emotion timeline, and posture summary
- **Session-Based Auth** - Secure authentication with SQLite database

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **pip** - Python package manager (comes with Python)
- **Ollama** - Local LLM server [Download Ollama](https://ollama.ai/download)
- **Modern Browser** - Chrome or Edge (for Web Speech API support)
- **Webcam & Microphone** - Required for interview functionality

## 🛠️ Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd ai_interview_platfrom
```

### Step 2: Backend Setup

#### 2.1 Navigate to backend directory
```bash
cd backend
```

#### 2.2 Create Python virtual environment (recommended)
```bash
# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

#### 2.3 Install Python dependencies
```bash
pip install -r requirements.txt
```

This will install:
- Flask (web framework)
- Flask-CORS (cross-origin support)
- OpenCV (image processing)
- DeepFace (emotion detection)
- TensorFlow & tf-keras (deep learning)
- Requests (HTTP client)

**Note:** The installation may take 5-10 minutes due to TensorFlow.

#### 2.4 Configure environment variables (Optional)

Create a `.env` file in the `backend` directory:

```bash
FLASK_SECRET_KEY=your-secret-key-here-change-in-production
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2
FLASK_DEBUG=True
```

**Security Note:** For production, generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 3: Ollama Setup (AI Question Generation)

#### 3.1 Install Ollama
Download and install from [https://ollama.ai/download](https://ollama.ai/download)

#### 3.2 Pull the LLaMA2 model
```bash
ollama pull llama2
```

#### 3.3 Start Ollama server
```bash
# Ollama usually starts automatically as a service
# If not, run:
ollama serve
```

#### 3.4 Verify Ollama is running
```bash
curl http://localhost:11434/api/version
```

You should see a version response. If not, check Ollama installation.

### Step 4: Frontend Setup

The frontend is pure HTML/CSS/JavaScript - no build step required!

Just navigate to the frontend directory:
```bash
cd ../frontend  # from backend directory
```

## 🎬 Running the Application

You need **3 terminals** running simultaneously:

### Terminal 1: Ollama (AI Service)
```bash
ollama serve
```
Keep this running in the background. Ollama must be active for question generation.

### Terminal 2: Flask Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

You should see:
```
============================================================
AI Interview Platform Backend Server
============================================================
Server running at: http://localhost:5000
Database location: /path/to/backend/instance/interview.db
============================================================
```

### Terminal 3: Frontend Server
```bash
cd frontend
python3 -m http.server 8000
```

You should see:
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

**Alternative frontend servers:**
```bash
# Using Node.js http-server
npx http-server -p 8000

# Using PHP
php -S localhost:8000

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

## 🌐 Access the Application

Open your browser and navigate to:

**http://localhost:8000**

You should see the landing page with "Welcome to AI Interview Platform"

## 📖 Usage Guide

### First Time Setup

1. **Sign Up**
   - Click "Get Started" or "Sign Up"
   - Enter your full name, email, and password (min 8 characters)
   - Submit to create your account

2. **Login**
   - Use your email and password to login
   - You'll be redirected to the home dashboard

3. **Grant Permissions**
   - When starting your first interview, the browser will ask for:
     - Camera permission (for emotion & posture detection)
     - Microphone permission (for voice interaction)
   - **Click "Allow"** for both

### Conducting an Interview

1. **Start Interview**
   - From dashboard, click "Start New Interview"
   - Enter a job role (e.g., "Software Engineer", "Data Scientist")
   - Verify camera preview shows your face
   - Click "Begin Interview"

2. **During Interview**
   - AI will speak questions out loud
   - Speak your answers naturally (no typing!)
   - AI detects 5 seconds of silence and automatically moves to next question
   - Watch the bottom-right overlay for real-time:
     - Emotion: happy/sad/neutral/angry/surprise (% confidence)
     - Posture: Good 🧍 / Average 🙂 / Poor 🪑
   - Interview includes 10 questions total

3. **Interview Completion**
   - After 10 questions, interview ends automatically
   - System calculates overall emotion and posture
   - Redirects to "Previous Interviews" page

4. **Review Performance**
   - View all past interviews on "Previous Interviews" page
   - Click any interview card to see details:
     - **Q&A Tab:** All questions and your answers
     - **Emotion Timeline:** Emotion changes throughout interview
     - **Posture Summary:** Distribution of Good/Average/Poor posture

## 🔧 Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'flask'`
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Problem:** `ImportError: DeepFace could not be imported`
```bash
pip install deepface tf-keras tensorflow==2.20.0
```

**Problem:** Database errors
```bash
# Delete existing database and restart
rm backend/instance/interview.db
python app.py  # Database will be recreated
```

### Ollama Issues

**Problem:** "AI service unavailable" error during interview
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# If not running, start it
ollama serve

# Make sure llama2 model is installed
ollama pull llama2
```

**Problem:** Slow question generation
- First question may take 10-30 seconds (model loading)
- Subsequent questions should be faster (2-5 seconds)
- This is normal behavior for local LLM

### Frontend Issues

**Problem:** "Speech recognition not supported"
- **Solution:** Use Chrome or Edge browser (Safari/Firefox have limited support)

**Problem:** Camera/microphone not working
- **Solution:** Grant browser permissions in browser settings
- Chrome: Settings → Privacy and Security → Site Settings → Camera/Microphone

**Problem:** Emotion detection not updating
- **Solution:** Ensure backend is running and you're facing the camera
- Check browser console for errors (F12)
- Verify face is visible in camera preview

**Problem:** CORS errors in browser console
```bash
# Make sure Flask backend is running with CORS enabled
# Frontend must be on port 8000 (or update CORS config in backend/app.py)
```

### Voice Recognition Issues

**Problem:** Voice not being detected
- Speak clearly and at moderate volume
- Check microphone is working (test in system settings)
- Verify browser has microphone permission

**Problem:** Interview advances too quickly
- This is 5-second silence detection (by design)
- Speak continuously or in shorter intervals
- Silence timer resets each time you speak

## 📁 Project Structure

```
ai_interview_platfrom/
├── backend/                      # Flask backend
│   ├── app.py                    # Main Flask application
│   ├── database.py               # SQLite schema & helpers
│   ├── auth.py                   # Authentication routes
│   ├── interview_routes.py       # Interview API endpoints
│   ├── emotion_api.py            # DeepFace emotion detection
│   ├── requirements.txt          # Python dependencies
│   └── instance/                 # Auto-created on first run
│       └── interview.db          # SQLite database
│
├── frontend/                     # Vanilla HTML/CSS/JS frontend
│   ├── index.html                # Landing page
│   ├── login.html                # Login page
│   ├── signup.html               # Signup page
│   ├── forgot_password.html      # Forgot password (MVP)
│   ├── home.html                 # User dashboard
│   ├── start_interview.html      # Pre-interview setup
│   ├── interview.html            # Full-screen interview (CRITICAL)
│   ├── about.html                # About page
│   ├── previous_interviews.html  # Interview history
│   ├── css/
│   │   └── styles.css            # Global styles
│   └── js/
│       ├── auth.js               # Authentication helpers
│       ├── interview.js          # Interview flow logic
│       └── ai_overlay.js         # Emotion & posture detection
│
└── README.md                     # This file
```

## 🗃️ Database Schema

The SQLite database includes:

- **users** - User accounts (email, password_hash, full_name)
- **interviews** - Interview sessions (user_id, job_role, status, overall_emotion, overall_posture)
- **interview_questions** - Questions asked (interview_id, question_text, question_number)
- **interview_answers** - User responses (question_id, answer_text)
- **emotion_timeline** - Emotion tracking (interview_id, emotion_label, confidence, timestamp)
- **posture_events** - Posture tracking (interview_id, posture_label, timestamp)

## 🔐 Security Notes

- Passwords are hashed using Werkzeug's secure password hashing
- Session cookies are HTTP-only
- SQLite database uses parameterized queries (SQL injection protection)
- CORS is configured for local development only
- **For production deployment:**
  - Set `FLASK_SECRET_KEY` to a secure random value
  - Enable HTTPS
  - Configure proper CORS origins
  - Use PostgreSQL instead of SQLite
  - Set `FLASK_DEBUG=False`

## 🎯 Technical Stack

**Backend:**
- Flask 3.0.0 (Python web framework)
- SQLite (database)
- DeepFace 0.0.79 (emotion detection)
- TensorFlow 2.20.0 (deep learning)
- OpenCV 4.8.1 (image processing)
- Ollama/LLaMA (local LLM for question generation)

**Frontend:**
- Vanilla HTML5/CSS3/JavaScript (no frameworks)
- Web Speech API (voice recognition & synthesis)
- MediaPipe Pose (posture detection via CDN)
- Responsive design (mobile-friendly)

## 🤝 Contributing

This is a learning project. Feel free to fork and customize!

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

- **DeepFace** - Emotion detection
- **MediaPipe** - Pose estimation
- **Ollama** - Local LLM inference
- **Flask** - Python web framework

---

**Built with Claude Code** 🤖

For issues or questions, please check the troubleshooting section above.
