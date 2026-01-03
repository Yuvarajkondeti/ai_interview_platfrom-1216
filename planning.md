# AI Interview Platform - Implementation Plan

## Overview
Building a full-stack AI Interview Platform with Flask backend and vanilla HTML/CSS/JavaScript frontend. The system conducts live AI-powered interviews with real-time emotion detection (DeepFace), posture analysis (MediaPipe), voice interaction, and automatic flow control based on silence detection.

## Current State Analysis
**Repo:** ai_interview_platfrom at `/workspace/cmjxueaki00cgilr7d0cyhdl4/ai_interview_platfrom`
- Contains Next.js 16 + React 19 + TypeScript starter template
- No Flask backend exists
- No authentication system
- No AI/ML features
- No database

**Strategy:** Keep Next.js project intact, add Flask backend alongside it in new `backend/` directory and vanilla JS frontend in `frontend/` directory.

## Desired End State
A complete AI interview system where:
- Users can register, login, and manage sessions
- Interview flow is fully automated (no manual "Next" button)
- Voice-based Q&A with automatic silence detection (5 seconds)
- Live emotion overlay updates every ~1.5 seconds
- Live posture detection shows Good/Average/Poor dynamically
- Full-screen webcam during interview (no navbar)
- Previous interviews are reviewable with emotion timeline and posture summary

---

## Project Structure

```
ai_interview_platfrom/
├── backend/                    (NEW - Flask application)
│   ├── app.py                 (Main Flask app)
│   ├── database.py            (SQLite setup and models)
│   ├── auth.py                (Authentication routes)
│   ├── interview_routes.py    (Interview API endpoints)
│   ├── emotion_api.py         (DeepFace emotion detection)
│   ├── requirements.txt       (Python dependencies)
│   └── instance/
│       └── interview.db       (SQLite database - auto-created)
├── frontend/                   (NEW - Vanilla HTML/CSS/JS)
│   ├── index.html             (Landing page)
│   ├── login.html             (Login page)
│   ├── signup.html            (Signup page)
│   ├── forgot_password.html   (Forgot password page)
│   ├── home.html              (Home dashboard)
│   ├── start_interview.html   (Pre-interview setup)
│   ├── interview.html         (Full-screen interview page)
│   ├── about.html             (About page)
│   ├── previous_interviews.html (Interview history)
│   ├── css/
│   │   └── styles.css         (Global styles)
│   └── js/
│       ├── interview.js       (Interview logic ONLY)
│       ├── ai_overlay.js      (Emotion + posture ONLY)
│       └── auth.js            (Login/signup helpers)
└── [existing Next.js files remain untouched]
```

---

## Technology Decisions

### AI Question Generation
- **Service:** Local LLM using Ollama/LLaMA (free, no API costs)
- **Approach:** Generate interview questions on-the-fly based on job role/topic
- **Backend integration:** Flask endpoint calls local Ollama API

### Voice Interaction
- **Text-to-Speech:** Browser Web Speech API (`speechSynthesis`)
- **Speech-to-Text:** Browser Web Speech API (`webkitSpeechRecognition`)
- **No external API costs**
- **All processing happens client-side for voice**

### Emotion Detection
- **Library:** DeepFace (Python)
- **Backend processing:** Flask endpoint receives webcam frames
- **Update frequency:** Every ~1.5 seconds
- **Graceful handling:** If no face detected, skip update (don't crash)

### Posture Detection
- **Library:** MediaPipe Pose (JavaScript CDN)
- **Frontend processing:** Client-side analysis using MediaPipe
- **Logic:** Shoulder distance-based posture scoring
- **Labels:** Good 🧍 / Average 🙂 / Poor 🪑

---

## Backend Implementation (Flask)

### File: backend/requirements.txt (NEW)
**Purpose:** Python dependencies for Flask backend

**Contents:**
```
flask==3.0.0
flask-cors==4.0.0
opencv-python==4.8.1.78
deepface==0.0.79
tf-keras==2.20.0
tensorflow==2.20.0
requests==2.31.0
```

**Installation command:** `pip install -r requirements.txt`

---

### File: backend/database.py (NEW)
**Purpose:** SQLite database setup and schema definitions

**Database location:** `backend/instance/interview.db` (auto-created)

**Tables:**

**1. users table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `email` - TEXT UNIQUE NOT NULL
- `password_hash` - TEXT NOT NULL
- `full_name` - TEXT NOT NULL
- `created_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**2. interviews table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` - INTEGER FOREIGN KEY → users.id
- `job_role` - TEXT (e.g., "Software Engineer", "Data Scientist")
- `started_at` - TIMESTAMP
- `ended_at` - TIMESTAMP
- `overall_emotion` - TEXT (most common emotion during interview)
- `overall_posture` - TEXT (Good/Average/Poor summary)
- `status` - TEXT (ongoing/completed)

**3. interview_questions table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `interview_id` - INTEGER FOREIGN KEY → interviews.id
- `question_text` - TEXT NOT NULL
- `question_number` - INTEGER
- `asked_at` - TIMESTAMP

**4. interview_answers table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `question_id` - INTEGER FOREIGN KEY → interview_questions.id
- `answer_text` - TEXT (transcribed speech)
- `answered_at` - TIMESTAMP

**5. emotion_timeline table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `interview_id` - INTEGER FOREIGN KEY → interviews.id
- `emotion_label` - TEXT (happy/sad/neutral/angry/surprise)
- `confidence` - FLOAT (0-100)
- `timestamp` - TIMESTAMP

**6. posture_events table**
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `interview_id` - INTEGER FOREIGN KEY → interviews.id
- `posture_label` - TEXT (Good/Average/Poor)
- `timestamp` - TIMESTAMP

**Implementation:**
- Use SQLite3 library (built into Python)
- Create helper functions: `init_db()`, `get_db_connection()`
- Use parameterized queries to prevent SQL injection
- Auto-create tables on first run if they don't exist

---

### File: backend/app.py (NEW)
**Purpose:** Main Flask application entry point

**Configuration:**
- Flask app initialization
- CORS enabled (allow frontend at `http://localhost:8000` or similar)
- Secret key for session management: Generate random string or use environment variable
- Session configuration: Cookie-based, httpOnly=True, secure=False (for local dev)

**Imports:**
- Import auth blueprint from `auth.py`
- Import interview blueprint from `interview_routes.py`
- Import emotion API from `emotion_api.py`

**Routes registered:**
- `/auth/*` → auth.py blueprint
- `/api/interview/*` → interview_routes.py blueprint
- `/api/emotion/*` → emotion_api.py blueprint

**Server configuration:**
- Host: `0.0.0.0`
- Port: `5000`
- Debug: `True` (for development)

**Startup:**
- Call `init_db()` on app startup to ensure database exists
- Run Flask dev server

---

### File: backend/auth.py (NEW)
**Purpose:** Authentication routes (login, signup, logout, forgot password)

**Blueprint:** Create Flask blueprint named `auth`

#### Route: POST /auth/signup
**Purpose:** Register new user

**Request body (JSON):**
- `email` - STRING, required, valid email format
- `password` - STRING, required, minimum 8 characters
- `full_name` - STRING, required, minimum 2 characters

**Process:**
1. Validate input fields
2. Check if email already exists in database
3. Hash password using `werkzeug.security.generate_password_hash()`
4. Insert new user into `users` table
5. Return success response

**Response on success (201):**
```json
{
  "success": true,
  "message": "Account created successfully"
}
```

**Response on errors:**
- 400 if email format invalid: `{"error": "Invalid email format"}`
- 400 if password too short: `{"error": "Password must be at least 8 characters"}`
- 400 if full_name missing: `{"error": "Full name is required"}`
- 409 if email exists: `{"error": "Email already registered"}`
- 500 for database errors: `{"error": "Registration failed"}`

---

#### Route: POST /auth/login
**Purpose:** Authenticate user and create session

**Request body (JSON):**
- `email` - STRING, required
- `password` - STRING, required

**Process:**
1. Query database for user with given email
2. Verify password using `werkzeug.security.check_password_hash()`
3. If valid, store `user_id` in Flask session
4. Return success with user data

**Response on success (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Response on errors:**
- 400 if fields missing: `{"error": "Email and password required"}`
- 401 if credentials invalid: `{"error": "Invalid email or password"}`
- 500 for database errors: `{"error": "Login failed"}`

---

#### Route: POST /auth/logout
**Purpose:** Clear user session

**Process:**
1. Clear Flask session using `session.clear()`
2. Return success

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### Route: POST /auth/forgot-password
**Purpose:** Basic forgot password handling (placeholder for now)

**Request body (JSON):**
- `email` - STRING, required

**Process:**
1. Check if email exists in database
2. For MVP: Just return success message (no actual email sending)
3. Future: Generate reset token, send email

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset instructions sent to your email"
}
```

**Note:** Always return success even if email doesn't exist (security best practice to prevent email enumeration)

---

#### Route: GET /auth/check-session
**Purpose:** Check if user is logged in

**Process:**
1. Check if `user_id` exists in Flask session
2. If yes, return user data from database
3. If no, return not authenticated

**Response if authenticated (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Response if not authenticated (401):**
```json
{
  "authenticated": false
}
```

---

### File: backend/interview_routes.py (NEW)
**Purpose:** Interview management API endpoints

**Blueprint:** Create Flask blueprint named `interview`

**Helper function: require_auth()**
- Decorator function to check if user is logged in
- Checks if `user_id` in Flask session
- Returns 401 if not authenticated
- Use on all interview routes

---

#### Route: POST /api/interview/start
**Purpose:** Start new interview session
**Auth:** Required

**Request body (JSON):**
- `job_role` - STRING, required (e.g., "Software Engineer")

**Process:**
1. Get `user_id` from session
2. Create new record in `interviews` table with status="ongoing"
3. Store interview start timestamp
4. Return interview ID

**Response on success (201):**
```json
{
  "success": true,
  "interview_id": 123,
  "message": "Interview started"
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if job_role missing: `{"error": "Job role is required"}`
- 500 for database errors

---

#### Route: POST /api/interview/generate-question
**Purpose:** Generate next interview question using Ollama
**Auth:** Required

**Request body (JSON):**
- `interview_id` - INTEGER, required
- `job_role` - STRING, required
- `question_number` - INTEGER, required (1, 2, 3, ...)

**Process:**
1. Call Ollama API locally (default: `http://localhost:11434/api/generate`)
2. Prompt template:
   ```
   You are an experienced interviewer conducting a job interview for the position of {job_role}.
   This is question number {question_number} of the interview.
   Generate a single relevant interview question.
   Only return the question text, nothing else.
   ```
3. Model: Use `llama2` or `mistral` (whichever is available in Ollama)
4. Save question to `interview_questions` table
5. Return question text

**Response on success (200):**
```json
{
  "success": true,
  "question": "Can you describe your experience with object-oriented programming?"
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if fields missing
- 503 if Ollama not available: `{"error": "AI service unavailable. Please ensure Ollama is running."}`
- 500 for other errors

**Ollama integration:**
- Use `requests` library to call Ollama HTTP API
- Endpoint: `POST http://localhost:11434/api/generate`
- Request body: `{"model": "llama2", "prompt": "...", "stream": false}`
- Parse response JSON: `response['response']` contains generated text

---

#### Route: POST /api/interview/save-answer
**Purpose:** Save user's transcribed answer
**Auth:** Required

**Request body (JSON):**
- `question_id` - INTEGER, required
- `answer_text` - STRING, required (transcribed from speech)

**Process:**
1. Insert answer into `interview_answers` table
2. Link to question_id
3. Store timestamp

**Response on success (200):**
```json
{
  "success": true,
  "message": "Answer saved"
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if fields missing
- 404 if question_id doesn't exist
- 500 for database errors

---

#### Route: POST /api/interview/end
**Purpose:** End interview session
**Auth:** Required

**Request body (JSON):**
- `interview_id` - INTEGER, required

**Process:**
1. Update interview record: set status="completed", ended_at=CURRENT_TIMESTAMP
2. Calculate overall emotion (most frequent emotion from emotion_timeline)
3. Calculate overall posture (aggregate Good/Average/Poor counts)
4. Update interview record with overall_emotion and overall_posture
5. Return summary

**Response on success (200):**
```json
{
  "success": true,
  "summary": {
    "overall_emotion": "neutral",
    "overall_posture": "Good",
    "duration_minutes": 15
  }
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if interview_id missing
- 404 if interview not found
- 500 for database errors

---

#### Route: GET /api/interview/history
**Purpose:** Get user's previous interviews
**Auth:** Required

**Process:**
1. Get user_id from session
2. Query `interviews` table where user_id matches and status="completed"
3. For each interview, include: id, job_role, started_at, ended_at, overall_emotion, overall_posture
4. Order by started_at DESC (most recent first)

**Response on success (200):**
```json
{
  "success": true,
  "interviews": [
    {
      "id": 123,
      "job_role": "Software Engineer",
      "started_at": "2025-01-03T10:30:00",
      "ended_at": "2025-01-03T10:45:00",
      "overall_emotion": "neutral",
      "overall_posture": "Good"
    },
    {
      "id": 122,
      "job_role": "Data Scientist",
      "started_at": "2025-01-02T14:00:00",
      "ended_at": "2025-01-02T14:20:00",
      "overall_emotion": "happy",
      "overall_posture": "Average"
    }
  ]
}
```

**Response on errors:**
- 401 if not authenticated
- 500 for database errors

---

#### Route: GET /api/interview/details/<interview_id>
**Purpose:** Get detailed interview review data
**Auth:** Required

**Process:**
1. Verify interview belongs to logged-in user
2. Get interview basic info from `interviews` table
3. Get all questions and answers (JOIN interview_questions and interview_answers)
4. Get emotion timeline from `emotion_timeline` table
5. Get posture events from `posture_events` table
6. Return complete interview data

**Response on success (200):**
```json
{
  "success": true,
  "interview": {
    "id": 123,
    "job_role": "Software Engineer",
    "started_at": "2025-01-03T10:30:00",
    "ended_at": "2025-01-03T10:45:00",
    "overall_emotion": "neutral",
    "overall_posture": "Good",
    "qa_pairs": [
      {
        "question": "Tell me about yourself",
        "answer": "I'm a software engineer with 5 years of experience...",
        "asked_at": "2025-01-03T10:30:15"
      },
      {
        "question": "What are your strengths?",
        "answer": "My strengths include problem-solving...",
        "asked_at": "2025-01-03T10:32:30"
      }
    ],
    "emotion_timeline": [
      {"emotion": "neutral", "confidence": 85, "timestamp": "2025-01-03T10:30:00"},
      {"emotion": "happy", "confidence": 78, "timestamp": "2025-01-03T10:31:30"},
      {"emotion": "neutral", "confidence": 82, "timestamp": "2025-01-03T10:33:00"}
    ],
    "posture_summary": {
      "good_count": 45,
      "average_count": 12,
      "poor_count": 3
    }
  }
}
```

**Response on errors:**
- 401 if not authenticated
- 403 if interview belongs to different user
- 404 if interview not found
- 500 for database errors

---

### File: backend/emotion_api.py (NEW)
**Purpose:** Emotion detection using DeepFace

**Blueprint:** Create Flask blueprint named `emotion`

---

#### Route: POST /api/emotion/detect
**Purpose:** Detect emotion from webcam frame
**Auth:** Required

**Request:**
- Content-Type: `multipart/form-data`
- Field: `frame` - IMAGE FILE (JPEG/PNG from webcam)
- Field: `interview_id` - INTEGER

**Process:**
1. Receive image file from request
2. Decode image using OpenCV (`cv2.imdecode`)
3. Try to detect emotion using DeepFace:
   ```python
   result = DeepFace.analyze(img_array, actions=['emotion'], enforce_detection=False)
   ```
4. If face detected: Extract dominant emotion and confidence
5. If no face detected: Return gracefully without error (don't crash)
6. Save emotion to `emotion_timeline` table with interview_id and timestamp
7. Return emotion data

**Response on success (200):**
```json
{
  "success": true,
  "emotion": "happy",
  "confidence": 78.5
}
```

**Response if no face detected (200):**
```json
{
  "success": true,
  "emotion": "no_face",
  "confidence": 0
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if frame missing: `{"error": "Frame image required"}`
- 500 for processing errors (but don't crash interview)

**CRITICAL error handling:**
- Wrap DeepFace call in try-except
- If any exception: Return `{"success": true, "emotion": "no_face", "confidence": 0}`
- Never let emotion detection crash the interview flow
- Log errors but continue gracefully

**Performance optimization:**
- Set `enforce_detection=False` in DeepFace to handle no-face cases
- Use smallest model available for faster processing
- Consider downscaling image before processing (e.g., max 640x480)

---

### File: backend/.env.example (NEW)
**Purpose:** Environment variable template

**Contents:**
```
FLASK_SECRET_KEY=your-secret-key-here-change-in-production
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2
FLASK_DEBUG=True
```

---

## Frontend Implementation (Vanilla HTML/CSS/JS)

### General Requirements
- All pages use vanilla JavaScript (no frameworks)
- Consistent styling across all pages using `frontend/css/styles.css`
- Responsive design (mobile-friendly)
- Clean, professional UI
- Error messages displayed clearly
- Loading states for async operations

---

### File: frontend/css/styles.css (NEW)
**Purpose:** Global styles for entire application

**Key styling specifications:**

**Reset and base:**
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; }
```

**Navigation bar:**
- position: fixed, top: 0, left: 0, right: 0
- height: 60px
- background: white
- box-shadow: 0 2px 5px rgba(0,0,0,0.1)
- z-index: 1000
- Logo/brand on left (padding-left: 20px)
- Menu items on right (padding-right: 20px)
- Menu items: horizontal list, spacing 20px between
- Hover effect: color change to #3498db
- **Class `.hide-nav`:** display: none (for interview page)

**Forms:**
- Container: max-width 400px, margin 100px auto, background white, padding 40px, border-radius 8px, box-shadow
- Input fields: width 100%, padding 12px, margin-bottom 15px, border 1px solid #ddd, border-radius 4px, font-size 14px
- Submit button: width 100%, padding 12px, background #3498db, color white, border none, border-radius 4px, cursor pointer, font-size 16px
- Button hover: background #2980b9
- Error message: color #e74c3c, font-size 14px, margin-top -10px, margin-bottom 15px
- Success message: color #27ae60

**Interview page specific:**
- body.fullscreen-interview: margin 0, padding 0, overflow hidden, width 100vw, height 100vh
- #webcamVideo: position absolute, top 0, left 0, width 100%, height 100%, object-fit cover, transform scaleX(-1) (mirrored)
- #aiOverlay: position fixed, bottom 20px, right 20px, background rgba(0,0,0,0.7), color white, padding 15px, border-radius 10px, font-size 16px, min-width 250px
- Emotion/posture display: line-height 1.8, font-weight bold for labels

**Interview cards (previous interviews):**
- Container: display grid, grid-template-columns repeat(auto-fill, minmax(300px, 1fr)), gap 20px
- Card: background white, padding 20px, border-radius 8px, box-shadow, cursor pointer
- Card hover: box-shadow increase, transform translateY(-2px), transition 0.3s
- Card heading: color #2c3e50, margin-bottom 10px
- Card metadata: font-size 14px, color #7f8c8d, margin-bottom 5px

---

### File: frontend/js/auth.js (NEW)
**Purpose:** Shared authentication helper functions

**BASE_URL constant:**
```javascript
const BASE_URL = 'http://localhost:5000';
```

**Function: async checkAuth()**
- Returns: User object if authenticated, null if not
- Fetches: `GET ${BASE_URL}/auth/check-session` with `credentials: 'include'`
- If response.authenticated === true: Return user object
- If response.authenticated === false: Redirect to login.html
- On error: Log error, redirect to login.html

**Function: async logout()**
- Fetches: `POST ${BASE_URL}/auth/logout` with `credentials: 'include'`
- Clears sessionStorage
- Redirects to login.html

**Function: displayError(elementId, message)**
- Parameters: elementId (string), message (string)
- Finds element by ID, sets innerHTML to error message with red styling
- Auto-clears after 5 seconds using setTimeout

**Function: displaySuccess(elementId, message)**
- Parameters: elementId (string), message (string)
- Finds element by ID, sets innerHTML to success message with green styling
- Auto-clears after 3 seconds using setTimeout

**Function: validateEmail(email)**
- Returns: boolean
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Returns true if valid email format

---

### File: frontend/index.html (NEW)
**Purpose:** Landing page (public, no auth required)

**HTML structure:**
- Header with site name/logo
- Hero section:
  - Heading: "Welcome to AI Interview Platform"
  - Subheading: "Practice interviews with AI-powered feedback"
  - Two large buttons: "Get Started" (primary, → signup.html), "Login" (secondary, → login.html)
- Features section:
  - 3-4 feature cards describing platform benefits
  - Icons/emojis for visual appeal
- Footer with copyright

**JavaScript on load:**
- Check if user already logged in (call checkAuth but don't redirect if not)
- If authenticated: Auto-redirect to home.html
- If not authenticated: Show landing page normally

---

### File: frontend/login.html (NEW)
**Purpose:** User login

**HTML structure:**
- Navigation: Simple header with "Back to Home" link → index.html
- Form container (centered card):
  - Heading: "Login"
  - Email input (type=email, id="email", required)
  - Password input (type=password, id="password", required)
  - Submit button: "Login"
  - Error display div (id="error-message", initially empty)
  - Links below:
    - "Don't have an account? Sign up" → signup.html
    - "Forgot password?" → forgot_password.html

**JavaScript form submission:**
1. Prevent default form submission
2. Get email and password values
3. Client-side validation:
   - Email not empty and valid format (use validateEmail from auth.js)
   - Password not empty
   - If validation fails: Display error using displayError
4. If valid:
   - Fetch `POST ${BASE_URL}/auth/login` with JSON body {email, password}, credentials: 'include'
5. On success (200):
   - Store user data in sessionStorage: `sessionStorage.setItem('user', JSON.stringify(response.user))`
   - Redirect to home.html: `window.location.href = 'home.html'`
6. On error:
   - Display error message from API response
   - Clear password field

---

### File: frontend/signup.html (NEW)
**Purpose:** User registration

**HTML structure:**
- Navigation: Simple header with "Back to Home" link
- Form container:
  - Heading: "Sign Up"
  - Full Name input (type=text, id="fullName", required, minlength=2)
  - Email input (type=email, id="email", required)
  - Password input (type=password, id="password", required, minlength=8)
  - Confirm Password input (type=password, id="confirmPassword", required)
  - Password requirement text: "Must be at least 8 characters" (small, gray)
  - Submit button: "Sign Up"
  - Error display div (id="error-message")
  - Link below: "Already have an account? Login" → login.html

**JavaScript form submission:**
1. Prevent default
2. Get all field values
3. Client-side validation:
   - Full name: Not empty, minimum 2 characters
   - Email: Valid format (use validateEmail)
   - Password: Minimum 8 characters
   - Confirm password: Matches password
   - If any validation fails: Display specific error
4. If valid:
   - Fetch `POST ${BASE_URL}/auth/signup` with JSON {email, password, full_name: fullName}, credentials: 'include'
5. On success (201):
   - Display success message: "Account created! Redirecting to login..."
   - Wait 2 seconds: `setTimeout(() => window.location.href = 'login.html', 2000)`
6. On error:
   - Display API error message
   - Clear password fields

---

### File: frontend/forgot_password.html (NEW)
**Purpose:** Forgot password (placeholder MVP)

**HTML structure:**
- Navigation: Simple header
- Form container:
  - Heading: "Forgot Password"
  - Description: "Enter your email to receive reset instructions"
  - Email input (type=email, id="email", required)
  - Submit button: "Send Reset Link"
  - Message display div (id="message", initially empty)
  - Link: "Back to Login" → login.html

**JavaScript form submission:**
1. Prevent default
2. Get email value
3. Validate email format
4. If valid:
   - Fetch `POST ${BASE_URL}/auth/forgot-password` with JSON {email}, credentials: 'include'
5. On response (always 200):
   - Display success message: "If your email is registered, you'll receive reset instructions shortly"
   - Clear email field
   - Show "Back to Login" button prominently

---

### File: frontend/home.html (NEW)
**Purpose:** User dashboard (after login)

**Auth:** Required - call checkAuth() on page load

**HTML structure:**
- Navigation bar: Full navbar with menu items (AI Interview | Home | Start Interview | About | Previous Interviews | Logout)
- Welcome section:
  - Heading: "Welcome back, [User Full Name]!" (populate from sessionStorage or API)
- Stats cards section:
  - Grid of 3 stat cards:
    - Total Interviews (count)
    - Last Interview (date or "None yet")
    - Recent Performance (average emotion or "N/A")
- Large CTA: "Start New Interview" button (primary, large) → start_interview.html
- Recent interviews section:
  - Heading: "Recent Interviews"
  - Display last 3 interviews (cards with job role, date, emotion, posture)
  - "View All Interviews" link → previous_interviews.html

**JavaScript on load:**
1. Call checkAuth() - if not authenticated, redirects to login
2. If authenticated:
   - Get user data from response
   - Update welcome message with user's full name
3. Fetch interview history: `GET ${BASE_URL}/api/interview/history` with credentials: 'include'
4. Process response:
   - Calculate total interviews count
   - Get last interview date
   - Calculate average emotion (if available)
   - Update stat cards
5. Display last 3 interviews in recent section
   - Each card shows: job role, date (formatted), emotion label, posture label
   - Click card: Redirects to previous_interviews.html or opens details

**Logout button:**
- Click handler calls logout() from auth.js

---

### File: frontend/start_interview.html (NEW)
**Purpose:** Pre-interview setup and permissions

**Auth:** Required

**HTML structure:**
- Navigation bar: Full navbar
- Main container (centered):
  - Heading: "Start New Interview"
  - Step 1 section:
    - Label: "Job Role"
    - Input: (type=text, id="jobRole", placeholder="e.g., Software Engineer", required)
  - Step 2 section:
    - Label: "Camera Preview"
    - Video element: (id="cameraPreview", width=320, height=240, autoplay, muted)
    - Status text: (id="cameraStatus", shows permission status)
  - Step 3 section:
    - Label: "Microphone Test"
    - Button: "Test Microphone" (id="testMicButton")
    - Status text: (id="micStatus")
  - Begin button: "Begin Interview" (id="beginButton", initially disabled)
  - Error display: (id="error-message")

**JavaScript on load:**
1. Call checkAuth()
2. Request camera and microphone permissions:
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
   ```
3. On success:
   - Attach video stream to cameraPreview element
   - Update cameraStatus: "Camera ready ✓" (green)
   - Update micStatus: "Microphone ready ✓" (green)
   - Enable beginButton
4. On failure:
   - Display error: "Please grant camera and microphone permissions"
   - Update status texts with error icons
   - Keep beginButton disabled

**Test Microphone button:**
- Click handler: Briefly enable audio visualization or play back test sound
- Shows user that microphone is working

**Begin Interview button:**
- Click handler:
  1. Validate job role field not empty
  2. If empty: Display error "Please enter a job role"
  3. If valid:
     - Disable button, show "Starting..." text
     - Fetch `POST ${BASE_URL}/api/interview/start` with JSON {job_role: jobRole}, credentials: 'include'
  4. On success:
     - Receive interview_id from response
     - Store in sessionStorage:
       ```javascript
       sessionStorage.setItem('interview_id', response.interview_id);
       sessionStorage.setItem('job_role', jobRole);
       ```
     - Redirect to interview.html
  5. On error:
     - Display API error
     - Re-enable button

---

### File: frontend/interview.html (NEW - MOST CRITICAL)
**Purpose:** Full-screen interview page with AI interaction

**Auth:** Required

**HTML structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview in Progress</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="fullscreen-interview">
  <!-- NO NAVIGATION BAR -->

  <video id="webcamVideo" autoplay muted></video>

  <div id="aiOverlay">
    <div class="emotion-display">
      Emotion: <span id="emotionLabel">neutral</span> (<span id="emotionConfidence">0</span>%)
    </div>
    <div class="posture-display">
      Posture: <span id="postureLabel">Good</span> <span id="postureEmoji">🧍</span>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="js/auth.js"></script>
  <script src="js/ai_overlay.js"></script>
  <script src="js/interview.js"></script>
</body>
</html>
```

**CRITICAL styling:**
- body.fullscreen-interview: NO navigation bar, full screen, no scrolling
- #webcamVideo: Full screen, mirrored (scaleX(-1)), covers entire viewport
- #aiOverlay: Fixed bottom-right corner, translucent dark background

---

### File: frontend/js/interview.js (NEW - CORE LOGIC)
**Purpose:** Interview flow control, voice interaction, silence detection

**Global variables:**
```javascript
const BASE_URL = 'http://localhost:5000';
let interviewId;
let jobRole;
let questionNumber = 1;
let currentQuestionId;
let recognition;
let synthesis = window.speechSynthesis;
let silenceTimer;
let isListening = false;
let userAnswer = "";
const MAX_QUESTIONS = 10;
```

**Function: init()**
Called on window.onload:
1. Check authentication (use checkAuth from auth.js but don't redirect, just verify)
2. Get interview_id and job_role from sessionStorage
3. If missing: alert "Interview data not found" and redirect to start_interview.html
4. Store in global variables
5. Initialize speech recognition (call setupSpeechRecognition())
6. Start interview (call askQuestion())

**Function: setupSpeechRecognition()**
```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
  return;
}

recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

recognition.onresult = handleSpeechResult;
recognition.onend = handleRecognitionEnd;
recognition.onerror = handleRecognitionError;
```

**Function: async askQuestion()**
1. If questionNumber > MAX_QUESTIONS: call endInterview() and return
2. Try:
   - Fetch `POST ${BASE_URL}/api/interview/generate-question` with JSON {interview_id: interviewId, job_role: jobRole, question_number: questionNumber}, credentials: 'include'
3. On success:
   - Extract question text and question_id from response (question_id is in database, returned from API)
   - Store currentQuestionId = question_id
   - Call speakQuestion(questionText)
4. On error:
   - If 503 (Ollama unavailable): alert "AI service unavailable. Please ensure Ollama is running locally."
   - Otherwise: alert "Failed to generate question. Ending interview."
   - Call endInterview()

**Function: speakQuestion(questionText)**
```javascript
const utterance = new SpeechSynthesisUtterance(questionText);
utterance.rate = 0.9;  // Slightly slower for clarity
utterance.pitch = 1.0;
utterance.volume = 1.0;
utterance.lang = 'en-US';

utterance.onend = function() {
  // Wait 1 second, then start listening
  setTimeout(() => {
    startListening();
  }, 1000);
};

synthesis.speak(utterance);
```

**Function: startListening()**
```javascript
isListening = true;
userAnswer = "";
try {
  recognition.start();
} catch(e) {
  console.error('Failed to start recognition:', e);
}
startSilenceTimer();
```

**Function: startSilenceTimer()**
```javascript
clearTimeout(silenceTimer);
silenceTimer = setTimeout(() => {
  if (isListening) {
    stopListening();
  }
}, 5000);  // 5 seconds of silence
```

**Function: handleSpeechResult(event)**
```javascript
const transcript = event.results[event.results.length - 1][0].transcript;
userAnswer += transcript + " ";

// Reset silence timer (user is speaking)
startSilenceTimer();
```

**Function: stopListening()**
```javascript
isListening = false;
try {
  recognition.stop();
} catch(e) {
  console.error('Failed to stop recognition:', e);
}
clearTimeout(silenceTimer);

// Save answer and continue
saveAnswerAndContinue();
```

**Function: async saveAnswerAndContinue()**
1. Trim userAnswer
2. If userAnswer is empty or very short (< 5 characters): Set userAnswer = "No response"
3. Try:
   - Fetch `POST ${BASE_URL}/api/interview/save-answer` with JSON {question_id: currentQuestionId, answer_text: userAnswer}, credentials: 'include'
4. On success or error (don't block on save failure):
   - Increment questionNumber
   - Call askQuestion() (next question)

**Function: async endInterview()**
1. Stop all speech: `synthesis.cancel()`
2. Stop recognition if running
3. Stop webcam and AI overlay (call from ai_overlay.js: stopAIOverlay())
4. Try:
   - Fetch `POST ${BASE_URL}/api/interview/end` with JSON {interview_id: interviewId}, credentials: 'include'
5. Show completion overlay:
   - Create div overlay with message: "Interview completed! Calculating your results..."
   - Full screen, centered
6. Wait 3 seconds: `setTimeout(() => { window.location.href = 'previous_interviews.html'; }, 3000)`

**Function: handleRecognitionEnd()**
```javascript
// Recognition stopped unexpectedly
if (isListening) {
  try {
    recognition.start();  // Restart
  } catch(e) {
    console.error('Failed to restart recognition:', e);
  }
}
```

**Function: handleRecognitionError(event)**
```javascript
console.error('Speech recognition error:', event.error);

if (event.error === 'no-speech') {
  // No speech detected - this is fine, silence timer will handle
} else if (event.error === 'aborted') {
  // Aborted - restart if still listening
  if (isListening) {
    try {
      recognition.start();
    } catch(e) {}
  }
} else if (event.error === 'not-allowed') {
  // Mic permission denied
  alert('Microphone permission denied. Cannot continue interview.');
  endInterview();
}
```

**CRITICAL FLOW:**
- ❌ NO "Next" button
- ❌ NO question text displayed on screen
- ✅ Fully voice-driven
- ✅ Automatic silence detection (5 seconds)
- ✅ 10 questions total
- ✅ Auto end after last question

---

### File: frontend/js/ai_overlay.js (NEW - EMOTION & POSTURE)
**Purpose:** Real-time emotion and posture tracking (separate from interview logic)

**Global variables:**
```javascript
const BASE_URL = 'http://localhost:5000';
let webcamStream;
let videoElement;
let emotionInterval;
let currentEmotion = 'neutral';
let currentPosture = 'Good';
let mediapipePose;
let camera;
```

**Function: initAIOverlay()**
Called from interview.js after init:
1. Get videoElement: `document.getElementById('webcamVideo')`
2. Request camera access (if not already done):
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true })
   ```
3. Attach stream to videoElement: `videoElement.srcObject = stream`
4. Start emotion detection: call startEmotionDetection()
5. Start posture detection: call initPostureDetection()

**Function: startEmotionDetection()**
```javascript
emotionInterval = setInterval(() => {
  captureFrameAndDetectEmotion();
}, 1500);  // Every 1.5 seconds
```

**Function: async captureFrameAndDetectEmotion()**
```javascript
// Create hidden canvas
const canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
const ctx = canvas.getContext('2d');

// Draw current video frame
ctx.drawImage(videoElement, 0, 0, 640, 480);

// Convert to blob
canvas.toBlob(async (blob) => {
  if (!blob) return;

  const interviewId = sessionStorage.getItem('interview_id');
  const formData = new FormData();
  formData.append('frame', blob, 'frame.jpg');
  formData.append('interview_id', interviewId);

  try {
    const response = await fetch(`${BASE_URL}/api/emotion/detect`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    if (data.success && data.emotion !== 'no_face') {
      updateEmotionDisplay(data.emotion, data.confidence);
    }
  } catch(error) {
    console.error('Emotion detection error:', error);
    // Don't crash - just skip this update
  }
}, 'image/jpeg', 0.8);
```

**Function: updateEmotionDisplay(emotion, confidence)**
```javascript
currentEmotion = emotion;
document.getElementById('emotionLabel').textContent = emotion;
document.getElementById('emotionConfidence').textContent = Math.round(confidence);
```

**Function: initPostureDetection()**
```javascript
// Load MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(onPoseResults);

// Start camera for pose detection
camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

camera.start();
mediapipePose = pose;
```

**Function: onPoseResults(results)**
```javascript
if (!results.poseLandmarks) {
  // No pose detected - keep previous value
  return;
}

const landmarks = results.poseLandmarks;
const posture = calculatePosture(landmarks);

if (posture !== currentPosture) {
  updatePostureDisplay(posture);
  savePostureEvent(posture);
}
```

**Function: calculatePosture(landmarks)**
```javascript
// MediaPipe Pose landmark indices:
// 11 = left shoulder, 12 = right shoulder
// 23 = left hip, 24 = right hip
// 0 = nose

const leftShoulder = landmarks[11];
const rightShoulder = landmarks[12];
const leftHip = landmarks[23];
const rightHip = landmarks[24];
const nose = landmarks[0];

// Calculate shoulder distance (horizontal)
const shoulderDistance = Math.abs(rightShoulder.x - leftShoulder.x);

// Calculate vertical alignment (shoulders vs hips)
const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
const hipMidY = (leftHip.y + rightHip.y) / 2;
const verticalAlignment = hipMidY - shoulderMidY;

// Calculate forward lean (nose position relative to shoulders)
const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
const forwardLean = Math.abs(nose.x - shoulderMidX);

// Posture scoring logic:
// Good: Wide shoulders, good vertical alignment, minimal forward lean
// Average: Moderate metrics
// Poor: Narrow shoulders (hunched), bad alignment (slouching), excessive lean

if (shoulderDistance > 0.15 && verticalAlignment > 0.15 && forwardLean < 0.05) {
  return 'Good';
} else if (shoulderDistance > 0.10 && verticalAlignment > 0.10 && forwardLean < 0.08) {
  return 'Average';
} else {
  return 'Poor';
}
```

**CRITICAL: This logic must produce varying results** (not always "Good"). The thresholds are tuned to be realistic.

**Function: updatePostureDisplay(posture)**
```javascript
currentPosture = posture;
document.getElementById('postureLabel').textContent = posture;

const emojiMap = {
  'Good': '🧍',
  'Average': '🙂',
  'Poor': '🪑'
};
document.getElementById('postureEmoji').textContent = emojiMap[posture];
```

**Function: async savePostureEvent(posture)**
```javascript
const interviewId = sessionStorage.getItem('interview_id');

try {
  await fetch(`${BASE_URL}/api/interview/save-posture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      interview_id: interviewId,
      posture_label: posture
    })
  });
} catch(error) {
  console.error('Failed to save posture:', error);
  // Don't crash - just log
}
```

**Function: stopAIOverlay()**
Called when ending interview:
```javascript
clearInterval(emotionInterval);
if (camera) camera.stop();
if (webcamStream) {
  webcamStream.getTracks().forEach(track => track.stop());
}
```

**Initialization:**
On window.onload or after interview.js init calls it:
```javascript
window.initAIOverlay = initAIOverlay;  // Export for interview.js to call
```

---

### File: frontend/about.html (NEW)
**Purpose:** About page

**Auth:** Not required (public)

**HTML structure:**
- Navigation bar: Full navbar
- Main content:
  - Heading: "About AI Interview Platform"
  - Description paragraphs:
    - Platform purpose and benefits
    - How it works (AI questions, emotion tracking, posture analysis)
    - Technology stack (Flask, DeepFace, MediaPipe, Ollama)
  - Contact section (optional)
  - "Start Practicing" button → start_interview.html (if logged in) or signup.html (if not)

**JavaScript:**
- Check authentication on load (don't redirect, just adjust button text)
- If authenticated: Button → start_interview.html
- If not: Button → signup.html

---

### File: frontend/previous_interviews.html (NEW)
**Purpose:** View all interview history

**Auth:** Required

**HTML structure:**
- Navigation bar: Full navbar
- Main container:
  - Heading: "Your Interview History"
  - Filter/sort controls:
    - Sort dropdown: "Date (Newest First)" | "Date (Oldest First)" | "Job Role (A-Z)"
  - Interviews container (id="interviewsContainer"):
    - Grid of interview cards (populated by JavaScript)
  - Empty state (id="emptyState", hidden if interviews exist):
    - Message: "No interviews yet. Start your first interview!"
    - Button: "Start Interview" → start_interview.html
- Interview detail modal (id="detailModal", initially hidden):
  - Overlay background (click to close)
  - Modal content:
    - Close button (X)
    - Interview header (job role, date, duration)
    - Tabs: "Questions & Answers" | "Emotion Timeline" | "Posture Summary"
    - Tab content (populated by JavaScript)

**JavaScript on load:**
1. Call checkAuth()
2. Fetch interview history: `GET ${BASE_URL}/api/interview/history` with credentials: 'include'
3. Store interviews array in global variable
4. Render interview cards: call renderInterviews(interviews)

**Function: renderInterviews(interviews)**
```javascript
const container = document.getElementById('interviewsContainer');
container.innerHTML = '';

if (interviews.length === 0) {
  document.getElementById('emptyState').style.display = 'block';
  return;
}

document.getElementById('emptyState').style.display = 'none';

interviews.forEach(interview => {
  const card = document.createElement('div');
  card.className = 'interview-card';
  card.innerHTML = `
    <h3>${interview.job_role}</h3>
    <p>Date: ${formatDate(interview.started_at)}</p>
    <p>Duration: ${calculateDuration(interview.started_at, interview.ended_at)}</p>
    <p>Emotion: <span class="emotion-${interview.overall_emotion}">${interview.overall_emotion}</span></p>
    <p>Posture: ${interview.overall_posture}</p>
    <button class="view-details-btn" data-interview-id="${interview.id}">View Details</button>
  `;
  container.appendChild(card);

  // Add click handler to "View Details" button
  card.querySelector('.view-details-btn').addEventListener('click', () => {
    viewInterviewDetails(interview.id);
  });
});
```

**Function: formatDate(dateString)**
- Parse ISO date string
- Return formatted: "Jan 3, 2025 10:30 AM"

**Function: calculateDuration(startString, endString)**
- Calculate difference in minutes
- Return formatted: "15 minutes"

**Function: async viewInterviewDetails(interviewId)**
1. Fetch `GET ${BASE_URL}/api/interview/details/${interviewId}` with credentials: 'include'
2. On success:
   - Populate modal with interview data
   - Show Q&A pairs in first tab
   - Render emotion timeline (list or simple visualization)
   - Show posture summary (counts and percentages)
   - Display modal: `document.getElementById('detailModal').style.display = 'block'`

**Modal close:**
- Click X button or click overlay background: Hide modal

**Sort functionality:**
- Dropdown change: Re-sort interviews array and call renderInterviews()

---

## Backend Addition: Save Posture Endpoint

### File: backend/interview_routes.py (MODIFY - ADD ROUTE)
**Location:** Add after existing interview routes

#### Route: POST /api/interview/save-posture
**Purpose:** Save posture event during interview
**Auth:** Required

**Request body (JSON):**
- `interview_id` - INTEGER, required
- `posture_label` - STRING, required (Good/Average/Poor)

**Process:**
1. Get user_id from session (authentication check)
2. Insert into `posture_events` table:
   - interview_id
   - posture_label
   - timestamp (CURRENT_TIMESTAMP)
3. Return success

**Response on success (200):**
```json
{
  "success": true,
  "message": "Posture saved"
}
```

**Response on errors:**
- 401 if not authenticated
- 400 if fields missing: `{"error": "Interview ID and posture label required"}`
- 500 for database errors

---

## Setup and Installation

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)
- Ollama installed locally (https://ollama.ai/)
- Modern web browser (Chrome or Edge recommended for full Web Speech API support)
- Webcam and microphone

### Backend Setup

**Step 1: Navigate to backend directory**
```bash
cd /workspace/cmjxueaki00cgilr7d0cyhdl4/ai_interview_platfrom/backend
```

**Step 2: Create Python virtual environment (recommended)**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

**Step 3: Install dependencies**
```bash
pip install -r requirements.txt
```

This installs: Flask, Flask-CORS, OpenCV, DeepFace, TensorFlow, tf-keras, requests

**Step 4: Setup Ollama**
```bash
# Install Ollama from https://ollama.ai/download
# After installation, pull the LLaMA2 model:
ollama pull llama2

# Verify Ollama is running:
curl http://localhost:11434/api/version
```

Ollama must be running before starting interviews. It runs as a background service on port 11434.

**Step 5: Create environment file**
```bash
cp .env.example .env
```

Edit `.env` and set `FLASK_SECRET_KEY` to a random string (e.g., generate with `python -c "import secrets; print(secrets.token_hex(32))"`

**Step 6: Run Flask server**
```bash
python app.py
```

Server starts at `http://localhost:5000`
Database (`instance/interview.db`) auto-creates on first run.

**Verify backend is running:**
- Open browser: `http://localhost:5000` (should see Flask running or 404)
- Check logs for any errors

---

### Frontend Setup

**Step 1: Navigate to frontend directory**
```bash
cd /workspace/cmjxueaki00cgilr7d0cyhdl4/ai_interview_platfrom/frontend
```

**Step 2: Serve frontend files**

**Option A: Python HTTP server**
```bash
python3 -m http.server 8000
```

**Option B: Node.js http-server**
```bash
npx http-server -p 8000
```

**Option C: VS Code Live Server extension**
- Install "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

**Step 3: Access application**
Open browser: `http://localhost:8000`

**Verify frontend is running:**
- Should see landing page with "Welcome to AI Interview Platform"
- Check browser console for no errors

---

### Running the Complete System

**Terminal 1: Ollama** (must be running first)
```bash
ollama serve  # Or Ollama may auto-start as service
```

**Terminal 2: Flask Backend**
```bash
cd /workspace/cmjxueaki00cgilr7d0cyhdl4/ai_interview_platfrom/backend
source venv/bin/activate
python app.py
```

**Terminal 3: Frontend Server**
```bash
cd /workspace/cmjxueaki00cgilr7d0cyhdl4/ai_interview_platfrom/frontend
python3 -m http.server 8000
```

**Access:** http://localhost:8000

---

## Critical Success Criteria

### Must Work Perfectly
1. **Voice-driven interview** - AI asks verbally, user answers verbally, 5-second silence auto-advances
2. **Emotion detection** - Updates every 1.5 seconds, doesn't crash
3. **Posture detection** - Shows Good/Average/Poor dynamically (NOT always "Good")
4. **Full-screen interview** - NO navigation bar, webcam covers screen
5. **Interview review** - All Q&A, emotion timeline, posture summary saved

### Interview Page Non-Negotiables
- ❌ NO navigation bar
- ❌ NO "Next" button
- ❌ NO question text on screen
- ✅ Full-screen webcam (mirrored)
- ✅ Voice-only interaction
- ✅ Automatic 5-second silence detection
- ✅ AI overlay (bottom-right corner)

---

## File Summary

**Backend (7 files):**
1. backend/requirements.txt
2. backend/database.py
3. backend/app.py
4. backend/auth.py
5. backend/interview_routes.py (includes save-posture endpoint)
6. backend/emotion_api.py
7. backend/.env.example

**Frontend (13 files):**
1. frontend/index.html
2. frontend/login.html
3. frontend/signup.html
4. frontend/forgot_password.html
5. frontend/home.html
6. frontend/start_interview.html
7. frontend/interview.html (CRITICAL)
8. frontend/about.html
9. frontend/previous_interviews.html
10. frontend/css/styles.css
11. frontend/js/auth.js
12. frontend/js/interview.js
13. frontend/js/ai_overlay.js

**Total:** 20 new files

---

