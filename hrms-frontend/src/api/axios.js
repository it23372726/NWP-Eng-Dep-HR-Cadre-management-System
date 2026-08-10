import axios from "axios";
import { isTokenExpired, clearAuthData, redirectToLogin, generateCorrelationId } from "../utils/tokenUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
    baseURL: `${API_BASE_URL.replace(/\/$/, "")}/api`
});

// Public endpoints that should not have Authorization header
const publicEndpoints = [
    '/auth/login'
];

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        // Check if this is a public endpoint
        const isPublicEndpoint = publicEndpoints.some(url =>
            config.url?.includes(url)
        );

        // Only attach token if:
        // 1. Token exists
        // 2. Token is not expired
        // 3. This is not a public endpoint
        if (token && !isTokenExpired(token) && !isPublicEndpoint) {
            config.headers.Authorization = `Bearer ${token.trim()}`;
        }

        config.headers["X-Correlation-Id"] = generateCorrelationId();

        const clientHost = localStorage.getItem("clientHost");
        if (clientHost) {
            config.headers["X-Client-Host"] = clientHost;
        }

        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) {
            config.headers["X-Session-Id"] = sessionId;
        }

        if (
            config.data
            && !(config.data instanceof FormData)
            && !config.headers["Content-Type"]
        ) {
            config.headers["Content-Type"] = "application/json";
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        // Only force re-login on authentication failure.
        // 403 means authenticated but not allowed for that resource.
        if (status === 401) {
            clearAuthData();

            if (window.location.pathname !== '/') {
                redirectToLogin();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
