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

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Mount API
app.use('/api', createApiRouter(db, createTransactionAtomic));

// SPA fallback
app.use((req, res, next) => {
  // skip API routes
  if (req.path.startsWith('/api/')) return next();

  const indexFile = path.join(__dirname, 'frontend', 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  next(); // pass to 404 if index.html is missing
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
