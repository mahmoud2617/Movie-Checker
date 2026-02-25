// ==================== Profile ====================

function loadProfileData() {
    if (!currentUser) return;
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const joinDateEl = document.getElementById('profileJoinDate');

    if (nameEl) nameEl.textContent = currentUser.name || 'N/A';
    if (emailEl) emailEl.textContent = currentUser.email || 'N/A';

    if (joinDateEl) {
        if (currentUser.joinDate) {
            // Java LocalDate serializes as "YYYY-MM-DD".
            // Splitting manually avoids UTC midnight off-by-one in some timezones.
            const [year, month, day] = currentUser.joinDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            joinDateEl.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } else {
            joinDateEl.textContent = 'N/A';
        }
    }

    // Collapse all inline forms on load
    ['editNameForm', 'editPasswordForm', 'forgotPasswordForm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ── Error helper removed — now in api.js ─────────────────────────────────────

// ==================== Inline Edit: Name ====================

function toggleEditName() {
    const form = document.getElementById('editNameForm');
    const input = document.getElementById('inlineEditName');
    if (!form) return;

    const isHidden = form.style.display === 'none' || form.style.display === '';
    if (isHidden) {
        form.style.display = 'block';
        if (input) { input.value = currentUser?.name || ''; input.focus(); input.select(); }
    } else {
        form.style.display = 'none';
    }
}

async function submitEditName() {
    const input = document.getElementById('inlineEditName');
    if (!input) return;
    const name = input.value.trim();

    if (!name) { showAlert('Please enter a name', 'warning'); return; }
    if (name === currentUser?.name) { toggleEditName(); return; }

    showLoadingSpinner(true);
    try {
        // PATCH /users/change-name  — no ID, backend reads from token
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.changeUserName(),
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
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Failed to update name', 'error');
        }
    } catch (err) {
        console.error('submitEditName error', err);
        showAlert('Error updating name', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// ==================== Inline Edit: Password ====================

function toggleEditPassword() {
    const form = document.getElementById('editPasswordForm');
    if (!form) return;

    const isHidden = form.style.display === 'none' || form.style.display === '';
    if (isHidden) {
        form.style.display = 'block';
        const oldPw = document.getElementById('inlineOldPassword');
        const newPw = document.getElementById('inlineNewPassword');
        if (oldPw) { oldPw.value = ''; oldPw.focus(); }
        if (newPw) newPw.value = '';
    } else {
        form.style.display = 'none';
    }
}

async function submitEditPassword() {
    const oldPw = document.getElementById('inlineOldPassword')?.value.trim();
    const newPw = document.getElementById('inlineNewPassword')?.value.trim();

    if (!oldPw) { showAlert('Please enter your current password', 'warning'); return; }
    if (!newPw) { showAlert('Please enter a new password', 'warning'); return; }

    showLoadingSpinner(true);
    try {
        // PATCH /users/change-password/{id}  — still uses path ID
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
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Failed to update password', 'error');
        }
    } catch (err) {
        console.error('submitEditPassword error', err);
        showAlert('Error updating password', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

// ==================== Forgot Password Flow ====================
// Step 1 — user confirms email → backend sends 6-digit code
// Step 2 — user enters code   → backend returns a RESET_PASSWORD JWT
// Step 3 — user enters new password → backend resets it, user stays logged in

let _forgotStep = 1;
let _resendTimer = null;

function toggleForgotPassword() {
    const form = document.getElementById('forgotPasswordForm');
    if (!form) return;

    const isHidden = form.style.display === 'none' || form.style.display === '';
    if (isHidden) {
        _forgotStep = 1;
        resetToken = null;
        if (_resendTimer) { clearInterval(_resendTimer); _resendTimer = null; }
        renderForgotStep();
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
        if (_resendTimer) { clearInterval(_resendTimer); _resendTimer = null; }
    }
}

function renderForgotStep() {
    const body = document.getElementById('forgotPasswordBody');
    if (!body) return;

    if (_forgotStep === 1) {
        body.innerHTML = `
            <p class="forgot-hint">We will send a 6-digit verification code to your account email. Make sure the address below is correct before continuing.</p>
            <div class="form-group">
                <label for="forgotEmail">Account email</label>
                <input type="email" id="forgotEmail" class="inline-input"
                       value="${currentUser?.email || ''}" readonly
                       onkeydown="if(event.key==='Enter'){ event.preventDefault(); submitForgotStep1(); }">
            </div>
            <div class="inline-edit-actions">
                <button id="forgotBtn1" class="btn btn-primary btn-sm" onclick="submitForgotStep1(); return false;">Send Code</button>
                <button class="btn btn-secondary btn-sm" onclick="toggleForgotPassword(); return false;">Cancel</button>
            </div>`;
        document.getElementById('forgotEmail')?.focus();

    } else if (_forgotStep === 2) {
        body.innerHTML = `
            <p class="forgot-hint">A 6-digit code was sent to <strong>${currentUser?.email || 'your email'}</strong>. Enter it below — it expires in 10 minutes.</p>
            <div class="form-group">
                <label for="forgotCode">Verification code</label>
                <input type="text" id="forgotCode" class="inline-input" placeholder="123456"
                       maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                       oninput="this.value=this.value.replace(/\\D/g,'')"
                       onkeydown="if(event.key==='Enter'){ event.preventDefault(); submitForgotStep2(); }">
            </div>
            <div class="inline-edit-actions">
                <button id="forgotBtn2" class="btn btn-primary btn-sm" onclick="submitForgotStep2(); return false;">Verify Code</button>
                <button class="btn btn-secondary btn-sm" onclick="toggleForgotPassword(); return false;">Cancel</button>
            </div>
            <p class="forgot-resend">Didn't receive it? <button id="forgotResendBtn" class="forgot-resend-btn" disabled onclick="forgotResend(); return false;">Resend in <span id="forgotResendTimer">60</span>s</button></p>`;
        document.getElementById('forgotCode')?.focus();
        startForgotResendTimer();

    } else if (_forgotStep === 3) {
        body.innerHTML = `
            <p class="forgot-hint">Almost done. Enter your new password below.</p>
            <div class="form-group">
                <label for="forgotNewPassword">New password</label>
                <input type="password" id="forgotNewPassword" class="inline-input" placeholder="Enter new password"
                       autocomplete="new-password"
                       onkeydown="if(event.key==='Enter'){ event.preventDefault(); submitForgotStep3(); }">
            </div>
            <div class="inline-edit-actions">
                <button id="forgotBtn3" class="btn btn-primary btn-sm" onclick="submitForgotStep3(); return false;">Reset Password</button>
                <button class="btn btn-secondary btn-sm" onclick="toggleForgotPassword(); return false;">Cancel</button>
            </div>`;
        document.getElementById('forgotNewPassword')?.focus();
    }
}

// ── Resend timer ──────────────────────────────────────────────────────────────

function startForgotResendTimer(seconds = 60) {
    if (_resendTimer) clearInterval(_resendTimer);
    let remaining = seconds;
    const btn = document.getElementById('forgotResendBtn');
    _resendTimer = setInterval(() => {
        remaining--;
        if (btn) {
            btn.innerHTML = `Resend in <span id="forgotResendTimer">${remaining}</span>s`;
        }
        if (remaining <= 0) {
            clearInterval(_resendTimer);
            _resendTimer = null;
            if (btn) { btn.disabled = false; btn.textContent = 'Resend code'; }
        }
    }, 1000);
}

async function forgotResend() {
    const btn = document.getElementById('forgotResendBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
    }

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.resetPasswordRequest,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: currentUser.email }) },
            { auth: true }
        );
        if (resp.ok || resp.status === 204) {
            showAlert('New code sent — check your inbox', 'success');
            // Clear the input for the fresh code
            const codeEl = document.getElementById('forgotCode');
            if (codeEl) { codeEl.value = ''; codeEl.focus(); }
            startForgotResendTimer();
        } else {
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Could not resend code', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Resend code'; }
        }
    } catch (err) {
        console.error('forgotResend error', err);
        showAlert('Error reaching server', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Resend code'; }
    }
}

// ── Step 1: validate email then send code ─────────────────────────────────────

async function submitForgotStep1() {
    const emailEl = document.getElementById('forgotEmail');
    const email = emailEl?.value.trim();

    if (!email) {
        showAlert('Please enter your email address', 'warning');
        emailEl?.focus();
        return;
    }

    // Guard: must match the logged-in account email
    if (email.toLowerCase() !== currentUser.email.toLowerCase()) {
        showAlert('That email does not match your account. Please use your account email.', 'error');
        emailEl?.select();
        return;
    }

    const btn = document.getElementById('forgotBtn1');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    showLoadingSpinner(true);

    try {
        const resp = await apiFetch(
            API_BASE_URL + API_ENDPOINTS.resetPasswordRequest,
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) },
            { auth: true }
        );

        if (resp.ok || resp.status === 204) {
            _forgotStep = 2;
            renderForgotStep();
            showAlert('Verification code sent — check your inbox', 'success');
        } else {
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Could not send verification code', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Send Code'; }
        }
    } catch (err) {
        console.error('forgotStep1 error', err);
        showAlert('Error reaching server', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Send Code'; }
    } finally {
        showLoadingSpinner(false);
    }
}

// ── Step 2: verify 6-digit code ───────────────────────────────────────────────

async function submitForgotStep2() {
    const codeEl = document.getElementById('forgotCode');
    const code = codeEl?.value.trim();

    if (!code) {
        showAlert('Please enter the verification code', 'warning');
        codeEl?.focus();
        return;
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        showAlert('The code must be exactly 6 digits', 'warning');
        codeEl?.select();
        return;
    }

    const btn = document.getElementById('forgotBtn2');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }
    showLoadingSpinner(true);

    try {
        const url = `${API_BASE_URL}${API_ENDPOINTS.resetPasswordVerify}?id=${currentUser.id}&code=${encodeURIComponent(code)}`;
        const resp = await apiFetch(url, { method: 'PATCH' }, { auth: true });

        if (resp.ok) {
            const data = await resp.json();
            resetToken = data.token || data.accessToken;
            if (_resendTimer) { clearInterval(_resendTimer); _resendTimer = null; }
            _forgotStep = 3;
            renderForgotStep();
        } else {
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Invalid or expired code — please try again', 'error');
            // Clear and refocus so user can retry cleanly
            if (codeEl) { codeEl.value = ''; codeEl.focus(); }
            if (btn) { btn.disabled = false; btn.textContent = 'Verify Code'; }
        }
    } catch (err) {
        console.error('forgotStep2 error', err);
        showAlert('Error reaching server', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Verify Code'; }
    } finally {
        showLoadingSpinner(false);
    }
}

// ── Step 3: set new password ──────────────────────────────────────────────────

async function submitForgotStep3() {
    const newPassword = document.getElementById('forgotNewPassword')?.value.trim();

    if (!newPassword) {
        showAlert('Please enter a new password', 'warning');
        document.getElementById('forgotNewPassword')?.focus();
        return;
    }
    if (!resetToken) {
        showAlert('Your session expired. Please start again.', 'error');
        toggleForgotPassword();
        return;
    }

    const btn = document.getElementById('forgotBtn3');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    showLoadingSpinner(true);

    try {
        const resp = await apiFetch(API_BASE_URL + API_ENDPOINTS.resetPasswordConfirm, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resetToken}`
            },
            body: JSON.stringify({ newPassword })
        }, { auth: false }); // explicit false because we use resetToken, not currentToken

        if (resp.ok || resp.status === 204) {
            resetToken = null;
            // Show success state inside the form before logging out
            const body = document.getElementById('forgotPasswordBody');
            if (body) {
                body.innerHTML = `
                    <div class="forgot-success">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                        <p class="forgot-success-title">Password changed successfully</p>
                    </div>`;
            }
            // Stay logged in — close the form after a short moment
            setTimeout(() => toggleForgotPassword(), 2000);
        } else {
            const msg = await safeParseErrorMessage(resp);
            showAlert(msg || 'Failed to reset password', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Reset Password'; }
        }
    } catch (err) {
        console.error('forgotStep3 error', err);
        showAlert('Error reaching server', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Reset Password'; }
    } finally {
        showLoadingSpinner(false);
    }
}
