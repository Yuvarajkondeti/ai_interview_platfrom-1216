from flask import Blueprint, request, jsonify, session
from functools import wraps
from database import get_db_connection
import cv2
import numpy as np
from deepface import DeepFace

emotion = Blueprint('emotion', __name__, url_prefix='/api/emotion')

def require_auth(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@emotion.route('/detect', methods=['POST'])
@require_auth
def detect_emotion():
    """Detect emotion from webcam frame"""
    try:
        # Check if frame and interview_id are in request
        if 'frame' not in request.files:
            return jsonify({'error': 'Frame image required'}), 400

        if 'interview_id' not in request.form:
            return jsonify({'error': 'Interview ID required'}), 400

        frame_file = request.files['frame']
        interview_id = request.form.get('interview_id')

        # Read image file
        file_bytes = np.frombuffer(frame_file.read(), np.uint8)
        img_array = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img_array is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Resize image for faster processing (max 640x480)
        height, width = img_array.shape[:2]
        if width > 640:
            scale = 640 / width
            new_width = 640
            new_height = int(height * scale)
            img_array = cv2.resize(img_array, (new_width, new_height))

        # Try to detect emotion using DeepFace
        try:
            result = DeepFace.analyze(
                img_array,
                actions=['emotion'],
                enforce_detection=False,
                silent=True
            )

            # Handle result (DeepFace can return list or dict)
            if isinstance(result, list):
                result = result[0]

            # Extract dominant emotion and confidence
            dominant_emotion = result.get('dominant_emotion', 'neutral')
            emotion_scores = result.get('emotion', {})
            confidence = emotion_scores.get(dominant_emotion, 0)

            # Save emotion to database
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                'INSERT INTO emotion_timeline (interview_id, emotion_label, confidence) VALUES (?, ?, ?)',
                (interview_id, dominant_emotion, confidence)
            )
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'emotion': dominant_emotion,
                'confidence': round(confidence, 1)
            }), 200

        except Exception as deepface_error:
            # If DeepFace fails (no face detected, etc.), return gracefully
            print(f"DeepFace error: {str(deepface_error)}")

            return jsonify({
                'success': True,
                'emotion': 'no_face',
                'confidence': 0
            }), 200

    except Exception as e:
        print(f"Emotion detection error: {str(e)}")
        # Don't crash interview - return gracefully
        return jsonify({
            'success': True,
            'emotion': 'no_face',
            'confidence': 0
        }), 200
