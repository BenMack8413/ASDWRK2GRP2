'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');

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

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Mount API
app.use('/api', createApiRouter(db, createTransactionAtomic));

// SPA fallback
const fs = require('fs');
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const idx = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  next();
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = signal => {
  console.log('Shutting down... signal=', signal);
  server.close(() => {
    console.log('HTTP server closed.');
    db.close();
    console.log('Database closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
