// ==================== Navigation ====================
// Each "section" is now its own page. Navigation = real URL changes.

/** Detect which page we're currently on based on pathname. */
function currentPage() {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '' || p === '/index.html' || p === '/') return 'home';
    if (p.includes('browse')) return 'browse';
    if (p.includes('collection')) return 'collection';
    if (p.includes('profile')) return 'profile';
    if (p.includes('forgot-password')) return 'forgot-password';
    return 'home';
}

/**
 * Highlight the correct nav link for the current page.
 * Works for both the top nav-tabs and the logged-in dropdown.
 */
function setActiveNav() {
    const page = currentPage();
    document.querySelectorAll('.nav-tabs a, .nav-dropdown-inner a').forEach(link => {
        link.classList.remove('active-nav');
        const nav = link.getAttribute('data-nav');
        if (nav === page) link.classList.add('active-nav');
    });
}

// ── Simple wrappers so existing onclick="showX()" calls still work ──────────

function showHome() { window.location.href = '/index.html'; }
function showMovies() { window.location.href = '/browse'; }
function showMyMovies() {
    if (!currentUser) { showAlert('Please login first', 'warning'); showLoginModal(); return; }
    window.location.href = '/collection';
}
function showProfile() {
    if (!currentUser) { showAlert('Please login first', 'warning'); showLoginModal(); return; }
    window.location.href = '/profile';
}
function showEditProfile() { window.location.href = '/profile'; }

function closeNavMenu() {
    const dropdown = document.getElementById('navDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

function toggleNavMenu() {
    const dropdown = document.getElementById('navDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
}
