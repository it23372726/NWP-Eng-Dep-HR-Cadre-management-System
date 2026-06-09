import axios from "axios";
import { isTokenExpired, clearAuthData, redirectToLogin } from "../utils/tokenUtils";

const api = axios.create({
    baseURL: "http://localhost:8080/api"
});

// Public endpoints that should not have Authorization header
const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/register'
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

        // Handle 401 (Unauthorized) and 403 (Forbidden) errors
        if (status === 401 || status === 403) {
            // Clear auth data
            clearAuthData();

            // Redirect to login page (only if not already on login page)
            if (window.location.pathname !== '/') {
                redirectToLogin();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
