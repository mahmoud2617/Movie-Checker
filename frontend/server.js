const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname)));

// Route all requests to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`MovieChecker frontend is running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try one of the following:`);
        console.error(` - Stop the process using port ${PORT} (e.g. \`sudo lsof -iTCP:${PORT} -sTCP:LISTEN -P -n\` then kill the PID)`);
        console.error(` - Start this server on a different port: \`PORT=${Number(PORT)+1} npm start\``);
        process.exit(1);
    }
    // For other errors rethrow so node prints stack (useful during development)
    console.error('Server error:', err);
    process.exit(1);
});
