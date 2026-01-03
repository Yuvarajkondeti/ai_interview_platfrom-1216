// AI Overlay - Emotion and Posture Detection
const BASE_URL = 'http://localhost:5000';

// Global variables
let webcamStream;
let videoElement;
let emotionInterval;
let currentEmotion = 'neutral';
let currentPosture = 'Good';
let mediapipePose;
let camera;

// Initialize AI overlay
function initAIOverlay() {
    videoElement = document.getElementById('webcamVideo');

    // Request camera access
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            webcamStream = stream;
            videoElement.srcObject = stream;

            // Start emotion detection
            startEmotionDetection();

            // Start posture detection
            initPostureDetection();
        })
        .catch((error) => {
            console.error('Camera access error:', error);
        });
}

// Start emotion detection (every 1.5 seconds)
function startEmotionDetection() {
    emotionInterval = setInterval(() => {
        captureFrameAndDetectEmotion();
    }, 1500);  // Every 1.5 seconds
}

// Capture frame and detect emotion
async function captureFrameAndDetectEmotion() {
    try {
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
            } catch (error) {
                console.error('Emotion detection error:', error);
                // Don't crash - just skip this update
            }
        }, 'image/jpeg', 0.8);
    } catch (error) {
        console.error('Frame capture error:', error);
    }
}

// Update emotion display
function updateEmotionDisplay(emotion, confidence) {
    currentEmotion = emotion;
    document.getElementById('emotionLabel').textContent = emotion;
    document.getElementById('emotionConfidence').textContent = Math.round(confidence);
}

// Initialize posture detection using MediaPipe
function initPostureDetection() {
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
}

// Handle pose detection results
function onPoseResults(results) {
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
}

// Calculate posture from landmarks
function calculatePosture(landmarks) {
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
}

// Update posture display
function updatePostureDisplay(posture) {
    currentPosture = posture;
    document.getElementById('postureLabel').textContent = posture;

    const emojiMap = {
        'Good': '🧍',
        'Average': '🙂',
        'Poor': '🪑'
    };
    document.getElementById('postureEmoji').textContent = emojiMap[posture];
}

// Save posture event to backend
async function savePostureEvent(posture) {
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
    } catch (error) {
        console.error('Failed to save posture:', error);
        // Don't crash - just log
    }
}

// Stop AI overlay (called when ending interview)
function stopAIOverlay() {
    clearInterval(emotionInterval);

    if (camera) {
        camera.stop();
    }

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }
}

// Export functions for use in interview.js
window.initAIOverlay = initAIOverlay;
window.stopAIOverlay = stopAIOverlay;
