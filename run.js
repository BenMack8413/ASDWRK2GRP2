'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// NOTE: Do NOT require DB init here unconditionally — leave that to the "run" path
// so tests can control DB setup (or set NODE_ENV=test).
// require('./backend/db-init');  <-- moved into the run-time block below

const { db, createTransactionAtomic } = require('./backend/db');
const createApiRouter = require('./backend/api');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API
app.use('/api', createApiRouter(db, createTransactionAtomic));

// Serve static assets
app.use('/css', express.static(path.join(__dirname, 'frontend', 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'frontend', 'scripts')));
app.use('/images', express.static(path.join(__dirname, 'frontend', 'images')));

// Serve HTML pages directly
app.get('/:page.html', (req, res) => {
  const htmlPath = path.join(__dirname, 'frontend', `${req.params.page}.html`);
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.status(404).send('Page not found');
});

// Export the app so tests can require() it without starting the server
module.exports = app;

/* -------- Start server only when run.js is executed directly --------
   This prevents starting an actual listening server when tests `require('../run')`.
------------------------------------------------------------------------ */
if (require.main === module) {
  // Initialize DB (executes schema & seeding) — only when running the app normally
  // If you want tests to run DB init too, they can require './backend/db-init' explicitly
  require('./backend/db-init');

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown (closure captures `server`)
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
}

// 'use strict';
// const path = require('path');
// const express = require('express');
// const cors = require('cors');
// const fs = require('fs');

// // Initialize DB (executes schema & seeding)
// require('./backend/db-init');

// const { db, createTransactionAtomic } = require('./backend/db');
// const createApiRouter = require('./backend/api');

// const HOST = process.env.HOST || '0.0.0.0';
// const PORT = Number(process.env.PORT || 3000);

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Mount API
// app.use('/api', createApiRouter(db, createTransactionAtomic));

// // Serve static assets
// app.use('/css', express.static(path.join(__dirname, 'frontend', 'css')));
// app.use('/scripts', express.static(path.join(__dirname, 'frontend', 'scripts')));
// app.use('/images', express.static(path.join(__dirname, 'frontend', 'images')));

// // Serve HTML pages directly
// app.get('/:page.html', (req, res) => {
//     const htmlPath = path.join(__dirname, 'frontend', `${req.params.page}.html`);
//     if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
//     res.status(404).send('Page not found');
// });


// // Start server
// const server = app.listen(PORT, HOST, () => {
//     console.log(`Server listening on http://${HOST}:${PORT}`);
// });

// // Graceful shutdown
// const shutdown = (signal) => {
//     console.log('Shutting down... signal=', signal);
//     try {
//         server.close(() => {
//             console.log('HTTP server closed.');
//             try {
//                 db.close();
//                 console.log('Database closed.');
//                 process.exit(0);
//             } catch (err) {
//                 console.error('Error closing DB:', err);
//                 process.exit(1);
//             }
//         });
//     } catch (err) {
//         console.error('Error during shutdown:', err);
//         process.exit(1);
//     }
// };

// process.on('SIGTERM', () => shutdown('SIGTERM'));
// process.on('SIGINT', () => shutdown('SIGINT'));
