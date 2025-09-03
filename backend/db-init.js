const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbFile = path.resolve(__dirname, 'mybudget.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');
const db = new Database(dbFile);

// Ensure foreign keys are enabled on this connection
db.pragma('foreign_keys = ON');

// Load SQL file
const sql = fs.readFileSync(schemaPath, 'utf8');

// Run schema in a single transaction
db.exec('BEGIN;');
db.exec(sql);
db.exec('COMMIT;');

// Optionally seed a recalculation to ensure balances are consistent
db.prepare('INSERT INTO recalc_requests DEFAULT VALUES').run();

console.log('DB initialized and balances recalculated.');
db.close();