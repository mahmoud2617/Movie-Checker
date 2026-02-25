// ==================== URL Configuration ====================
// These are loaded dynamically via /env-config.js served from server.js
const BACKEND_URL = window.ENV_CONFIG?.WEBSITE_BACKEND_URL || 'http://localhost:8080';
const FRONTEND_URL = window.location.origin; // Dynamically set to current host
const API_BASE_URL = BACKEND_URL; // alias kept so all existing code works

// ==================== API Endpoints ====================
const API_ENDPOINTS = {
    // Auth
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/users',
    verify: '/auth/verify',
    refresh: '/auth/refresh',
    me: '/auth/me',

    // User — exactly matching the Spring Boot controller
    userById: (id) => `/users/${id}`,
    changeUserName: () => `/users/change-name`,         // @AuthenticationPrincipal, no path ID
    changeUserPassword: (id) => `/users/change-password/${id}`,
    deleteUser: () => `/users`,                     // @AuthenticationPrincipal, no path ID

    // Reset password flow
    resetPasswordRequest: '/users/reset-password/request',    // PATCH {email} → {userId}
    resetPasswordVerify: '/users/reset-password/verify',     // PATCH ?id=&code= → {token}
    resetPasswordConfirm: '/users/password-reset/confirm',    // PATCH {newPassword}, Bearer=reset token

    // Movies
    movies: '/movies',
    searchMovies: '/movies/search',
    suggestMovies: '/movies/search/suggest',

    // User-movie collection
    userMovies: '/user-movies',
    updateMovieStatus: '/user-movies/status',
    updateMovieFavorite: '/user-movies/favorite',
    updateMovieRate: '/user-movies/user-rate',
};

// ==================== Global State ====================
let currentUser = null;
let currentToken = null;
let resetToken = null;
let allMovies = [];
let userMovies = [];
let currentFilter = 'all';
let suggestionSelectedIndex = -1;
