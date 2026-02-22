// ==================== API Configuration ====================
const API_BASE_URL = 'http://localhost:8080';
const API_ENDPOINTS = {
    // Auth endpoints
    login: '/auth/login',
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
let suggestionSelectedIndex = -1; // index for keyboard navigation of suggestions

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadAllMovies();

    // initial active nav
    setActiveNav('home');

    // close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        const suggestions = document.getElementById('searchSuggestions');
        const box = document.querySelector('.search-box');
        if (!box.contains(e.target)) {
            suggestions.classList.remove('active');
            suggestionSelectedIndex = -1;
        }
    });
});

// ==================== Authentication ====================
function checkAuthStatus() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        currentToken = token;
        fetchCurrentUser();
    } else {
        updateAuthUI(false);
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.me, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            updateAuthUI(true);
            await loadUserMovies();
            // show signed-in state in nav
            const authNav = document.getElementById('authNav');
            const userNav = document.getElementById('userNav');
            if (authNav) authNav.style.display = 'none';
            if (userNav) userNav.style.display = 'flex';
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

// Update handleLogin to accept backend token field 'token' or 'accessToken'
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoadingSpinner(true);

    try {
        const loginUrl = API_BASE_URL + API_ENDPOINTS.login;
        console.log('Logging in to:', loginUrl);

        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const responseData = await response.json();

        // backend may return { token: '...' } or { accessToken: '...' }
        const token = responseData.accessToken || responseData.token || responseData.token?.accessToken;

        if (response.ok && token) {
            localStorage.setItem('accessToken', token);
            currentToken = token;

            // After login, fetch /auth/me to get user details
            await fetchCurrentUser();

            closeLoginModal();
            showAlert('Logged in successfully', 'success');
        } else {
            showAlert(responseData.message || `Login failed: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed: ' + error.message, 'error');
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        if (response.status === 201 || response.status === 200) {
            showAlert('Registration successful! Please login.', 'success');
            toggleRegisterForm();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showAlert('Registration failed. Please try again.', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function confirmLogout() {
    document.getElementById('logoutConfirmModal').classList.add('active');
}

function logout() {
    document.getElementById('logoutConfirmModal').classList.remove('active');
    localStorage.removeItem('accessToken');
    currentToken = null;
    currentUser = null;
    userMovies = [];
    updateAuthUI(false);
    showHome();
    showAlert('Logged out successfully', 'success');
}

function confirmDeleteAccount() {
    document.getElementById('deleteConfirmModal').classList.add('active');
    document.getElementById('deleteConfirmText').value = '';
    document.getElementById('deleteConfirmText').focus();
}

async function confirmDeleteAccountSubmit() {
    const confirmText = document.getElementById('deleteConfirmText').value.trim();

    if (confirmText !== 'delete') {
        showAlert('Please type "delete" to confirm', 'warning');
        return;
    }

    showLoadingSpinner(true);

    try {
        const resp = await fetch(
            API_BASE_URL + API_ENDPOINTS.deleteUser(currentUser.id),
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                }
            }
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
    const myMoviesSection = document.getElementById('myMoviesSection');

    if (isAuthenticated && currentUser) {
        authNav.style.display = 'none';
        userNav.style.display = 'flex';
        myMoviesSection.style.display = 'block';

        const greetingName = currentUser.name || currentUser.username || currentUser.email || 'User';
        const greeting = `Welcome, ${greetingName}`;
        document.getElementById('userGreeting').textContent = greeting;
    } else {
        authNav.style.display = 'block';
        userNav.style.display = 'none';
        myMoviesSection.style.display = 'none';
    }
}

// ==================== Section Navigation ====================
// ==================== Navigation ====================
function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => link.classList.remove('active-nav'));
}

function setActiveNav(selector) {
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active-nav'));
    const activeLink = document.querySelector(`.nav-menu a[data-nav="${selector}"]`);
    if (activeLink) activeLink.classList.add('active-nav');
}

function showHome() {
    hideAllSections();
    document.getElementById('homeSection').classList.add('active');
    setActiveNav('home');
}

function showMovies() {
    hideAllSections();
    document.getElementById('moviesSection').classList.add('active');
    setActiveNav('movies');
    if (allMovies.length === 0) {
        loadAllMovies();
    }
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
    loadUserMovies();
}

function showEditProfile() {
    hideAllSections();
    document.getElementById('editProfileSection').classList.add('active');
    loadEditProfileData();
}


// ==================== Quick Actions on Movie Cards ====================
async function quickToggleFavorite(movieId, button) {
    if (!currentUser) {
        showAlert('Please login first', 'warning');
        showLoginModal();
        return;
    }

    const userMovie = userMovies.find(um => um.movieDetails.id === movieId);
    const isFavorite = userMovie?.isFavorite || false;

    await updateMovieFavorite(movieId, !isFavorite);

    // Update button state
    if (button) {
        button.classList.toggle('active');
    }
}

async function quickSetWatched(movieId, button) {
    if (!currentUser) {
        showAlert('Please login first', 'warning');
        showLoginModal();
        return;
    }

    await updateMovieStatus(movieId, 'WATCHED');

    // Update button state
    if (button) {
        button.classList.add('active');
        const watchlistBtn = button.parentElement.querySelector('.quick-watchlist-btn');
        if (watchlistBtn) watchlistBtn.classList.remove('active');
    }
}

async function quickSetWatchlist(movieId, button) {
    if (!currentUser) {
        showAlert('Please login first', 'warning');
        showLoginModal();
        return;
    }

    await updateMovieStatus(movieId, 'WANT_TO_WATCH');

    // Update button state
    if (button) {
        button.classList.add('active');
        const watchedBtn = button.parentElement.querySelector('.quick-watch-btn');
        if (watchedBtn) watchedBtn.classList.remove('active');
    }
}

// ==================== Movies ====================
async function loadAllMovies() {
    showLoadingSpinner(true);
    try {
        console.log('Loading movies from:', API_BASE_URL + API_ENDPOINTS.movies);
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.movies);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (response.ok) {
            const data = await response.json();
            console.log('Movies loaded:', data);
            allMovies = data;
            displayMovies(allMovies);
        } else {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            showAlert(`Failed to load movies (${response.status})`, 'error');
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showAlert('Error loading movies: ' + error.message, 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

async function searchMovies() {
    const query = document.getElementById('searchInput').value.trim();

    // if cleared, load all
    if (!query) {
        loadAllMovies();
        return;
    }

    showLoadingSpinner(true);
    try {
        const searchUrl = `${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(query)}`;
        console.log('Searching movies at:', searchUrl);

        const response = await fetch(searchUrl);
        console.log('Search response status:', response.status);

        if (response.ok) {
            const movies = await response.json();
            console.log('Search results:', movies);
            allMovies = movies; // update allMovies so showMovieModal can find it
            displayMovies(movies);
            document.getElementById('searchSuggestions').classList.remove('active');
        } else if (response.status === 404) {
            displayMovies([]);
            showAlert('No movies found for your search', 'info');
        } else {
            const errorText = await response.text();
            console.error('Search error response:', response.status, errorText);
            showAlert(`Search failed: ${response.status}`, 'error');
            displayMovies([]);
        }
    } catch (error) {
        console.error('Search error:', error);
        showAlert('Search failed: ' + error.message, 'error');
        displayMovies([]);
    } finally {
        showLoadingSpinner(false);
    }
}

// safe escape helper
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper: find a movie object by id or title
function findMovieByIdentifier(identifier) {
    if (!identifier && identifier !== 0) return null;

    // numeric id
    if (typeof identifier === 'number' || String(identifier).match(/^\d+$/)) {
        const idNum = Number(identifier);
        return allMovies.find(m => m.id === idNum) || null;
    }

    // title string - search in allMovies by title (case-insensitive)
    const title = String(identifier).trim().toLowerCase();
    const found = allMovies.find(m => (m.title || '').toLowerCase() === title);
    if (found) return found;

    // fallback: check userMovies
    const um = userMovies.find(u => (u.movieDetails && (u.movieDetails.title || '').toLowerCase() === title));
    if (um && um.movieDetails) return um.movieDetails;

    return null;
}

function displayMovies(movies) {
    const grid = document.getElementById('moviesGrid');

    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="loading">No movies found. Try another search!</p>';
        return;
    }

    const allowedTypes = ['MOVIE', 'SERIES', 'EPISODE']; // keep only known enum values

    const movieHTML = movies.map(movie => {
        const rawPoster = movie.posterUrl;
        const posterUrl = (rawPoster && String(rawPoster).trim() && String(rawPoster).toLowerCase() !== 'n/a' && String(rawPoster).toLowerCase() !== 'null') ? rawPoster : null;
        const typeLabel = allowedTypes.includes((movie.type || '').toUpperCase()) ? movie.type : '';
        const posterHtml = posterUrl
            ? `<img src="${posterUrl}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22%3E%3Crect fill=%22%23eef2ff%22 width=%22200%22 height=%22280%22/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2716%27 fill=%22636b6f%27 text-anchor=%27middle%27 dy=%27.3em%27%3EFY%3C/text%3E%3C/svg%3E'/>`
            : `<div class="movie-poster no-image-placeholder"><div class="fy-badge">FY</div></div>`;

        // identify to pass: prefer id if present, otherwise title
        const identifier = (movie.id !== undefined && movie.id !== null) ? movie.id : (`${movie.title}`.trim());

        // Always show quick actions, but if not logged in, clicking them triggers login modal
        const quickActionsHtml = `
                <div class="quick-actions">
                    <button class="quick-action-btn quick-fav-btn" onclick="event.stopPropagation(); if (typeof currentUser === 'undefined' || !currentUser) { showLoginModal(); return false; } quickToggleFavorite(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}, this); return false;" title="Add to Favorites">♥</button>
                    <button class="quick-action-btn quick-watch-btn" onclick="event.stopPropagation(); if (typeof currentUser === 'undefined' || !currentUser) { showLoginModal(); return false; } quickSetWatched(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}, this); return false;" title="Mark as Watched">✓</button>
                    <button class="quick-action-btn quick-watchlist-btn" onclick="event.stopPropagation(); if (typeof currentUser === 'undefined' || !currentUser) { showLoginModal(); return false; } quickSetWatchlist(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}, this); return false;" title="Add to Watchlist">+</button>
                </div>
            `;

        return `
        <div class="movie-card">
            <div class="movie-poster-container" role="button" tabindex="0" onclick="showMovieModal(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier) }); return false;" onkeydown="if(event.key==='Enter'){ showMovieModal(${typeof identifier === 'number' ? identifier : JSON.stringify(identifier)}); event.preventDefault(); }">
                ${posterHtml}
                ${quickActionsHtml}
            </div>
            <div class="movie-info">
                <div class="movie-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</div>
                <div class="movie-year">${escapeHtml(movie.year || 'N/A')}</div>
                <div class="movie-rating">Rating: ${escapeHtml(movie.imdbRate || 'N/A')}</div>
                ${typeLabel ? `<span class="movie-type">${escapeHtml(typeLabel)}</span>` : ''}
            </div>
        </div>
    `;
    }).join('');

    grid.innerHTML = movieHTML;
}

// ==================== Search Suggestions (called by input onkeyup) ====
let suggestionsTimeout; // debounce timer

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();

    // if cleared, load all movies
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

    // Clear previous timeout
    clearTimeout(suggestionsTimeout);

    // Debounce API call - wait 600ms after user stops typing
    suggestionsTimeout = setTimeout(async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.suggestMovies}?q=${encodeURIComponent(query)}`);
            if (resp.ok) {
                const suggestions = await resp.json();
                displaySearchSuggestions(suggestions);
            } else {
                document.getElementById('searchSuggestions').classList.remove('active');
            }
        } catch (err) {
            console.error('Suggestions error:', err);
            document.getElementById('searchSuggestions').classList.remove('active');
        }
    }, 600); // wait 600ms before calling API
}

function displaySearchSuggestions(items) {
    const suggestionsDiv = document.getElementById('searchSuggestions');
    if (!items || items.length === 0) {
        suggestionsDiv.classList.remove('active');
        suggestionSelectedIndex = -1;
        return;
    }

    suggestionsDiv.innerHTML = items.map(s => `
        <div class="suggestion-item" tabindex="0" data-value="${escapeHtml(s)}">
            <div class="suggestion-text">${escapeHtml(s)}</div>
        </div>
    `).join('');

    // IMPORTANT: Preserve the suggestion selection index if user was navigating
    // Only clamp it if it's beyond the new list length
    if (suggestionSelectedIndex > 0 && suggestionSelectedIndex >= items.length) {
        suggestionSelectedIndex = items.length - 1;
    }
    // If suggestionSelectedIndex is still -1 (user wasn't navigating), keep it at -1

    // attach listeners
    suggestionsDiv.querySelectorAll('.suggestion-item').forEach((el, idx) => {
        el.addEventListener('click', () => {
            const v = el.getAttribute('data-value');
            selectSuggestion(v);
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectSuggestion(el.getAttribute('data-value'));
            }
        });
    });

    // re-apply focus highlight if user was navigating
    if (suggestionSelectedIndex >= 0 && suggestionSelectedIndex < items.length) {
        const items_arr = Array.from(suggestionsDiv.querySelectorAll('.suggestion-item'));
        items_arr.forEach((it, i) => {
            it.classList.toggle('focused', i === suggestionSelectedIndex);
            if (i === suggestionSelectedIndex) {
                it.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    suggestionsDiv.classList.add('active');
}

// Enhanced keyboard navigation for suggestions
(function attachSearchKeyboardHandlers(){
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
            if (suggestionSelectedIndex >= 0 && items[suggestionSelectedIndex]) {
                const v = items[suggestionSelectedIndex].getAttribute('data-value');
                selectSuggestion(v);
                suggestionSelectedIndex = -1;
            } else {
                searchMovies();
            }
            suggestionsDiv.classList.remove('active');
        } else if (e.key === 'Escape') {
            suggestionsDiv.classList.remove('active');
            suggestionSelectedIndex = -1;
        }
    });

    function highlightSuggestion(items, idx) {
        items.forEach((it, i) => {
            if (i === idx) {
                it.classList.add('focused');
                it.scrollIntoView({ block: 'nearest' });
            } else {
                it.classList.remove('focused');
            }
        });
    }
})();

// Fix selectSuggestion to populate search box and trigger search
function selectSuggestion(value) {
    document.getElementById('searchInput').value = value;
    document.getElementById('searchSuggestions').classList.remove('active');
    suggestionSelectedIndex = -1;
    searchMovies(); // trigger search immediately
}

// ==================== Movie Modal / Details ====================
async function showMovieModal(identifier) {
    showLoadingSpinner(true);
    try {
        // if identifier is an object or a movie, normalize
        let movie = null;

        // try to find locally first
        movie = findMovieByIdentifier(identifier);

        // if identifier is a title string and not found, try search endpoint by title
        if (!movie && identifier && typeof identifier === 'string') {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(identifier)}`);
            if (resp.ok) {
                const results = await resp.json();
                if (Array.isArray(results) && results.length) {
                    // pick exact title match or first
                    movie = results.find(r => ((r.title||'').toLowerCase() === identifier.toLowerCase())) || results[0];
                }
            }
        }

        // if identifier is numeric and not found, try searching by id as query (some backends might return)
        if (!movie && (typeof identifier === 'number' || String(identifier).match(/^\d+$/))) {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(identifier)}`);
            if (resp.ok) {
                const results = await resp.json();
                if (Array.isArray(results) && results.length) {
                    movie = results.find(r => r.id === Number(identifier)) || results[0];
                }
            }
        }

        if (!movie) {
            showAlert('Movie not found', 'error');
            return;
        }

        let userMovie = null;
        if (currentUser && Array.isArray(userMovies)) {
            userMovie = userMovies.find(um => um.movieDetails && um.movieDetails.id === movie.id) || null;
        }

        displayMovieModal(movie, userMovie);
        document.getElementById('movieModal').classList.add('active');
    } catch (err) {
        console.error('Error in showMovieModal', err);
        showAlert('Error loading movie details', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function displayMovieModal(movie, userMovie) {
    const modalContent = document.getElementById('movieModalContent');
    // prepare genres
    const genres = movie.genre ? movie.genre.split(',').map(g => g.trim()) : [];

    // user controls
    let controlsHtml = '';
    if (currentUser) {
        const status = userMovie?.status || 'WANT_TO_WATCH';
        const rating = userMovie?.userRate ?? 0;
        const isFav = !!userMovie?.isFavorite;

        const ratingOptions = [0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10]
            .map(r => `<option value="${r}" ${Number(r) === Number(rating) ? 'selected' : ''}>${r}</option>`)
            .join('');

        controlsHtml = `
            <div class="movie-modal-actions">
                <select id="modalStatus" class="status-selector" onchange="updateMovieStatus(${movie.id}, this.value)">
                    <option value="WANT_TO_WATCH" ${status === 'WANT_TO_WATCH' ? 'selected' : ''}>Want to Watch</option>
                    <option value="WATCHING" ${status === 'WATCHING' ? 'selected' : ''}>Watching</option>
                    <option value="WATCHED" ${status === 'WATCHED' ? 'selected' : ''}>Watched</option>
                </select>
                <select id="modalRating" class="rating-input" onchange="updateMovieRate(${movie.id}, this.value)">
                    ${ratingOptions}
                </select>
                <button id="modalFavoriteBtn" class="favorite-btn ${isFav ? 'active' : ''}" onclick="updateMovieFavorite(${movie.id}, ${!isFav})">${isFav ? 'Remove from Favorites' : 'Add to Favorites'}</button>
            </div>
        `;
    } else {
        controlsHtml = `<p style="color: var(--text-light);">Please sign in to manage this movie.</p>`;
    }

    const posterHtml = movie.posterUrl
        ? `<img src="${movie.posterUrl}" alt="${escapeHtml(movie.title)}" class="movie-modal-poster" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22220%22 height=%22330%22%3E%3Crect fill=%22%23eef2ff%22 width=%22220%22 height=%22330%22/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2224%27 fill=%22636b6f%27 text-anchor=%27middle%27 dy=%27.3em%27%3EFY%3C/text%3E%3C/svg%3E'/>`
        : `<div class="movie-modal-poster no-image"><div class="no-image-text">FY</div></div>`;

    // Build modal HTML (exclude id and imdbId as requested)
    modalContent.innerHTML = `
        <div class="movie-modal-header">
            ${posterHtml}
            <div class="movie-modal-info">
                <h2 class="movie-modal-title">${escapeHtml(movie.title || '')}</h2>
                <div class="movie-modal-meta">
                    <span>Year: ${escapeHtml(movie.year || 'N/A')}</span>
                    <span>Runtime: ${escapeHtml(movie.runtime || 'N/A')}</span>
                    <span>Type: ${escapeHtml(movie.type || 'Unknown')}</span>
                </div>
                <div class="movie-modal-rating">IMDb Rating: ${escapeHtml(movie.imdbRate || 'N/A')}/10</div>
                <div class="movie-modal-genre">${genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('')}</div>
                <div class="movie-modal-overview"><strong>Overview:</strong><br>${escapeHtml(movie.overview || 'No overview available')}</div>
                ${controlsHtml}
            </div>
        </div>
    `;
}

// ==================== User Movies / Updates ====================
async function loadUserMovies() {
    if (!currentUser || !currentToken) return;

    try {
        const resp = await fetch(API_BASE_URL + API_ENDPOINTS.userMovies, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (resp.ok) {
            userMovies = await resp.json();
            filterMovies(currentFilter || 'all');
        } else {
            console.warn('Failed to load user movies', resp.status);
        }
    } catch (err) {
        console.error('loadUserMovies error', err);
    }
}

// ==================== User Movies / Filter ====================
function filterMovies(filterType) {
    currentFilter = filterType;
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    // set active button by data-filter
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${filterType}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    let filteredMovies = userMovies;

    switch(filterType) {
        case 'watched':
            filteredMovies = userMovies.filter(m => m.status === 'WATCHED');
            break;
        case 'watching':
            filteredMovies = userMovies.filter(m => m.status === 'WATCHING');
            break;
        case 'wantToWatch':
            filteredMovies = userMovies.filter(m => m.status === 'WANT_TO_WATCH');
            break;
        case 'favorites':
            filteredMovies = userMovies.filter(m => m.isFavorite);
            break;
    }

    displayUserMovies(filteredMovies);
}

function displayUserMovies(movies) {
    const grid = document.getElementById('userMoviesGrid');

    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="loading">No movies in this category</p>';
        return;
    }

    grid.innerHTML = movies.map(userMovie => {
        const md = userMovie.movieDetails || {};
        const poster = md.posterUrl || null;
        const posterSrc = poster ? poster : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect fill=%22%23eef2ff%22 width=%22150%22 height=%22220%22/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2714%27 fill=%22636b6f%27 text-anchor=%27middle%27 dy=%27.3em%27%3EFY%3C/text%3E%3C/svg%3E';

        // rating input replaced with select of half stars
        const ratingSelect = `<select onchange="updateMovieRate(${md.id}, this.value)">
                                ${[0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10].map(r => `<option value="${r}" ${userMovie.userRate==r? 'selected':''}>${r}</option>`).join('')}
                              </select>`;

        return `
        <div class="user-movie-card">
            <div class="user-movie-header">
                <img src="${posterSrc}"
                     alt="${escapeHtml(md.title || '')}"
                     class="user-movie-poster"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect fill=%22%23eef2ff%22 width=%22150%22 height=%22220%22/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2714%27 fill=%22636b6f%27 text-anchor=%27middle%27 dy=%27.3em%27%3EFY%3C/text%3E%3C/svg%3E'"
                     onclick="showMovieModal(${md.id})">
                <div class="user-movie-info">
                    <div class="user-movie-title" onclick="showMovieModal(${md.id})">${escapeHtml(md.title || '')}</div>
                    <div class="user-movie-meta">
                        <span>Year: ${escapeHtml(md.year || 'N/A')}</span>
                        <span>Rating: ${escapeHtml(md.imdbRate || 'N/A')}/10</span>
                    </div>
                    <div class="user-movie-controls">
                        <select class="status-selector" onchange="updateMovieStatus(${md.id}, this.value)">
                            <option value="WANT_TO_WATCH" ${userMovie.status === 'WANT_TO_WATCH' ? 'selected' : ''}>Want to Watch</option>
                            <option value="WATCHING" ${userMovie.status === 'WATCHING' ? 'selected' : ''}>Watching</option>
                            <option value="WATCHED" ${userMovie.status === 'WATCHED' ? 'selected' : ''}>Watched</option>
                        </select>
                        ${ratingSelect}
                        <button class="favorite-btn ${userMovie.isFavorite ? 'active' : ''}"
                                onclick="updateMovieFavorite(${md.id}, ${userMovie.isFavorite ? 'false' : 'true'})">${userMovie.isFavorite ? 'Remove Favorite' : 'Add Favorite'}</button>
                    </div>
                </div>
            </div>
            <div class="user-movie-genre">
                ${(md.genre || '').split(',').map(g => `<span class="genre-tag">${escapeHtml(g.trim())}</span>`).join('')}
            </div>
            <div class="user-movie-overview">
                ${escapeHtml(md.overview || 'No overview available')}
            </div>
        </div>
    `;
    }).join('');
}

// ==================== Profile ====================
function loadProfileData() {
    if (!currentUser) return;

    document.getElementById('profileName').textContent = currentUser.name || 'N/A';
    document.getElementById('profileEmail').textContent = currentUser.email || 'N/A';
    document.getElementById('profileRole').textContent = currentUser.role || 'USER';
}

function loadEditProfileData() {
    if (!currentUser) return;

    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
}

async function handleEditProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        showAlert('Please login first', 'warning');
        return;
    }

    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const password = document.getElementById('editPassword').value.trim();

    if (!name || !email) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }

    showLoadingSpinner(true);

    try {
        // Update name
        if (name !== currentUser.name) {
            const nameResponse = await fetch(
                API_BASE_URL + API_ENDPOINTS.changeUserName(currentUser.id),
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`,
                    },
                    body: JSON.stringify({ name: name })
                }
            );

            if (!nameResponse.ok) {
                showAlert('Failed to update name', 'error');
                return;
            }
        }

        // Update email
        if (email !== currentUser.email) {
            const emailResponse = await fetch(
                API_BASE_URL + API_ENDPOINTS.changeUserEmail(currentUser.id),
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`,
                    },
                    body: JSON.stringify({ email: email })
                }
            );

            if (!emailResponse.ok) {
                showAlert('Failed to update email', 'error');
                return;
            }
        }

        // Update password if provided
        if (password) {
            const passwordResponse = await fetch(
                API_BASE_URL + API_ENDPOINTS.changeUserPassword(currentUser.id),
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`,
                    },
                    body: JSON.stringify({ password: password })
                }
            );

            if (!passwordResponse.ok) {
                showAlert('Failed to update password', 'error');
                return;
            }
        }

        currentUser.name = name;
        currentUser.email = email;
        updateAuthUI(true);
        showAlert('Profile updated successfully', 'success');
        showProfile();
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// ==================== Modals ====================
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('active');
}

function toggleRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const movieModal = document.getElementById('movieModal');

    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === movieModal) {
        closeMovieModal();
    }
}

// ==================== Alerts ====================
function showAlert(message, type = 'info') {
    const alertToast = document.getElementById('alertToast');
    alertToast.textContent = message;
    alertToast.className = `alert-toast show ${type}`;

    setTimeout(() => {
        alertToast.classList.remove('show');
    }, 3000);
}

// ==================== Loading Spinner ====================
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('show');
    } else {
        spinner.classList.remove('show');
    }
}

// small responsive tweak: ensure search suggestions width follows container resizing
window.addEventListener('resize', () => {
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) {
        // nothing needed here because CSS uses width:100% of parent, but we keep for future tweaks
    }
});

