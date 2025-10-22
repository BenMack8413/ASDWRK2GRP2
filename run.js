'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Initialize DB (executes schema & seeding)
require('./backend/db-init');

const { db, createTransactionAtomic } = require('./backend/db');
const createApiRouter = require('./backend/api');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Serve all static frontend files from frontend/
app.use(express.static(path.join(__dirname, 'frontend')));

// --- Mount API routes
app.use('/api', createApiRouter(db));

// --- SPA / fallback: only return index.html for non-file, non-api requests
// This prevents serving index.html to requests for /css/foo.css (those requests have an extension)
app.use((req, res, next) => {
    // Skip API requests
    if (req.path.startsWith('/api')) return next();

    // Skip requests for files
    if (path.extname(req.path)) return next();

    // Serve SPA index.html
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log('Shutting down... signal=', signal);
    try {
        server.close(() => {
            console.log('HTTP server closed.');
            try {
                db.close();
                console.log('Database closed.');
                process.exit(0);
            } catch (err) {
                console.error('Error closing DB:', err);
                process.exit(1);
            }
        });
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
