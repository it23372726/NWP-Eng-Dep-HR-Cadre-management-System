/**
 * Token utility functions for JWT handling
 */

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - true if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token) {
    if (!token) {
        return true;
    }

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return true;
        }

        const payload = JSON.parse(atob(parts[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        return expirationTime < currentTime;
    } catch {
        // If token is malformed, consider it expired
        return true;
    }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Redirect to login page
 */
export function redirectToLogin() {
    window.location.href = '/';
}
