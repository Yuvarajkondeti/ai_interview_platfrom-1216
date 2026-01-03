// Base URL for API calls
const BASE_URL = 'http://localhost:5000';

/**
 * Check if user is authenticated
 * Returns user object if authenticated, null if not
 * Redirects to login if not authenticated (unless skipRedirect is true)
 */
async function checkAuth(skipRedirect = false) {
    try {
        const response = await fetch(`${BASE_URL}/auth/check-session`, {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.authenticated === true) {
            return data.user;
        } else {
            if (!skipRedirect) {
                window.location.href = 'login.html';
            }
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        if (!skipRedirect) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

/**
 * Logout user
 * Clears session and redirects to login
 */
async function logout() {
    try {
        await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        // Clear session storage
        sessionStorage.clear();

        // Redirect to login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway
        window.location.href = 'login.html';
    }
}

/**
 * Display error message
 * @param {string} elementId - ID of element to display error in
 * @param {string} message - Error message to display
 */
function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = message;
        element.className = 'error-message';
        element.style.display = 'block';

        // Auto-clear after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

/**
 * Display success message
 * @param {string} elementId - ID of element to display success in
 * @param {string} message - Success message to display
 */
function displaySuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = message;
        element.className = 'success-message';
        element.style.display = 'block';

        // Auto-clear after 3 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
