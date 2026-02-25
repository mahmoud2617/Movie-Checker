// ── Utilities removed — now centralized ─────────────────────────────────────

// ==================== Movies: Load & Search ====================

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

// ==================== Search Suggestions ====================
let suggestionsTimeout;

// Called on input event
function handleSearchInput(event) {
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
    // Script loads at end of <body> — DOM is already ready
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

// ==================== Display: Browse Grid ====================

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

// ==================== Display: My Collection Grid ====================

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

// ==================== Movie Rate / Favorite / Status (API calls) ====================

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
            const errMsg = await safeParseErrorMessage(resp);
            showAlert(errMsg || 'Failed to update status', 'error'); return false;
        }
    } catch (err) { showAlert('Error updating status: ' + err.message, 'error'); return false; }
}

async function updateMovieRate(identifier, rate) {
    if (!currentToken) { showAlert('Please login first', 'warning'); showLoginModal(); return false; }
    const title = await resolveMovieTitle(identifier);
    if (!title) { showAlert('Movie title not found for this item', 'error'); return false; }

    // Truncate to 1 decimal place before sending and displaying (e.g. 4.22 → 4.2, 2 → 2.0)
    const numeric = parseFloat(Number(rate).toFixed(1));
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
                btn.textContent = `${numeric.toFixed(1)}/10`;
                btn.onclick = () => modalStartRate(identifier);
                input.parentElement.replaceChild(btn, input);
            }
            return true;
        } else {
            const errMsg = await safeParseErrorMessage(resp);
            showAlert(errMsg || 'Failed to update rate', 'error'); return false;
        }
    } catch (err) { showAlert('Error updating rate: ' + err.message, 'error'); return false; }
}
