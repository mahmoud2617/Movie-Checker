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
            // First try to resolve from userMovies (needed on collection page where allMovies is empty)
            const umMatch = Array.isArray(userMovies) && userMovies.find(u => u.movieDetails?.id === Number(identifier));
            if (umMatch?.movieDetails) {
                movie = umMatch.movieDetails;
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
        document.getElementById('movieModal').classList.add('active');
        modalOpened('movieModal');
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
                            <button id="modalRateBtn" class="btn-small btn-primary" onclick="event.stopPropagation(); if (!currentUser) { showLoginModal(); return false; } modalStartRate(${movie.id})">${userMovie && userMovie.userRate != null ? `${Number(userMovie.userRate).toFixed(1)}/10` : '★ Rate'}</button>
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
        if (rateBtn) rateBtn.textContent = (!latestUm || latestUm.userRate == null) ? '★ Rate' : `${Number(latestUm.userRate).toFixed(1)}/10`;
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
    if (um && um.userRate != null) display = `${Number(um.userRate).toFixed(1)}/10`;
    const btn = document.createElement('button');
    btn.id = 'modalRateBtn'; btn.className = 'btn-small btn-primary';
    btn.textContent = display; btn.onclick = () => modalStartRate(movieId);
    if (existingInput) parent.replaceChild(btn, existingInput);
}

// ==================== Login Modal ====================

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    const notice = document.getElementById('verificationNotice');
    if (notice) notice.style.display = 'none';
    modalOpened('loginModal');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');

    // Reset form values
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();

    // Always restore to login form view, hide all other panels
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';

    const notice = document.getElementById('verificationNotice');
    if (notice) notice.style.display = 'none';

    modalClosed('loginModal');
}

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('active');
    modalClosed('movieModal');
}

function openGenericModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('active');
        modalOpened(modalId);
    }
}

function closeGenericModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('active');
        modalClosed(modalId);
    }
}

// Close modal when clicking the backdrop
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        const id = event.target.id;
        if (id === 'loginModal') closeLoginModal();
        else if (id === 'movieModal') closeMovieModal();
        else closeGenericModal(id);
    }
};

// ==================== Modal Scroll Lock ====================
// We lock the *body* scroll when a modal is open so the background doesn't scroll.
// We use a Set to track active modals to be idempotent and prevent state desync.
const _activeModals = new Set();

function modalOpened(modalId) {
    if (!modalId) return;
    _activeModals.add(modalId);

    if (_activeModals.size === 1) {
        // Calculate scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
    }
}

function modalClosed(modalId) {
    if (!modalId) return;
    _activeModals.delete(modalId);

    if (_activeModals.size === 0) {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
    }
}

// ==================== Alerts ====================
let alertTimeout;

function showAlert(message, type = 'info') {
    const alertToast = document.getElementById('alertToast');
    if (!alertToast) return;

    if (alertTimeout) clearTimeout(alertTimeout);

    alertToast.textContent = message;
    alertToast.className = `alert-toast show ${type}`;
    alertTimeout = setTimeout(() => alertToast.classList.remove('show'), 3500);
}

// ==================== Loading Spinner ====================

function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) spinner.classList.add('show');
    else spinner.classList.remove('show');
}
