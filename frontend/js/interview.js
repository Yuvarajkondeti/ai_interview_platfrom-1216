// Interview flow control - voice interaction and SILENCE detection (audio-based)

// ================= GLOBALS =================
let interviewId;
let jobRole;
let questionNumber = 1;
let currentQuestionId;

let recognition;
let synthesis = window.speechSynthesis;

let isListening = false;
let userAnswer = "";

const MAX_QUESTIONS = 10;

// --- Audio-based silence detection ---
let audioContext;
let analyser;
let microphone;
let audioData;
let silenceStart = null;

const SILENCE_THRESHOLD = 0.02; // sensitivity (lower = more sensitive)
const SILENCE_DURATION = 7000; // 7 seconds true silence

// ================= INIT =================
window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    interviewId = sessionStorage.getItem('interview_id');
    jobRole = sessionStorage.getItem('job_role');

    if (!interviewId || !jobRole) {
        alert('Interview data not found. Redirecting.');
        window.location.href = 'start_interview.html';
        return;
    }

    setupSpeechRecognition();

    if (typeof initAIOverlay === 'function') {
        initAIOverlay();
    }

    setTimeout(() => {
        askQuestion();
    }, 2000);
}

// ================= SPEECH RECOGNITION =================
function setupSpeechRecognition() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert('Speech recognition not supported. Use Chrome / Edge.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = handleSpeechResult;
    recognition.onend = handleRecognitionEnd;
    recognition.onerror = handleRecognitionError;
}

function handleSpeechResult(event) {
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
        }
    }

    if (finalTranscript) {
        userAnswer += finalTranscript;
    }
}

function handleRecognitionEnd() {
    if (isListening) {
        try {
            recognition.start();
        } catch (e) {}
    }
}

function handleRecognitionError(event) {
    console.error("Speech error:", event.error);

    if (event.error === "not-allowed") {
        alert("Microphone permission denied.");
        endInterview();
    }
}

// ================= INTERVIEW FLOW =================
async function askQuestion() {
    if (questionNumber > MAX_QUESTIONS) {
        await endInterview();
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/interview/generate-question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
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
            alert("Failed to generate question.");
            await endInterview();
        }
    } catch (error) {
        console.error(error);
        await endInterview();
    }
}

function speakQuestion(text) {
    stopListening(); // safety

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = "en-US";

    utterance.onend = () => {
        setTimeout(() => {
            startListening();
        }, 1000);
    };

    synthesis.speak(utterance);
}

// ================= LISTEN + SILENCE =================
async function startListening() {
    isListening = true;
    userAnswer = "";
    silenceStart = null;

    try {
        recognition.start();
    } catch (e) {}

    await startAudioSilenceDetection();
}

async function startAudioSilenceDetection() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    microphone = audioContext.createMediaStreamSource(stream);
    audioData = new Uint8Array(analyser.fftSize);

    microphone.connect(analyser);

    monitorAudioSilence();
}

function monitorAudioSilence() {
    if (!isListening) return;

    analyser.getByteTimeDomainData(audioData);

    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        let value = (audioData[i] - 128) / 128;
        sum += value * value;
    }

    const volume = Math.sqrt(sum / audioData.length);

    if (volume < SILENCE_THRESHOLD) {
        if (!silenceStart) silenceStart = Date.now();
        if (Date.now() - silenceStart > SILENCE_DURATION) {
            stopListening();
            return;
        }
    } else {
        silenceStart = null;
    }

    requestAnimationFrame(monitorAudioSilence);
}

function stopListening() {
    if (!isListening) return;

    isListening = false;

    try {
        recognition.stop();
    } catch (e) {}

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    saveAnswerAndContinue();
}

// ================= SAVE & NEXT =================
async function saveAnswerAndContinue() {
    let finalAnswer = userAnswer.trim();
    if (!finalAnswer || finalAnswer.length < 5) {
        finalAnswer = "No response";
    }

    try {
        await fetch(`${BASE_URL}/api/interview/save-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                question_id: currentQuestionId,
                answer_text: finalAnswer
            })
        });
    } catch (e) {}

    questionNumber++;
    askQuestion();
}

// ================= END =================
async function endInterview() {
    synthesis.cancel();

    try {
        recognition.stop();
    } catch (e) {}

    if (typeof stopAIOverlay === "function") {
        stopAIOverlay();
    }

    try {
        await fetch(`${BASE_URL}/api/interview/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ interview_id: interviewId })
        });
    } catch (e) {}

    setTimeout(() => {
        window.location.href = "previous_interviews.html";
    }, 3000);
}
