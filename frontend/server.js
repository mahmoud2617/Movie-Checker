const express = require('express');
const path = require('path');
const app = express();

// ── Static assets (css/, js/, assets/) ─────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── Environment Configuration ──────────────────────────────────────────────
app.get('/env-config.js', (req, res) => {
    const WEBSITE_BACKEND_URL = process.env.WEBSITE_BACKEND_URL || 'http://localhost:8080';
    res.type('application/javascript');
    res.send(`window.ENV_CONFIG = { WEBSITE_BACKEND_URL: "${WEBSITE_BACKEND_URL}" };`);
});

// ── Page routes ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/browse', (req, res) => res.sendFile(path.join(__dirname, 'html', 'browse.html')));
app.get('/browse.html', (req, res) => res.sendFile(path.join(__dirname, 'html', 'browse.html')));
app.get('/collection', (req, res) => res.sendFile(path.join(__dirname, 'html', 'collection.html')));
app.get('/collection.html', (req, res) => res.sendFile(path.join(__dirname, 'html', 'collection.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'html', 'profile.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'html', 'profile.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'html', 'forgot-password.html')));
app.get('/forgot-password.html', (req, res) => res.sendFile(path.join(__dirname, 'html', 'forgot-password.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'html', 'verify.html')));
app.get('/verify.html', (req, res) => res.sendFile(path.join(__dirname, 'html', 'verify.html')));

// ── Verify results (backend redirects here after email verification) ──
// NOTE: These pages don't exist yet in the html directory, but keeping routes
// in case they are added later. Pointing to verify.html as a fallback for now
// or index.html if verify fails.
app.get('/pages/verify-success', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pages/verify-expired', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pages/verify-error', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`MovieChecker is running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try one of the following:`);
        console.error(` - Stop the process using port ${PORT} (e.g. \`sudo lsof -iTCP:${PORT} -sTCP:LISTEN -P -n\` then kill the PID)`);
        console.error(` - Start this server on a different port: \`PORT=${Number(PORT) + 1} npm start\``);
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});
