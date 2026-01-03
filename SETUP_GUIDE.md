# 🚀 AI Interview Platform - Complete Setup Guide

Follow these steps **exactly** to get the AI Interview Platform running on your machine.

---

## ✅ Step-by-Step Setup Instructions

### **STEP 1: Install Prerequisites**

#### 1.1 Install Python
- **Download:** https://www.python.org/downloads/
- **Version:** Python 3.10 or higher
- **Verify installation:**
  ```bash
  python --version
  # Should show: Python 3.10.x or higher
  ```

#### 1.2 Install Ollama (AI Question Generator)
- **Download:** https://ollama.ai/download
- **Install** the application for your operating system
- **Verify installation:**
  ```bash
  ollama --version
  # Should show version number
  ```

---

### **STEP 2: Clone the Repository**

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/ai_interview_platfrom.git

# Navigate into the project
cd ai_interview_platfrom
```

---

### **STEP 3: Setup Backend (Flask Server)**

#### 3.1 Open Terminal #1 (Backend)

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# You should see (venv) in your terminal prompt now
```

#### 3.2 Install Python Packages

```bash
# Install all dependencies (takes 5-10 minutes)
pip install -r requirements.txt

# Wait for installation to complete
# You should see "Successfully installed flask... deepface... tensorflow..."
```

---

### **STEP 4: Setup Ollama (AI Model)**

#### 4.1 Open Terminal #2 (Ollama)

```bash
# Pull the AI model (this downloads ~4GB)
ollama pull llama2

# Wait for download to complete
# You should see: "success"
```

#### 4.2 Start Ollama Server

```bash
# Start Ollama (keep this terminal open!)
ollama serve

# You should see: "Listening on 127.0.0.1:11434"
# DO NOT CLOSE THIS TERMINAL - keep it running
```

---

### **STEP 5: Start Backend Server**

#### 5.1 Go Back to Terminal #1 (Backend)

```bash
# Make sure you're in the backend folder with venv activated
# You should see: (venv) in your terminal

# Start Flask server
python app.py

# You should see:
# ============================================================
# AI Interview Platform Backend Server
# ============================================================
# Server running at: http://localhost:5000
# ============================================================

# DO NOT CLOSE THIS TERMINAL - keep it running
```

---

### **STEP 6: Start Frontend Server**

#### 6.1 Open Terminal #3 (Frontend)

```bash
# Navigate to frontend folder from project root
cd frontend

# Start HTTP server
python3 -m http.server 8000

# You should see: "Serving HTTP on 0.0.0.0 port 8000"
# DO NOT CLOSE THIS TERMINAL - keep it running
```

---

### **STEP 7: Open the Application**

1. **Open your browser** (Chrome or Edge recommended)
2. **Go to:** http://localhost:8000
3. **You should see:** "Welcome to AI Interview Platform" landing page

---

## 🎯 First Time Usage

### Create an Account

1. Click **"Get Started"** button
2. Fill in:
   - Full Name: `Your Name`
   - Email: `your@email.com`
   - Password: `password123` (min 8 characters)
3. Click **"Sign Up"**
4. You'll be redirected to login page
5. Login with your email and password

### Start Your First Interview

1. From dashboard, click **"Start New Interview"**
2. Enter job role: `Software Engineer` (or any role)
3. **Grant permissions** when browser asks:
   - ✅ Allow Camera
   - ✅ Allow Microphone
4. Verify camera preview shows your face
5. Click **"Begin Interview"**

### During the Interview

- 🎤 **Listen** - AI speaks questions out loud
- 🗣️ **Answer** - Speak your answer naturally
- ⏱️ **5 seconds of silence** - Automatically moves to next question
- 📊 **Watch overlay** - Bottom-right shows:
  - Emotion: happy/sad/neutral/angry/surprise
  - Posture: Good 🧍 / Average 🙂 / Poor 🪑
- 🔟 **10 questions total** - Interview ends automatically

### Review Your Interview

1. After interview completes, you'll be redirected to "Previous Interviews"
2. Click any interview card to see:
   - **Q&A Tab:** All questions and your answers
   - **Emotion Timeline:** How your emotions changed
   - **Posture Summary:** Good/Average/Poor breakdown

---

## 🔧 Common Issues & Solutions

### ❌ Backend won't start

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
cd backend
source venv/bin/activate  # Make sure venv is activated
pip install -r requirements.txt
```

---

### ❌ "AI service unavailable" during interview

**Error:** Questions won't generate

**Solution:**
```bash
# Check Ollama is running:
curl http://localhost:11434/api/version

# If no response, start Ollama:
ollama serve

# In another terminal:
ollama pull llama2
```

---

### ❌ Camera/Microphone not working

**Solution:**
1. Check browser permissions:
   - Chrome: Click 🔒 icon in address bar → Permissions → Allow camera & microphone
2. Check system permissions:
   - Mac: System Preferences → Security & Privacy → Camera/Microphone
   - Windows: Settings → Privacy → Camera/Microphone

---

### ❌ "Speech recognition not supported"

**Solution:** Use **Chrome** or **Edge** browser. Safari and Firefox have limited support.

---

### ❌ Emotion detection not updating

**Solutions:**
1. Make sure backend is running (Terminal #1)
2. Make sure your face is visible in camera
3. Check browser console (F12) for errors
4. Refresh the page and try again

---

### ❌ CORS errors

**Error:** Console shows CORS policy errors

**Solution:**
1. Make sure frontend is on port 8000: `http://localhost:8000`
2. Make sure backend is on port 5000: `http://localhost:5000`
3. Restart both servers

---

## 📋 Quick Reference - Required Terminals

You need **3 terminals running simultaneously**:

| Terminal | Command | What it does |
|----------|---------|--------------|
| **#1 Backend** | `cd backend && source venv/bin/activate && python app.py` | Flask API server |
| **#2 Ollama** | `ollama serve` | AI question generation |
| **#3 Frontend** | `cd frontend && python3 -m http.server 8000` | Web interface |

---

## 🎓 Tips for Best Experience

1. **Good Lighting** - Face the light for better emotion detection
2. **Quiet Environment** - Reduce background noise for better voice recognition
3. **Sit Upright** - Good posture improves posture detection accuracy
4. **Speak Clearly** - The AI listens better with clear speech
5. **Chrome/Edge Browser** - Best compatibility with Web Speech API

---

## 📞 Still Having Issues?

1. Check all 3 terminals are running
2. Verify URLs:
   - Backend: http://localhost:5000
   - Frontend: http://localhost:8000
   - Ollama: http://localhost:11434
3. Check browser console (F12) for error messages
4. Restart all servers and try again

---

## 🎉 You're Ready!

Open **http://localhost:8000** and start practicing your interviews!

**Happy Interviewing!** 🚀
