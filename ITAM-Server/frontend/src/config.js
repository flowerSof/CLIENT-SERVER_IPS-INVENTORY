/**
 * Global Configuration Settings
 * 
 * This file centralizes configuration parameters for the frontend app.
 * By default, it reads from environment variables (e.g. VITE_API_BASE_URL).
 * If not provided, it falls back to the default local development server.
 * 
 * When deploying to another machine, you can change this fallback
 * or configure a .env file depending on the build process.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Export standard endpoints using the base URL
export const API_ENDPOINTS = {
    AUTH: `${API_BASE_URL}/api/auth`,
    USERS: `${API_BASE_URL}/api/users`,
    ASSETS: `${API_BASE_URL}/api/assets`,
    REPORTS: `${API_BASE_URL}/api/reports`,
    BUILDINGS: `${API_BASE_URL}/api/buildings`,
    FLOORS: `${API_BASE_URL}/api/floors`,
    AREAS: `${API_BASE_URL}/api/areas`,
    CATALOGS: `${API_BASE_URL}/api/catalogs`,
    GLOSSARY: `${API_BASE_URL}/api/glossary`,
    PRINT_STATS: `${API_BASE_URL}/api/print-stats`,
    PRINTERS: `${API_BASE_URL}/api/printers`,
    HISTORY: `${API_BASE_URL}/api/history`,
    REMOTE: `${API_BASE_URL}/api/remote`
};
