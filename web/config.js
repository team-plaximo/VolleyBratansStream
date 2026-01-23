/**
 * VolleyBratans Stream Platform - Shared Configuration
 * Centralized API and storage configuration to avoid code duplication
 * 
 * @version 1.0.0
 */

// Create namespace
window.VolleyBratans = window.VolleyBratans || {};

/**
 * Get the API base URL based on current environment
 * Handles local development (file://, localhost:5000) and production
 * 
 * @returns {string} API base URL (empty string for production, full URL for dev)
 */
window.VolleyBratans.getApiBase = function () {
    // Local file access (development without server)
    if (window.location.protocol === 'file:') {
        return 'http://localhost:8080';
    }
    // Local development with serve (port 5000)
    if (window.location.port === '5000') {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
    }
    // Production - same-origin, no base needed
    return '';
};

/**
 * Storage keys used across the application
 */
window.VolleyBratans.STORAGE_KEYS = {
    SCOUT: 'volleybratans_scout',
    SCOREBOARD: 'volleybratans_scoreboard',
    MATCHDAY: 'volleybratans_matchday',
    PROFILES: 'volleybratans_profiles',
    THEME: 'volleybratans_theme'
};

/**
 * API endpoints
 */
window.VolleyBratans.API = {
    SCOUT: '/api/scout',
    SCOUT_VERSION: '/api/scout/version',
    MATCHDAY: '/api/matchday',
    MATCHDAY_PARSE: '/api/matchday/parse',
    AUTH_SESSION: '/api/auth/session',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout'
};

// Convenience shorthand
window.VB = window.VolleyBratans;
