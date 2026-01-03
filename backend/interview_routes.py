from flask import Blueprint, request, jsonify, session
from functools import wraps
from database import get_db_connection
from datetime import datetime
import requests
import os

interview = Blueprint('interview', __name__, url_prefix='/api/interview')

# Configuration
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama2')

def require_auth(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@interview.route('/start', methods=['POST'])
@require_auth
def start_interview():
    """Start new interview session"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        job_role = data.get('job_role', '').strip()

        if not job_role:
            return jsonify({'error': 'Job role is required'}), 400

        user_id = session.get('user_id')

        # Create new interview record
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO interviews (user_id, job_role, status) VALUES (?, ?, ?)',
            (user_id, job_role, 'ongoing')
        )
        interview_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'interview_id': interview_id,
            'message': 'Interview started'
        }), 201

    except Exception as e:
        print(f"Start interview error: {str(e)}")
        return jsonify({'error': 'Failed to start interview'}), 500

@interview.route('/generate-question', methods=['POST'])
@require_auth
def generate_question():
    """Generate next interview question using Ollama"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        interview_id = data.get('interview_id')
        job_role = data.get('job_role', '').strip()
        question_number = data.get('question_number')

        if not interview_id or not job_role or not question_number:
            return jsonify({'error': 'Missing required fields'}), 400

        # Generate question using Ollama
        prompt = f"""You are an experienced interviewer conducting a job interview for the position of {job_role}.
This is question number {question_number} of the interview.
Generate a single relevant interview question.
Only return the question text, nothing else."""

        try:
            ollama_response = requests.post(
                OLLAMA_API_URL,
                json={
                    'model': OLLAMA_MODEL,
                    'prompt': prompt,
                    'stream': False
                },
                timeout=30
            )
            ollama_response.raise_for_status()

            question_text = ollama_response.json().get('response', '').strip()

            if not question_text:
                question_text = f"Tell me about your experience relevant to {job_role}."

        except requests.exceptions.ConnectionError:
            return jsonify({'error': 'AI service unavailable. Please ensure Ollama is running.'}), 503
        except requests.exceptions.Timeout:
            return jsonify({'error': 'AI service timeout. Please try again.'}), 503
        except Exception as e:
            print(f"Ollama error: {str(e)}")
            # Fallback to generic questions
            fallback_questions = [
                f"Tell me about yourself and your experience with {job_role}.",
                "What are your greatest strengths?",
                "What are your biggest weaknesses?",
                f"Why do you want to work as a {job_role}?",
                "Describe a challenging project you've worked on.",
                "Where do you see yourself in 5 years?",
                "How do you handle stress and pressure?",
                "What motivates you in your work?",
                "Tell me about a time you worked in a team.",
                "Do you have any questions for us?"
            ]
            question_text = fallback_questions[min(question_number - 1, len(fallback_questions) - 1)]

        # Save question to database
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO interview_questions (interview_id, question_text, question_number) VALUES (?, ?, ?)',
            (interview_id, question_text, question_number)
        )
        question_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'question': question_text,
            'question_id': question_id
        }), 200

    except Exception as e:
        print(f"Generate question error: {str(e)}")
        return jsonify({'error': 'Failed to generate question'}), 500

@interview.route('/save-answer', methods=['POST'])
@require_auth
def save_answer():
    """Save user's transcribed answer"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        question_id = data.get('question_id')
        answer_text = data.get('answer_text', '').strip()

        if not question_id:
            return jsonify({'error': 'Question ID required'}), 400

        if not answer_text:
            answer_text = "No response"

        # Verify question exists
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM interview_questions WHERE id = ?', (question_id,))
        question = cursor.fetchone()

        if not question:
            conn.close()
            return jsonify({'error': 'Question not found'}), 404

        # Insert answer
        cursor.execute(
            'INSERT INTO interview_answers (question_id, answer_text) VALUES (?, ?)',
            (question_id, answer_text)
        )
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Answer saved'
        }), 200

    except Exception as e:
        print(f"Save answer error: {str(e)}")
        return jsonify({'error': 'Failed to save answer'}), 500

@interview.route('/save-posture', methods=['POST'])
@require_auth
def save_posture():
    """Save posture event during interview"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        interview_id = data.get('interview_id')
        posture_label = data.get('posture_label', '').strip()

        if not interview_id or not posture_label:
            return jsonify({'error': 'Interview ID and posture label required'}), 400

        # Insert posture event
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO posture_events (interview_id, posture_label) VALUES (?, ?)',
            (interview_id, posture_label)
        )
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Posture saved'
        }), 200

    except Exception as e:
        print(f"Save posture error: {str(e)}")
        return jsonify({'error': 'Failed to save posture'}), 500

@interview.route('/end', methods=['POST'])
@require_auth
def end_interview():
    """End interview session"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        interview_id = data.get('interview_id')

        if not interview_id:
            return jsonify({'error': 'Interview ID required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get interview info
        cursor.execute('SELECT started_at FROM interviews WHERE id = ?', (interview_id,))
        interview = cursor.fetchone()

        if not interview:
            conn.close()
            return jsonify({'error': 'Interview not found'}), 404

        # Calculate overall emotion (most frequent)
        cursor.execute('''
            SELECT emotion_label, COUNT(*) as count
            FROM emotion_timeline
            WHERE interview_id = ?
            GROUP BY emotion_label
            ORDER BY count DESC
            LIMIT 1
        ''', (interview_id,))
        emotion_result = cursor.fetchone()
        overall_emotion = emotion_result['emotion_label'] if emotion_result else 'neutral'

        # Calculate overall posture (most frequent)
        cursor.execute('''
            SELECT posture_label, COUNT(*) as count
            FROM posture_events
            WHERE interview_id = ?
            GROUP BY posture_label
            ORDER BY count DESC
            LIMIT 1
        ''', (interview_id,))
        posture_result = cursor.fetchone()
        overall_posture = posture_result['posture_label'] if posture_result else 'Good'

        # Calculate duration
        started_at = datetime.fromisoformat(interview['started_at'])
        ended_at = datetime.now()
        duration_minutes = int((ended_at - started_at).total_seconds() / 60)

        # Update interview record
        cursor.execute('''
            UPDATE interviews
            SET status = ?, ended_at = ?, overall_emotion = ?, overall_posture = ?
            WHERE id = ?
        ''', ('completed', ended_at.isoformat(), overall_emotion, overall_posture, interview_id))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'summary': {
                'overall_emotion': overall_emotion,
                'overall_posture': overall_posture,
                'duration_minutes': duration_minutes
            }
        }), 200

    except Exception as e:
        print(f"End interview error: {str(e)}")
        return jsonify({'error': 'Failed to end interview'}), 500

@interview.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get user's previous interviews"""
    try:
        user_id = session.get('user_id')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, job_role, started_at, ended_at, overall_emotion, overall_posture
            FROM interviews
            WHERE user_id = ? AND status = 'completed'
            ORDER BY started_at DESC
        ''', (user_id,))

        interviews = []
        for row in cursor.fetchall():
            interviews.append({
                'id': row['id'],
                'job_role': row['job_role'],
                'started_at': row['started_at'],
                'ended_at': row['ended_at'],
                'overall_emotion': row['overall_emotion'],
                'overall_posture': row['overall_posture']
            })

        conn.close()

        return jsonify({
            'success': True,
            'interviews': interviews
        }), 200

    except Exception as e:
        print(f"Get history error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve interview history'}), 500

@interview.route('/details/<int:interview_id>', methods=['GET'])
@require_auth
def get_interview_details(interview_id):
    """Get detailed interview review data"""
    try:
        user_id = session.get('user_id')

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get interview basic info and verify ownership
        cursor.execute('''
            SELECT id, job_role, started_at, ended_at, overall_emotion, overall_posture, user_id
            FROM interviews
            WHERE id = ?
        ''', (interview_id,))
        interview = cursor.fetchone()

        if not interview:
            conn.close()
            return jsonify({'error': 'Interview not found'}), 404

        if interview['user_id'] != user_id:
            conn.close()
            return jsonify({'error': 'Access denied'}), 403

        # Get Q&A pairs
        cursor.execute('''
            SELECT q.question_text, q.asked_at, a.answer_text
            FROM interview_questions q
            LEFT JOIN interview_answers a ON q.id = a.question_id
            WHERE q.interview_id = ?
            ORDER BY q.question_number
        ''', (interview_id,))

        qa_pairs = []
        for row in cursor.fetchall():
            qa_pairs.append({
                'question': row['question_text'],
                'answer': row['answer_text'] if row['answer_text'] else 'No response',
                'asked_at': row['asked_at']
            })

        # Get emotion timeline
        cursor.execute('''
            SELECT emotion_label, confidence, timestamp
            FROM emotion_timeline
            WHERE interview_id = ?
            ORDER BY timestamp
        ''', (interview_id,))

        emotion_timeline = []
        for row in cursor.fetchall():
            emotion_timeline.append({
                'emotion': row['emotion_label'],
                'confidence': row['confidence'],
                'timestamp': row['timestamp']
            })

        # Get posture summary
        cursor.execute('''
            SELECT posture_label, COUNT(*) as count
            FROM posture_events
            WHERE interview_id = ?
            GROUP BY posture_label
        ''', (interview_id,))

        posture_summary = {'good_count': 0, 'average_count': 0, 'poor_count': 0}
        for row in cursor.fetchall():
            label = row['posture_label'].lower()
            if label == 'good':
                posture_summary['good_count'] = row['count']
            elif label == 'average':
                posture_summary['average_count'] = row['count']
            elif label == 'poor':
                posture_summary['poor_count'] = row['count']

        conn.close()

        return jsonify({
            'success': True,
            'interview': {
                'id': interview['id'],
                'job_role': interview['job_role'],
                'started_at': interview['started_at'],
                'ended_at': interview['ended_at'],
                'overall_emotion': interview['overall_emotion'],
                'overall_posture': interview['overall_posture'],
                'qa_pairs': qa_pairs,
                'emotion_timeline': emotion_timeline,
                'posture_summary': posture_summary
            }
        }), 200

    except Exception as e:
        print(f"Get interview details error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve interview details'}), 500
