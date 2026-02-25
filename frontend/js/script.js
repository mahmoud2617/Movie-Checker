// ==================== API Configuration ====================
const API_BASE_URL = window.ENV_CONFIG?.WEBSITE_BACKEND_URL || 'http://localhost:8080';
const API_ENDPOINTS = {
    // Auth endpoints
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/users',
    verify: '/auth/verify',
    refresh: '/auth/refresh',
    me: '/auth/me',

    // User endpoints
    users: '/users',
    userById: (id) => `/users/${id}`,
    changeUserName: (id) => `/users/change-name/${id}`,
    changeUserEmail: (id) => `/users/change-email/${id}`,
    changeUserPassword: (id) => `/users/change-password/${id}`,
    deleteUser: (id) => `/users/${id}`,

    // Movie endpoints
    movies: '/movies',
    searchMovies: '/movies/search',
    suggestMovies: '/movies/search/suggest',

    // User movies endpoints
    userMovies: '/user-movies',
    updateMovieStatus: '/user-movies/status',
    updateMovieFavorite: '/user-movies/favorite',
    updateMovieRate: '/user-movies/user-rate',
};

// ==================== Global State ====================
let currentUser = null;
let currentToken = null;
let allMovies = [];
let userMovies = [];
let currentFilter = 'all';
let suggestionSelectedIndex = -1;

// ==================== Token helpers ====================
function getTokenExpiry(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null; // convert to ms
    } catch { return null; }
}

function isTokenExpiredOrExpiringSoon(token, bufferMs = 30000) {
    const exp = getTokenExpiry(token);
    if (!exp) return false; // can't parse, assume ok
    return Date.now() >= exp - bufferMs;
}

async function refreshAccessToken() {
    try {
        const resp = await fetch(API_BASE_URL + API_ENDPOINTS.refresh, {
            method: 'POST',
            credentials: 'include', // send the refreshToken cookie
        });

        if (!resp.ok) {
            console.warn('Token refresh failed with status', resp.status);
            return null;
        }

        const data = await resp.json();
        const newToken = data.accessToken || data.token || data.token?.accessToken;
        if (!newToken) {
            console.warn('Token refresh response did not contain a token field');
            return null;
        }

        currentToken = newToken;
        localStorage.setItem('accessToken', newToken);
        return newToken;
    } catch (err) {
        console.error('Error refreshing access token', err);
        return null;
    }
}

async function apiFetch(url, options = {}, { auth = false, retryOnAuthError = true } = {}) {
    const finalOptions = { ...options, credentials: 'include' }; // always include cookies
    const headers = { ...(options.headers || {}) };

    if (auth) {
        // Proactively refresh if token is expired or expiring within 30s
        if (currentToken && isTokenExpiredOrExpiringSoon(currentToken)) {
            const refreshed = await refreshAccessToken();
            if (refreshed) currentToken = refreshed;
        }

        if (currentToken && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }
    }

    finalOptions.headers = headers;

    let response = await fetch(url, finalOptions);

    // If still 401, attempt one refresh and retry
    if (auth && retryOnAuthError && response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            finalOptions.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, finalOptions);
        } else {
            // Refresh also failed — session is truly expired
            localStorage.removeItem('accessToken');
            currentToken = null;
            currentUser = null;
            updateAuthUI(false);
        }
    }

    return response;
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setActiveNav('home');

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        const suggestions = document.getElementById('searchSuggestions');
        const box = document.querySelector('.search-box');
        if (box && !box.contains(e.target)) {
            suggestions.classList.remove('active');
            suggestionSelectedIndex = -1;
        }
        // Close dropdown when clicking outside navbar
        const dropdown = document.getElementById('navDropdown');
        const toggle = document.getElementById('navbarToggle');
        if (dropdown && dropdown.classList.contains('open')) {
            if (!dropdown.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        }
    });
});

function toggleNavMenu() {
    const dropdown = document.getElementById('navDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
}

// ==================== Authentication ====================
function checkAuthStatus() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        currentToken = token;
        // If token is already expired, try to refresh before hitting /me
        if (isTokenExpiredOrExpiringSoon(token, 0)) {
            refreshAccessToken().then(newToken => {
                if (newToken) {
                    currentToken = newToken;
                    fetchCurrentUser();
                } else {
                    localStorage.removeItem('accessToken');
                    currentToken = null;
                    updateAuthUI(false);
                }
            });
        } else {
            fetchCurrentUser();
        }
    } else {
        updateAuthUI(false);
    }
}

async function fetchCurrentUser() {
    try {
        const response = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.me,
            { method: 'GET' },
            { auth: true }
        );

        if (response.ok) {
            currentUser = await response.json();
            updateAuthUI(true);
            await loadUserMovies();
        } else {
            localStorage.removeItem('accessToken');
            currentToken = null;
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('Error fetching current user:', error);
        updateAuthUI(false);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoadingSpinner(true);

    try {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const responseData = await response.json();
            const token = responseData?.accessToken || responseData?.token || responseData?.token?.accessToken;
            if (token) {
                localStorage.setItem('accessToken', token);
                currentToken = token;
                await fetchCurrentUser();
                closeLoginModal();
                showAlert('Logged in successfully', 'success');
            } else {
                showAlert('Login successful but no token received', 'error');
            }
        } else {
            const msg = await safeParseErrorMessage(response);
            if (response.status === 401 || response.status === 400) {
                showAlert(msg || 'Invalid email or password', 'error');
            } else if (response.status === 403) {
                showAlert(msg || 'Account not verified. Please check your email.', 'error');
            } else {
                showAlert(msg || `Login failed (${response.status})`, 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed: unable to reach server', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    showLoadingSpinner(true);

    try {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.register, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (response.status === 201 || response.status === 200) {
            // Show email verification notice
            showVerificationNotice(email);
        } else {
            const serverMessage = await safeParseErrorMessage(response) || `Registration failed (${response.status})`;
            showAlert(serverMessage, 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showAlert('Registration failed. Please try again. ' + error.message, 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// Show email verification notice after successful registration
function showVerificationNotice(email) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const notice = document.getElementById('verificationNotice');
    const emailEl = document.getElementById('verificationEmail');

    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (notice) notice.style.display = 'block';
    if (emailEl) emailEl.textContent = email;
}

// Called from the "Back to Sign In" button inside verification notice
function showLoginFromVerification() {
    const notice = document.getElementById('verificationNotice');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (notice) notice.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
}

function confirmLogout() {
    openGenericModal('logoutConfirmModal');
}

function logout() {
    document.getElementById('logoutConfirmModal').classList.remove('active');
    (async () => {
        try {
            await fetch(API_BASE_URL + API_ENDPOINTS.logout, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Backend logout failed', err);
        } finally {
            localStorage.removeItem('accessToken');
            currentToken = null;
            currentUser = null;
            userMovies = [];
            updateAuthUI(false);
            showHome();
            showAlert('Logged out successfully', 'success');
        }
    })();
}

function confirmDeleteAccount() {
    openGenericModal('deleteConfirmModal');
    const input = document.getElementById('deleteConfirmText');
    if (input) {
        input.value = '';
        input.focus();
    }
}

async function confirmDeleteAccountSubmit() {
    const confirmText = document.getElementById('deleteConfirmText').value.trim();

    if (confirmText !== 'delete') {
        showAlert('Please type "delete" to confirm', 'warning');
        return;
    }

    showLoadingSpinner(true);

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.deleteUser(currentUser.id),
            { method: 'DELETE' },
            { auth: true }
        );

        if (resp.ok) {
            document.getElementById('deleteConfirmModal').classList.remove('active');
            localStorage.removeItem('accessToken');
            currentToken = null;
            currentUser = null;
            userMovies = [];
            updateAuthUI(false);
            showHome();
            showAlert('Account deleted successfully', 'success');
        } else {
            showAlert('Failed to delete account', 'error');
        }
    } catch (error) {
        console.error('Delete account error:', error);
        showAlert('Error deleting account', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function updateAuthUI(isAuthenticated) {
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');

    if (isAuthenticated && currentUser) {
        if (authNav) authNav.style.display = 'none';
        if (userNav) userNav.style.display = 'flex';
        const greetingName = currentUser.name || currentUser.username || currentUser.email || 'User';
        const el = document.getElementById('userGreeting');
        if (el) el.textContent = `Hi, ${greetingName}`;
    } else {
        if (authNav) authNav.style.display = 'block';
        if (userNav) userNav.style.display = 'none';
    }
}

// ==================== Navigation ====================
function hideAllSections() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Clear active on both nav-tabs and dropdown links
    document.querySelectorAll('.nav-tabs a, .nav-dropdown-inner a').forEach(l => l.classList.remove('active-nav'));
}

function setActiveNav(selector) {
    document.querySelectorAll('.nav-tabs a, .nav-dropdown-inner a').forEach(l => l.classList.remove('active-nav'));
    document.querySelectorAll(`[data-nav="${selector}"]`).forEach(el => el.classList.add('active-nav'));
}

function showHome() {
    hideAllSections();
    document.getElementById('homeSection').classList.add('active');
    setActiveNav('home');
    closeNavMenu();
    // Home has no async data to refresh, but section shows fresh each time
}

function showMovies() {
    hideAllSections();
    document.getElementById('moviesSection').classList.add('active');
    setActiveNav('movies');
    closeNavMenu();
    // Clear search box and suggestions on tab click
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) { suggestions.classList.remove('active'); suggestions.innerHTML = ''; }
    clearTimeout(suggestionsTimeout);
    suppressSuggestions = false;
    suggestionSelectedIndex = -1;
    // Always reload movies on tab click (refresh behaviour)
    loadAllMovies();
}

function showProfile() {
    if (!currentUser) {
        showAlert('Please login first', 'warning');
        showLoginModal();
        return;
    }
    hideAllSections();
    document.getElementById('profileSection').classList.add('active');
    setActiveNav('profile');
    closeNavMenu();
    // Always reload profile data
    loadProfileData();
}

function showMyMovies() {
    if (!currentUser) {
        showAlert('Please login first', 'warning');
        showLoginModal();
        return;
    }
    hideAllSections();
    document.getElementById('myMoviesSection').classList.add('active');
    setActiveNav('myMovies');
    closeNavMenu();
    // Always reload user movies on tab click
    loadUserMovies();
}

function showEditProfile() {
    hideAllSections();
    document.getElementById('editProfileSection').classList.add('active');

}

function closeNavMenu() {
    const dropdown = document.getElementById('navDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

// ==================== Profile: Inline Edit Name ====================
function toggleEditName() {
    const form = document.getElementById('editNameForm');
    const input = document.getElementById('inlineEditName');
    if (!form) return;

    const isHidden = form.style.display === 'none' || form.style.display === '';
    if (isHidden) {
        form.style.display = 'block';
        if (input) {
            input.value = currentUser?.name || '';
            input.focus();
            input.select();
        }
    } else {
        form.style.display = 'none';
    }
}

async function submitEditName() {
    const input = document.getElementById('inlineEditName');
    if (!input) return;
    const name = input.value.trim();

    if (!name) {
        showAlert('Please enter a name', 'warning');
        return;
    }

    if (name === currentUser?.name) {
        toggleEditName();
        return;
    }

    showLoadingSpinner(true);
    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.changeUserName(currentUser.id),
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            },
            { auth: true }
        );

        if (resp.ok) {
            currentUser.name = name;
            document.getElementById('profileName').textContent = name;
            updateAuthUI(true);
            toggleEditName();
            showAlert('Name updated successfully', 'success');
        } else {
            const errMsg = await safeParseErrorMessage(resp);
            showAlert(errMsg || 'Failed to update name', 'error');
        }
    } catch (err) {
        console.error('submitEditName error', err);
        showAlert('Error updating name', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// Support Enter key in name input
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('inlineEditName');
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); submitEditName(); }
            if (e.key === 'Escape') toggleEditName();
        });
    }
});

// ==================== Profile: Inline Edit Password ====================
function toggleEditPassword() {
    const form = document.getElementById('editPasswordForm');
    if (!form) return;

    const isHidden = form.style.display === 'none' || form.style.display === '';
    if (isHidden) {
        form.style.display = 'block';
        const oldPw = document.getElementById('inlineOldPassword');
        const newPw = document.getElementById('inlineNewPassword');
        if (oldPw) oldPw.value = '';
        if (newPw) newPw.value = '';
        if (oldPw) oldPw.focus();
    } else {
        form.style.display = 'none';
    }
}

async function submitEditPassword() {
    const oldPw = document.getElementById('inlineOldPassword')?.value.trim();
    const newPw = document.getElementById('inlineNewPassword')?.value.trim();

    if (!oldPw) {
        showAlert('Please enter your current password', 'warning');
        return;
    }
    if (!newPw) {
        showAlert('Please enter a new password', 'warning');
        return;
    }

    showLoadingSpinner(true);
    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.changeUserPassword(currentUser.id),
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
            },
            { auth: true }
        );

        if (resp.ok) {
            toggleEditPassword();
            showAlert('Password updated successfully', 'success');
        } else {
            const errMsg = await safeParseErrorMessage(resp);
            showAlert(errMsg || 'Failed to update password', 'error');
        }
    } catch (err) {
        console.error('submitEditPassword error', err);
        showAlert('Error updating password', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// ==================== Quick Actions on Movie Cards ====================
async function quickToggleFavorite(movieId, button) {
    if (!currentUser) { showAlert('Please login first', 'warning'); showLoginModal(); return; }

    const userMovie = userMovies.find(um => um.movieDetails && um.movieDetails.id === movieId);
    const isFavorite = userMovie?.isFavorite || false;
    const ok = await updateMovieFavorite(movieId, !isFavorite);

    if (ok && button) {
        const nowFav = !isFavorite;
        button.classList.toggle('active', nowFav);
        button.textContent = nowFav ? '♥' : '♡';
    }
}

async function quickSetWatched(movieId, button) {
    if (!currentUser) { showAlert('Please login first', 'warning'); showLoginModal(); return; }

    const userMovie = userMovies.find(um => um.movieDetails && um.movieDetails.id === movieId);
    const currentStatus = userMovie?.status || null;
    const desiredStatus = currentStatus === 'WATCHED' ? null : 'WATCHED';
    const ok = await updateMovieStatus(movieId, desiredStatus);

    if (ok && button) {
        const watchlistBtn = button.parentElement.querySelector('.quick-watchlist-btn');
        if (desiredStatus === 'WATCHED') {
            button.classList.add('active');
            if (watchlistBtn) watchlistBtn.classList.remove('active');
        } else {
            button.classList.remove('active');
        }
    }
}

async function quickSetWatchlist(movieId, button) {
    if (!currentUser) { showAlert('Please login first', 'warning'); showLoginModal(); return; }

    const userMovie = userMovies.find(um => um.movieDetails && um.movieDetails.id === movieId);
    const currentStatus = userMovie?.status || null;
    const desiredStatus = currentStatus === 'WATCH_LIST' ? null : 'WATCH_LIST';
    const ok = await updateMovieStatus(movieId, desiredStatus);

    if (ok && button) {
        const watchedBtn = button.parentElement.querySelector('.quick-watch-btn');
        if (desiredStatus === 'WATCH_LIST') {
            button.classList.add('active');
            if (watchedBtn) watchedBtn.classList.remove('active');
        } else {
            button.classList.remove('active');
        }
    }
}

// ==================== Movies ====================
async function loadAllMovies() {
    showLoadingSpinner(true);
    try {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.movies);
        if (response.ok) {
            allMovies = await response.json();
            displayMovies(allMovies);
        } else {
            showAlert(`Failed to load movies (${response.status})`, 'error');
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showAlert('Error loading movies: ' + error.message, 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

let suppressSuggestions = false;
let suggestionAbortController = null;

async function searchMovies() {
    // 1. Remove focus from search button immediately
    document.activeElement?.blur();

    // 2. Kill any pending suggestion fetch and close the list NOW (synchronously)
    clearTimeout(suggestionsTimeout);
    if (suggestionAbortController) suggestionAbortController.abort();
    suppressSuggestions = true;
    const suggestionsEl = document.getElementById('searchSuggestions');
    if (suggestionsEl) {
        suggestionsEl.classList.remove('active');
        suggestionsEl.innerHTML = '';
    }
    suggestionSelectedIndex = -1;

    const query = document.getElementById('searchInput').value.trim();
    if (!query) { suppressSuggestions = false; loadAllMovies(); return; }

    showLoadingSpinner(true);

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const movies = await response.json();
            allMovies = movies;
            displayMovies(movies);
        } else if (response.status === 404) {
            displayMovies([]);
            showAlert('No movies found for your search', 'info');
        } else {
            showAlert(`Search failed: ${response.status}`, 'error');
            displayMovies([]);
        }
    } catch (error) {
        console.error('Search error:', error);
        showAlert('Search failed: ' + error.message, 'error');
        displayMovies([]);
    } finally {
        showLoadingSpinner(false);
        // Keep suppressed briefly so any stale async suggestion callbacks can't re-open the list
        setTimeout(() => { suppressSuggestions = false; }, 800);
    }
}

// ── Utilities removed — now in api.js ────────────────────────────────────────

function renderQuickActions(identifier, options = {}) {
    const { status = null } = options;
    const isWatched = status === 'WATCHED';
    const isWatchList = status === 'WATCH_LIST';
    const idLiteral = (typeof identifier === 'number') ? identifier : JSON.stringify(identifier);
    return `
        <div class="quick-actions">
            <button class="quick-action-btn quick-watch-btn ${isWatched ? 'active' : ''}" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } quickSetWatched(${idLiteral}, this); return false;" title="Mark as Watched">✓ Watched</button>
            <button class="quick-action-btn quick-watchlist-btn ${isWatchList ? 'active' : ''}" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } quickSetWatchlist(${idLiteral}, this); return false;" title="Add to Watchlist">+ Watchlist</button>
        </div>
    `;
}

function handlePosterError(imgEl, identifier) {
    try {
        const container = imgEl.closest('.movie-poster-container');
        if (!container) return;

        const placeholder = document.createElement('div');
        placeholder.className = 'poster-placeholder';
        placeholder.setAttribute('role', 'button');
        placeholder.setAttribute('tabindex', '0');
        placeholder.innerHTML = `<div class="placeholder-text">Poster unavailable</div>`;
        placeholder.addEventListener('click', () => showMovieModal(identifier));
        placeholder.addEventListener('keydown', (e) => { if (e.key === 'Enter') showMovieModal(identifier); });

        const um = userMovies.find(u => u.movieDetails?.id === identifier);
        const isFavorite = !!um?.isFavorite;
        const heartBtn = document.createElement('button');
        heartBtn.className = `favorite-heart${isFavorite ? ' active' : ''}`;
        heartBtn.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites');
        heartBtn.textContent = isFavorite ? '♥' : '♡';
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentUser) { showLoginModal(); return; }
            quickToggleFavorite(identifier, heartBtn);
        });

        const temp = document.createElement('div');
        temp.innerHTML = renderQuickActions(identifier, { status: um?.status || null });
        const quickActionsEl = temp.firstElementChild;

        container.innerHTML = '';
        container.appendChild(placeholder);
        container.appendChild(heartBtn);
        if (quickActionsEl) container.appendChild(quickActionsEl);
    } catch (err) {
        console.error('handlePosterError error', err);
    }
}

function displayMovies(movies) {
    const grid = document.getElementById('moviesGrid');

    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="loading">No movies found. Try another search!</p>';
        return;
    }

    const allowedTypes = ['MOVIE', 'SERIES', 'EPISODE'];

    grid.innerHTML = movies.map(movie => {
        const rawPoster = movie.posterUrl;
        const posterUrl = (rawPoster && String(rawPoster).trim() && String(rawPoster).toLowerCase() !== 'n/a' && String(rawPoster).toLowerCase() !== 'null') ? rawPoster : null;
        const typeLabel = allowedTypes.includes((movie.type || '').toUpperCase()) ? movie.type : '';
        const identifier = (movie.id !== undefined && movie.id !== null) ? movie.id : (`${movie.title}`.trim());

        let um = null;
        if (Array.isArray(userMovies) && movie.id !== undefined && movie.id !== null) {
            um = userMovies.find(u => u.movieDetails?.id === movie.id) || null;
        }

        const quickActionsHtml = renderQuickActions(identifier, { status: um?.status || null });
        const safeIdentifier = escapeHtml(String(identifier));
        const posterHtml = posterUrl
            ? `<img data-identifier="${safeIdentifier}" src="${posterUrl}" alt="${escapeHtml(movie.title)}" class="movie-poster"/>`
            : `<div class="poster-placeholder" data-identifier="${safeIdentifier}" role="button" tabindex="0" onclick="showMovieModal(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}); return false;"><div class="placeholder-text">Poster unavailable</div></div>`;

        const isFavorite = !!um?.isFavorite;
        const heartHtml = `
            <button class="favorite-heart ${isFavorite ? 'active' : ''}"
                    onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } quickToggleFavorite(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}, this); return false;"
                    aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '♥' : '♡'}
            </button>`;

        return `
        <div class="movie-card">
            <div class="movie-poster-container" role="button" tabindex="0"
                onclick="showMovieModal(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}); return false;"
                onkeydown="if(event.key==='Enter'){ showMovieModal(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}); event.preventDefault(); }">
                ${posterHtml}
                ${heartHtml}
                ${quickActionsHtml}
            </div>
            <div class="movie-info">
                <div class="movie-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</div>
                <div class="movie-year">${escapeHtml(movie.year || 'N/A')}</div>
                <div class="movie-rating">⭐ ${escapeHtml(movie.imdbRate || 'N/A')}</div>
                ${typeLabel ? `<span class="movie-type">${escapeHtml(typeLabel)}</span>` : ''}
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.movie-poster').forEach(img => {
        const ident = img.getAttribute('data-identifier');
        const idVal = (/^\d+$/.test(ident)) ? Number(ident) : ident;
        img.addEventListener('error', () => handlePosterError(img, idVal));
        img.addEventListener('load', () => {
            try { if (!img.naturalWidth || img.naturalWidth < 10) handlePosterError(img, idVal); }
            catch (err) { console.error('Image load check error', err); }
        });
    });
}

// ==================== Search Suggestions ====================
let suggestionsTimeout;

// Called on input event (excludes Enter key — Enter goes to searchMovies directly)
function handleSearchInput(event) {
    // Ignore if this was triggered by any non-character key somehow
    if (suppressSuggestions) return;
    handleSearch();
}

async function handleSearch() {
    if (suppressSuggestions) return;
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        document.getElementById('searchSuggestions').classList.remove('active');
        clearTimeout(suggestionsTimeout);
        loadAllMovies();
        return;
    }
    if (query.length < 2) {
        document.getElementById('searchSuggestions').classList.remove('active');
        clearTimeout(suggestionsTimeout);
        return;
    }
    if (suppressSuggestions) return;

    clearTimeout(suggestionsTimeout);
    suggestionsTimeout = setTimeout(async () => {
        if (suggestionAbortController) suggestionAbortController.abort();
        suggestionAbortController = new AbortController();

        try {
            const resp = await fetch(
                `${API_BASE_URL}${API_ENDPOINTS.suggestMovies}?q=${encodeURIComponent(query)}`,
                { signal: suggestionAbortController.signal }
            );
            if (resp.ok) {
                const suggestions = await resp.json();
                displaySearchSuggestions(suggestions);
            } else {
                document.getElementById('searchSuggestions').classList.remove('active');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            document.getElementById('searchSuggestions').classList.remove('active');
        }
    }, 300);
}

function displaySearchSuggestions(items) {
    // Never re-open the dropdown if a search was just executed
    if (suppressSuggestions) return;
    const suggestionsDiv = document.getElementById('searchSuggestions');
    if (!items || items.length === 0) {
        suggestionsDiv.classList.remove('active');
        suggestionSelectedIndex = -1;
        return;
    }
    suggestionsDiv.innerHTML = items.map((s) => `
        <div class="suggestion-item" tabindex="0" data-value="${escapeHtml(s)}">
            <div class="suggestion-text">${escapeHtml(s)}</div>
        </div>
    `).join('');

    if (suggestionSelectedIndex > 0 && suggestionSelectedIndex >= items.length) {
        suggestionSelectedIndex = items.length - 1;
    }

    suggestionsDiv.querySelectorAll('.suggestion-item').forEach((el) => {
        el.addEventListener('click', () => selectSuggestion(el.getAttribute('data-value')));
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSuggestion(el.getAttribute('data-value')); }
        });
    });

    if (suggestionSelectedIndex >= 0 && suggestionSelectedIndex < items.length) {
        const arr = Array.from(suggestionsDiv.querySelectorAll('.suggestion-item'));
        arr.forEach((it, i) => {
            it.classList.toggle('focused', i === suggestionSelectedIndex);
            if (i === suggestionSelectedIndex) it.scrollIntoView({ block: 'nearest' });
        });
    }
    suggestionsDiv.classList.add('active');
}

(function attachSearchKeyboardHandlers() {
    // Script loads at end of <body> — DOM is already ready, no need for DOMContentLoaded.
    const input = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('searchSuggestions');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        const items = Array.from(suggestionsDiv.querySelectorAll('.suggestion-item'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!items.length) return;
            suggestionSelectedIndex = Math.min(suggestionSelectedIndex + 1, items.length - 1);
            highlightSuggestion(items, suggestionSelectedIndex);

        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!items.length) return;
            suggestionSelectedIndex = Math.max(suggestionSelectedIndex - 1, -1);
            highlightSuggestion(items, suggestionSelectedIndex);

        } else if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(suggestionsTimeout);
            suppressSuggestions = true;
            suggestionsDiv.classList.remove('active');

            if (suggestionSelectedIndex >= 0 && items[suggestionSelectedIndex]) {
                // Write the highlighted suggestion into the input, then search
                input.value = items[suggestionSelectedIndex].getAttribute('data-value');
                suggestionSelectedIndex = -1;
            } else {
                suggestionSelectedIndex = -1;
            }
            searchMovies();

        } else if (e.key === 'Escape') {
            clearTimeout(suggestionsTimeout);
            suggestionsDiv.classList.remove('active');
            suggestionSelectedIndex = -1;
        }
    });

    function highlightSuggestion(items, idx) {
        items.forEach((it, i) => {
            it.classList.toggle('focused', i === idx);
            if (i === idx) it.scrollIntoView({ block: 'nearest' });
        });
    }
})();

function selectSuggestion(value) {
    document.getElementById('searchInput').value = value;
    clearTimeout(suggestionsTimeout);
    suppressSuggestions = true;
    document.getElementById('searchSuggestions').classList.remove('active');
    suggestionSelectedIndex = -1;
    searchMovies();
}

// ==================== Movie Modal ====================
async function showMovieModal(identifier) {
    showLoadingSpinner(true);
    try {
        let movie = findMovieByIdentifier(identifier);

        if (!movie && typeof identifier === 'string') {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(identifier)}`);
            if (resp.ok) {
                const results = await resp.json();
                if (Array.isArray(results) && results.length) {
                    movie = results.find(r => (r.title || '').toLowerCase() === identifier.toLowerCase()) || results[0];
                }
            }
        }

        if (!movie && (typeof identifier === 'number' || String(identifier).match(/^\d+$/))) {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(identifier)}`);
            if (resp.ok) {
                const results = await resp.json();
                if (Array.isArray(results) && results.length) {
                    movie = results.find(r => r.id === Number(identifier)) || results[0];
                }
            }
        }

        if (!movie) { showAlert('Movie not found', 'error'); return; }

        let userMovie = null;
        if (currentUser && Array.isArray(userMovies)) {
            userMovie = userMovies.find(um => um.movieDetails?.id === movie.id) || null;
        }

        displayMovieModal(movie, userMovie);
        openGenericModal('movieModal');
    } catch (err) {
        console.error('Error in showMovieModal', err);
        showAlert('Error loading movie details', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function displayMovieModal(movie, userMovie) {
    const modalContent = document.getElementById('movieModalContent');
    const genres = movie.genre ? movie.genre.split(',').map(g => g.trim()) : [];
    const rawRate = movie.imdbRate;
    const hasNumericRate = rawRate !== undefined && rawRate !== null && rawRate !== '' && !isNaN(Number(rawRate));
    const ratingText = hasNumericRate ? `${escapeHtml(rawRate)}/10` : 'N/A';

    const status = userMovie?.status || null;
    const isWatched = status === 'WATCHED';
    const isWatchList = status === 'WATCH_LIST';

    modalContent.innerHTML = `
        <div class="movie-modal-header">
            ${movie.posterUrl
            ? `<img src="${movie.posterUrl}" alt="${escapeHtml(movie.title)}" class="movie-modal-poster"/>`
            : `<div class="movie-modal-poster no-image"><div class="no-image-text">Poster unavailable</div></div>`}
            <div class="movie-modal-info">
                <h2 class="movie-modal-title">${escapeHtml(movie.title || '')}</h2>
                <div class="movie-modal-meta">
                    <span>📅 ${escapeHtml(movie.year || 'N/A')}</span>
                    <span>⏱ ${escapeHtml(movie.runtime || 'N/A')}</span>
                    <span>🎬 ${escapeHtml(movie.type || 'Unknown')}</span>
                </div>
                <div class="movie-modal-rating">⭐ IMDb: ${ratingText}</div>
                <div class="movie-modal-genre">${genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('')}</div>
                <div class="movie-modal-overview"><strong>Overview:</strong><br>${escapeHtml(movie.overview || 'No overview available')}</div>
                <div class="movie-modal-actions-area">
                    <div class="movie-modal-actions">
                        <button id="modalFavoriteBtn" class="action-btn ${userMovie?.isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } modalToggleFavorite(${movie.id})">${userMovie?.isFavorite ? '♥ Favorited' : '♡ Favorite'}</button>
                        <button id="modalWatchBtn" class="action-btn ${isWatched ? 'active' : ''}" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } modalSetStatus(${movie.id}, 'WATCHED')">✓ Watched</button>
                        <button id="modalWatchlistBtn" class="action-btn ${isWatchList ? 'active' : ''}" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } modalSetStatus(${movie.id}, 'WATCH_LIST')">+ Watchlist</button>
                        <div id="modalRateContainer">
                            <button id="modalRateBtn" class="btn-small btn-primary" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } modalStartRate(${movie.id})">${userMovie && userMovie.userRate ? `${userMovie.userRate}/10` : '★ Rate'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    const modalPosterImg = modalContent.querySelector('img.movie-modal-poster');
    if (modalPosterImg) {
        modalPosterImg.addEventListener('error', () => {
            const noImg = document.createElement('div');
            noImg.className = 'movie-modal-poster no-image';
            noImg.innerHTML = '<div class="no-image-text">Poster unavailable</div>';
            modalPosterImg.replaceWith(noImg);
        });
        modalPosterImg.addEventListener('load', () => {
            if (!modalPosterImg.naturalWidth || modalPosterImg.naturalWidth < 10) {
                const noImg = document.createElement('div');
                noImg.className = 'movie-modal-poster no-image';
                noImg.innerHTML = '<div class="no-image-text">Poster unavailable</div>';
                modalPosterImg.replaceWith(noImg);
            }
        });
    }
}

// ==================== User Movies ====================
async function loadUserMovies() {
    if (!currentUser || !currentToken) return;
    try {
        const resp = await apiFetch(API_BASE_URL + API_ENDPOINTS.userMovies, { method: 'GET' }, { auth: true });
        if (resp.ok) {
            userMovies = await resp.json();
            filterMovies(currentFilter || 'all');
        }
    } catch (err) {
        console.error('loadUserMovies error', err);
    }
}

function filterMovies(filterType) {
    currentFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${filterType}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    let filtered = userMovies;
    if (filterType === 'watched') filtered = userMovies.filter(m => m.status === 'WATCHED');
    else if (filterType === 'wantToWatch') filtered = userMovies.filter(m => m.status === 'WATCH_LIST');
    else if (filterType === 'favorites') filtered = userMovies.filter(m => m.isFavorite);

    displayUserMovies(filtered);
}

function displayUserMovies(movies) {
    const grid = document.getElementById('userMoviesGrid');
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="loading">No movies in this category</p>';
        return;
    }

    const allowedTypes = ['MOVIE', 'SERIES', 'EPISODE'];

    grid.innerHTML = movies.map(userMovie => {
        const md = userMovie.movieDetails || {};
        const rawPoster = md.posterUrl;
        const posterUrl = (rawPoster && String(rawPoster).trim() && String(rawPoster).toLowerCase() !== 'n/a' && String(rawPoster).toLowerCase() !== 'null') ? rawPoster : null;
        const typeLabel = allowedTypes.includes((md.type || '').toUpperCase()) ? md.type : '';
        const identifier = md.id;
        const status = userMovie.status || null;
        const safeIdentifier = escapeHtml(String(identifier));

        const posterHtml = posterUrl
            ? `<img data-identifier="${safeIdentifier}" src="${posterUrl}" alt="${escapeHtml(md.title || '')}" class="movie-poster"/>`
            : `<div class="poster-placeholder" data-identifier="${safeIdentifier}" role="button" tabindex="0" onclick="showMovieModal(${identifier}); return false;"><div class="placeholder-text">Poster unavailable</div></div>`;

        const isFavorite = !!userMovie.isFavorite;
        const heartHtml = `
            <button class="favorite-heart ${isFavorite ? 'active' : ''}"
                    onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } quickToggleFavorite(${identifier}, this); return false;"
                    aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '♥' : '♡'}
            </button>`;

        return `
        <div class="movie-card">
            <div class="movie-poster-container" role="button" tabindex="0"
                onclick="showMovieModal(${identifier}); return false;"
                onkeydown="if(event.key==='Enter'){ showMovieModal(${identifier}); event.preventDefault(); }">
                ${posterHtml}
                ${heartHtml}
                ${renderQuickActions(identifier, { status })}
            </div>
            <div class="movie-info">
                <div class="movie-title" title="${escapeHtml(md.title || '')}">${escapeHtml(md.title || '')}</div>
                <div class="movie-year">${escapeHtml(md.year || 'N/A')}</div>
                <div class="movie-rating">⭐ ${escapeHtml(md.imdbRate || 'N/A')}</div>
                ${typeLabel ? `<span class="movie-type">${escapeHtml(typeLabel)}</span>` : ''}
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.movie-poster').forEach(img => {
        const ident = img.getAttribute('data-identifier');
        const idVal = (/^\d+$/.test(ident)) ? Number(ident) : ident;
        img.addEventListener('error', () => handlePosterError(img, idVal));
        img.addEventListener('load', () => {
            try { if (!img.naturalWidth || img.naturalWidth < 10) handlePosterError(img, idVal); }
            catch (err) { console.error('Image load check error', err); }
        });
    });
}

// ==================== Profile ====================
function loadProfileData() {
    if (!currentUser) return;
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.textContent = currentUser.name || 'N/A';
    if (emailEl) emailEl.textContent = currentUser.email || 'N/A';

    // Ensure edit forms are collapsed when loading profile
    const nameForm = document.getElementById('editNameForm');
    const pwForm = document.getElementById('editPasswordForm');
    if (nameForm) nameForm.style.display = 'none';
    if (pwForm) pwForm.style.display = 'none';
}

// Keep for backwards compat
function loadEditProfileData() { loadProfileData(); }
function handleEditProfile(event) { event && event.preventDefault(); }
function toggleOldPasswordField() { }

// ── Error helper removed — now in api.js ─────────────────────────────────────

// ==================== Modals ====================
function showLoginModal() {
    const notice = document.getElementById('verificationNotice');
    if (notice) notice.style.display = 'none';
    openGenericModal('loginModal');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    const notice = document.getElementById('verificationNotice');
    if (notice) notice.style.display = 'none';
    modalClosed();
}

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('active');
    modalClosed();
}

window.onclick = function (event) {
    const loginModal = document.getElementById('loginModal');
    const movieModal = document.getElementById('movieModal');
    if (event.target === loginModal) closeLoginModal();
    if (event.target === movieModal) closeMovieModal();
};

// ==================== Alerts ====================
function showAlert(message, type = 'info') {
    const alertToast = document.getElementById('alertToast');
    alertToast.textContent = message;
    alertToast.className = `alert-toast show ${type}`;
    setTimeout(() => alertToast.classList.remove('show'), 3500);
}

// ==================== Loading Spinner ====================
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) spinner.classList.add('show');
    else spinner.classList.remove('show');
}

// ==================== Movie Rate ====================
async function updateMovieFavorite(identifier, isFavorite) {
    if (!currentToken) { showAlert('Please login first', 'warning'); showLoginModal(); return false; }
    const title = await resolveMovieTitle(identifier);
    if (!title) { showAlert('Movie title not found for this item', 'error'); return false; }

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.updateMovieFavorite,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, isFavorite: Boolean(isFavorite) }) },
            { auth: true }
        );
        if (resp.status === 401 || resp.status === 403) { showAlert('Please login to manage this movie', 'warning'); showLoginModal(); return false; }
        if (resp.ok) {
            await loadUserMovies();
            const btn = document.getElementById('modalFavoriteBtn');
            if (btn) { btn.classList.toggle('active', isFavorite); btn.textContent = isFavorite ? '♥ Favorited' : '♡ Favorite'; }
            return true;
        } else {
            const errMsg = await safeParseErrorMessage(resp);
            showAlert(errMsg || 'Failed to update favorite', 'error'); return false;
        }
    } catch (err) { showAlert('Error updating favorite: ' + err.message, 'error'); return false; }
}

async function updateMovieStatus(identifier, status) {
    if (!currentToken) { showAlert('Please login first', 'warning'); showLoginModal(); return false; }
    const title = await resolveMovieTitle(identifier);
    if (!title) { showAlert('Movie title not found for this item', 'error'); return false; }

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.updateMovieStatus,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, status }) },
            { auth: true }
        );
        if (resp.status === 401 || resp.status === 403) { showAlert('Please login to manage this movie', 'warning'); showLoginModal(); return false; }
        if (resp.ok) {
            await loadUserMovies();
            if (status) {
                const label = status === 'WATCHED' ? 'Watched' : status === 'WATCH_LIST' ? 'Watchlist' : null;
                if (label) showAlert(`Movie added to ${label}`, 'success');
            }
            return true;
        } else {
            let errMsg = ''; try { errMsg = await resp.json(); errMsg = errMsg.message || JSON.stringify(errMsg); } catch (e) { errMsg = await resp.text(); }
            showAlert(errMsg || 'Failed to update status', 'error'); return false;
        }
    } catch (err) { showAlert('Error updating status: ' + err.message, 'error'); return false; }
}

async function updateMovieRate(identifier, rate) {
    if (!currentToken) { showAlert('Please login first', 'warning'); showLoginModal(); return false; }
    const title = await resolveMovieTitle(identifier);
    if (!title) { showAlert('Movie title not found for this item', 'error'); return false; }

    const numeric = Number(rate);
    if (isNaN(numeric) || numeric < 0 || numeric > 10) { showAlert('Rate must be between 0 and 10', 'warning'); return false; }

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.updateMovieRate,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, rate: numeric }) },
            { auth: true }
        );
        if (resp.status === 401 || resp.status === 403) { showAlert('Please login to manage this movie', 'warning'); showLoginModal(); return false; }
        if (resp.ok) {
            await loadUserMovies();
            const input = document.getElementById('modalRateInput');
            if (input) {
                const btn = document.createElement('button');
                btn.id = 'modalRateBtn'; btn.className = 'btn-small btn-primary';
                btn.textContent = `${numeric}/10`;
                btn.onclick = () => modalStartRate(identifier);
                input.parentElement.replaceChild(btn, input);
            }
            return true;
        } else {
            let errMsg = ''; try { errMsg = await resp.json(); errMsg = errMsg.message || JSON.stringify(errMsg); } catch (e) { errMsg = await resp.text(); }
            showAlert(errMsg || 'Failed to update rate', 'error'); return false;
        }
    } catch (err) { showAlert('Error updating rate: ' + err.message, 'error'); return false; }
}

// ==================== Modal Actions ====================
async function modalToggleFavorite(movieId) {
    const btn = document.getElementById('modalFavoriteBtn');
    const isFav = btn && btn.classList.contains('active');
    await updateMovieFavorite(movieId, !isFav);
}

async function modalSetStatus(movieId, status) {
    const um = userMovies.find(u => u.movieDetails?.id === movieId);
    const desiredStatus = um?.status === status ? null : status;
    const ok = await updateMovieStatus(movieId, desiredStatus);
    if (ok) {
        const watchBtn = document.getElementById('modalWatchBtn');
        const watchlistBtn = document.getElementById('modalWatchlistBtn');
        if (watchBtn && watchlistBtn) {
            if (desiredStatus === 'WATCHED') { watchBtn.classList.add('active'); watchlistBtn.classList.remove('active'); }
            else if (desiredStatus === 'WATCH_LIST') { watchlistBtn.classList.add('active'); watchBtn.classList.remove('active'); }
            else { watchBtn.classList.remove('active'); watchlistBtn.classList.remove('active'); }
        }
        const latestUm = userMovies.find(u => u.movieDetails?.id === movieId);
        const rateBtn = document.getElementById('modalRateBtn');
        if (rateBtn) rateBtn.textContent = (!latestUm || !latestUm.userRate) ? '★ Rate' : `${latestUm.userRate}/10`;
    }
}

function modalStartRate(movieId) {
    const parent = document.getElementById('modalRateContainer');
    if (!parent) return;
    const input = document.createElement('input');
    input.type = 'number'; input.step = '0.5'; input.min = '0'; input.max = '10';
    input.id = 'modalRateInput'; input.className = 'rating-input';
    input.placeholder = '0-10'; input.style.width = '90px';

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.value.trim();
            if (!val) { modalCancelRate(movieId); return; }
            await updateMovieRate(movieId, val);
        } else if (e.key === 'Escape') {
            modalCancelRate(movieId);
        }
    });
    input.addEventListener('blur', () => {
        setTimeout(() => { const el = document.getElementById('modalRateInput'); if (el && !el.value.trim()) modalCancelRate(movieId); }, 150);
    });

    const btn = document.getElementById('modalRateBtn');
    if (btn && parent) parent.replaceChild(input, btn);
    input.focus();
    setTimeout(() => input.classList.add('show'), 20);
}

function modalCancelRate(movieId) {
    const parent = document.getElementById('modalRateContainer');
    if (!parent) return;
    const existingInput = document.getElementById('modalRateInput');
    const um = userMovies.find(u => u.movieDetails?.id === movieId);
    let display = '★ Rate';
    if (um && um.userRate) display = `${um.userRate}/10`;
    const btn = document.createElement('button');
    btn.id = 'modalRateBtn'; btn.className = 'btn-small btn-primary';
    btn.textContent = display; btn.onclick = () => modalStartRate(movieId);
    if (existingInput) parent.replaceChild(btn, existingInput);
}

// ── Scroll lock logic removed — now in modal.js ─────────────────────────────

// ==================== Register/Login Toggle ====================
function toggleRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const notice = document.getElementById('verificationNotice');
    if (!loginForm || !registerForm) return;

    if (notice) notice.style.display = 'none';

    if (registerForm.style.display === 'block') {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('loginEmail')?.focus();
    } else {
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        document.getElementById('registerName')?.focus();
    }
}
