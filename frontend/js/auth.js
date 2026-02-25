// ==================== Authentication ====================

/**
 * On page load, check for a stored access token and try to restore the session.
 * If the token is already expired, attempt a silent refresh via the cookie first.
 */
function checkAuthStatus() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        currentToken = token;
        if (isTokenExpiredOrExpiringSoon(token, 0)) {
            refreshAccessToken().then(newToken => {
                if (newToken) {
                    currentToken = newToken;
                    fetchCurrentUser();
                } else {
                    localStorage.removeItem('accessToken');
                    currentToken = null;
                    updateAuthUI(false);
                    guardProtectedPage();
                }
            });
        } else {
            fetchCurrentUser();
        }
    } else {
        updateAuthUI(false);
        guardProtectedPage();
    }
}

/**
 * Redirect to home if the current page requires authentication and
 * the user is not logged in.
 */
function guardProtectedPage() {
    const page = currentPage();
    if (page === 'collection' || page === 'profile') {
        window.location.href = '/index.html';
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

            // Page-specific post-auth work
            const page = currentPage();
            if (page === 'collection') {
                await loadUserMovies(); // loadUserMovies already calls filterMovies internally
            }
            if (page === 'profile') {
                loadProfileData();
            }
            // On browse page keep userMovies fresh so quick-action buttons reflect state
            if (page === 'browse') {
                await loadUserMovies();
            }
        } else {
            localStorage.removeItem('accessToken');
            currentToken = null;
            updateAuthUI(false);
            guardProtectedPage();
        }
    } catch (error) {
        console.error('Error fetching current user:', error);
        updateAuthUI(false);
        guardProtectedPage();
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
                showAlert(msg || 'Login failed. Please try again.', 'error');
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
    modalClosed('logoutConfirmModal');
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
            window.location.href = '/index.html';
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
            API_BASE_URL + API_ENDPOINTS.deleteUser(),
            { method: 'DELETE' },
            { auth: true }
        );

        if (resp.ok) {
            document.getElementById('deleteConfirmModal').classList.remove('active');
            modalClosed('deleteConfirmModal');
            localStorage.removeItem('accessToken');
            currentToken = null;
            currentUser = null;
            userMovies = [];
            updateAuthUI(false);
            window.location.href = '/index.html';
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
