// ==================== App Bootstrap ====================
// Called once the DOM is ready on every page.
// Each page calls the functions relevant to it.

document.addEventListener('DOMContentLoaded', () => {

    // ── Always: restore auth session + highlight current nav link ────────────
    checkAuthStatus();  // defined in auth.js
    setActiveNav();     // defined in navigation.js

    // ── Check for showLogin parameter ────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    if (params.get('showLogin') === 'true' && !localStorage.getItem('accessToken')) {
        // Use a small timeout to ensure everything is initialized
        setTimeout(() => {
            if (typeof showLoginModal === 'function') showLoginModal();
        }, 300);
    }

    // ── Always: close nav dropdown when clicking outside ─────────────────────
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('navDropdown');
        const toggle = document.getElementById('navbarToggle');
        if (dropdown && dropdown.classList.contains('open')) {
            if (!dropdown.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        }
    });

    // ── Page-specific init ────────────────────────────────────────────────────
    const page = currentPage();

    if (page === 'browse') {
        // Close suggestions when clicking outside the search box
        document.addEventListener('click', (e) => {
            const suggestions = document.getElementById('searchSuggestions');
            const box = document.querySelector('.search-box');
            if (box && !box.contains(e.target) && suggestions) {
                suggestions.classList.remove('active');
                suggestionSelectedIndex = -1;
            }
        });
        loadAllMovies();
    }

    if (page === 'collection') {
        // Guard: redirect to home if not logged in (handled after auth resolves)
        // loadUserMovies() is called inside checkAuthStatus → fetchCurrentUser
    }

    if (page === 'profile') {
        // loadProfileData() is called after auth resolves in auth.js
        const nameInput = document.getElementById('inlineEditName');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitEditName(); }
                if (e.key === 'Escape') toggleEditName();
            });
        }
    }
});
