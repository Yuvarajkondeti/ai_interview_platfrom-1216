// Interview flow control - voice interaction and silence detection
const BASE_URL = 'http://localhost:5000';

// Global variables
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

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // Get interview data from sessionStorage
    interviewId = sessionStorage.getItem('interview_id');
    jobRole = sessionStorage.getItem('job_role');

    if (!interviewId || !jobRole) {
        alert('Interview data not found. Redirecting to start page.');
        window.location.href = 'start_interview.html';
        return;
    }

    // Setup speech recognition
    setupSpeechRecognition();

    // Initialize AI overlay (emotion and posture detection)
    if (typeof initAIOverlay === 'function') {
        initAIOverlay();
    }

    // Start interview - ask first question
    setTimeout(() => {
        askQuestion();
    }, 2000); // Wait 2 seconds for setup
}

function setupSpeechRecognition() {
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
}

async function askQuestion() {
    // Check if we've reached max questions
    if (questionNumber > MAX_QUESTIONS) {
        await endInterview();
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/interview/generate-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                interview_id: interviewId,
                job_role: jobRole,
                question_number: questionNumber
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentQuestionId = data.question_id;
            speakQuestion(data.question);
        } else {
            // Handle errors
            if (response.status === 503) {
                alert('AI service unavailable. Please ensure Ollama is running locally.');
            } else {
                alert('Failed to generate question. Ending interview.');
            }
            await endInterview();
        }
    } catch (error) {
        console.error('Failed to generate question:', error);
        alert('Connection error. Ending interview.');
        await endInterview();
    }
}

function speakQuestion(questionText) {
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
}

function startListening() {
    isListening = true;
    userAnswer = "";

    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start recognition:', e);
        // If recognition is already started, continue
    }

    startSilenceTimer();
}

function startSilenceTimer() {
    clearTimeout(silenceTimer);

    silenceTimer = setTimeout(() => {
        if (isListening) {
            stopListening();
        }
    }, 5000);  // 5 seconds of silence
}

function handleSpeechResult(event) {
    const transcript = event.results[event.results.length - 1][0].transcript;
    userAnswer += transcript + " ";

    // Reset silence timer (user is speaking)
    startSilenceTimer();
}

function stopListening() {
    isListening = false;

    try {
        recognition.stop();
    } catch (e) {
        console.error('Failed to stop recognition:', e);
    }

    clearTimeout(silenceTimer);

    // Save answer and continue
    saveAnswerAndContinue();
}

async function saveAnswerAndContinue() {
    // Trim answer
    let finalAnswer = userAnswer.trim();

    // If answer is too short or empty, mark as "No response"
    if (!finalAnswer || finalAnswer.length < 5) {
        finalAnswer = "No response";
    }

    try {
        await fetch(`${BASE_URL}/api/interview/save-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                question_id: currentQuestionId,
                answer_text: finalAnswer
            })
        });
    } catch (error) {
        console.error('Failed to save answer:', error);
        // Don't block on save failure - continue interview
    }

    // Increment question number
    questionNumber++;

    // Ask next question
    await askQuestion();
}

async function endInterview() {
    // Stop all speech
    synthesis.cancel();

    // Stop recognition if running
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Failed to stop recognition:', e);
        }
    }

    // Stop AI overlay
    if (typeof stopAIOverlay === 'function') {
        stopAIOverlay();
    }

    try {
        await fetch(`${BASE_URL}/api/interview/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                interview_id: interviewId
            })
        });
    } catch (error) {
        console.error('Failed to end interview:', error);
    }

    // Show completion overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 24px;
        text-align: center;
    `;
    overlay.innerHTML = '<div>Interview completed!<br>Calculating your results...</div>';
    document.body.appendChild(overlay);

    // Redirect to previous interviews page after 3 seconds
    setTimeout(() => {
        window.location.href = 'previous_interviews.html';
    }, 3000);
}

function handleRecognitionEnd() {
    // Recognition stopped unexpectedly
    if (isListening) {
        try {
            recognition.start();  // Restart
        } catch (e) {
            console.error('Failed to restart recognition:', e);
        }
    }
}

function handleRecognitionError(event) {
    console.error('Speech recognition error:', event.error);

    if (event.error === 'no-speech') {
        // No speech detected - this is fine, silence timer will handle
    } else if (event.error === 'aborted') {
        // Aborted - restart if still listening
        if (isListening) {
            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to restart after abort:', e);
            }
        }
    } else if (event.error === 'not-allowed') {
        // Mic permission denied
        alert('Microphone permission denied. Cannot continue interview.');
        endInterview();
    }
}
