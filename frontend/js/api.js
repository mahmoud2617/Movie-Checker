// ==================== Token Helpers ====================

/**
 * Decode a JWT and return the expiry timestamp in ms, or null if unparseable.
 */
function getTokenExpiry(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null; // convert to ms
    } catch { return null; }
}

/**
 * Returns true when the token is already expired or will expire within bufferMs.
 * If the expiry cannot be determined we assume the token is still valid.
 */
function isTokenExpiredOrExpiringSoon(token, bufferMs = 30000) {
    const exp = getTokenExpiry(token);
    if (!exp) return false; // can't parse, assume ok
    return Date.now() >= exp - bufferMs;
}

/**
 * Call POST /auth/refresh (refresh token is sent automatically via httpOnly cookie).
 * Stores the new access token in localStorage and in currentToken.
 * Returns the new token string on success, or null on failure.
 */
async function refreshAccessToken() {
    try {
        const resp = await fetch(API_BASE_URL + API_ENDPOINTS.refresh, {
            method: 'POST',
            credentials: 'include', // send the refreshToken httpOnly cookie
        });

        if (!resp.ok) {
            console.warn('Token refresh failed with status', resp.status);
            return null;
        }

        const data = await resp.json();
        // Support common response shapes: { accessToken }, { token }, { token: { accessToken } }
        const newToken = data.accessToken || data.token || data.token?.accessToken;
        if (!newToken) {
            console.warn('Token refresh response did not contain a recognised token field');
            return null;
        }

        currentToken = newToken;
        localStorage.setItem('accessToken', newToken);
        return newToken;
    } catch (err) {
        console.error('Error refreshing access token:', err);
        return null;
    }
}

/**
 * Wrapper around fetch() that handles auth tokens automatically:
 *
 *  1. If auth=true and the current token is expired/expiring soon, refresh first.
 *  2. Attach the Authorization header.
 *  3. If the server still returns 401, attempt one silent token refresh and retry.
 *  4. If the refresh also fails, clear the session and update the UI.
 *
 * Always sends credentials: 'include' so the refresh-token cookie is forwarded.
 */
async function apiFetch(url, options = {}, { auth = false, retryOnAuthError = true } = {}) {
    const finalOptions = { ...options, credentials: 'include' };
    const headers = { ...(options.headers || {}) };

    if (auth) {
        // Proactively refresh if the token is expired or expiring soon.
        // IMPORTANT: if the refresh fails, we still keep the current token and
        // let the server decide — do NOT null it out here, because a failed
        // proactive refresh (e.g. CORS issue) would cause us to send no token
        // at all, guaranteeing a 401 even when the token is still valid.
        if (currentToken && isTokenExpiredOrExpiringSoon(currentToken)) {
            const refreshed = await refreshAccessToken();
            if (refreshed) currentToken = refreshed;
            // If refresh failed, currentToken is unchanged — we try with it anyway
        }

        if (currentToken && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }
    }

    finalOptions.headers = headers;

    let response = await fetch(url, finalOptions);

    // Reactive refresh: the server rejected the token (e.g. it was invalidated server-side)
    if (auth && retryOnAuthError && response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            finalOptions.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, finalOptions);
        } else {
            // Both the request AND a fresh refresh returned 401 — session is truly dead.
            // Clear credentials and redirect away from protected pages.
            localStorage.removeItem('accessToken');
            currentToken = null;
            currentUser = null;
            updateAuthUI(false);
            if (typeof guardProtectedPage === 'function') guardProtectedPage();
        }
    }

    return response;
}

/**
 * Safely parse an error message from a fetch Response.
 * Handles:
 *  1. application/json responses with 'message' or 'error' fields.
 *  2. application/json responses as a validation map (e.g. { "username": "required" }).
 *  3. Plain text responses.
 */
async function safeParseErrorMessage(response) {
    try {
        // Clone so we don't consume the original response body if others need it
        const cloned = response.clone();
        const ct = cloned.headers.get('content-type') || '';

        if (ct.includes('application/json')) {
            const data = await cloned.json();
            if (!data) return null;

            // Prioritize explicit error/message/detail fields
            if (data.message) return data.message;
            if (data.error) return data.error;
            if (data.detail) return data.detail;

            // Handle Spring standard validation error list: { "errors": [{ "defaultMessage": "..." }] }
            if (Array.isArray(data.errors) && data.errors.length > 0) {
                return data.errors[0].defaultMessage || data.errors[0];
            }

            // Fallback: If it's a map (e.g. validation errors), return the first value found
            if (typeof data === 'object') {
                const values = Object.values(data);
                const firstString = values.find(v => typeof v === 'string');
                if (firstString) return firstString;
            }

            return null;
        } else {
            const text = await cloned.text();
            return text.trim() || null;
        }
    } catch (err) {
        console.warn('safeParseErrorMessage: Could not parse response', err);
        return null;
    }
}

// ==================== Global Utilities ====================

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Resolve a movie identifier (numeric id or title string) to its canonical title.
 * Falls back to the search API if the movie is not already in the local cache.
 */
async function resolveMovieTitle(identifier) {
    if (!identifier && identifier !== 0) return null;

    if (typeof identifier === 'number' || String(identifier).match(/^\d+$/)) {
        const idNum = Number(identifier);
        const found = allMovies.find(m => m.id === idNum);
        if (found?.title) return found.title;
        const um = userMovies.find(u => u.movieDetails?.id === idNum);
        if (um?.movieDetails?.title) return um.movieDetails.title;
        try {
            const resp = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchMovies}?q=${encodeURIComponent(String(idNum))}`);
            if (resp.ok) {
                const results = await resp.json();
                if (Array.isArray(results) && results.length) {
                    const m = results.find(r => r.id === idNum) || results[0];
                    if (m?.title) return m.title;
                }
            }
        } catch (e) { console.warn('resolveMovieTitle by id search failed', e); }
        return null;
    }

    return String(identifier).trim() || null;
}

function findMovieByIdentifier(identifier) {
    if (!identifier && identifier !== 0) return null;
    if (typeof identifier === 'number' || String(identifier).match(/^\d+$/)) {
        return allMovies.find(m => m.id === Number(identifier)) || null;
    }
    const title = String(identifier).trim().toLowerCase();
    return allMovies.find(m => (m.title || '').toLowerCase() === title)
        || userMovies.find(u => (u.movieDetails?.title || '').toLowerCase() === title)?.movieDetails
        || null;
}
