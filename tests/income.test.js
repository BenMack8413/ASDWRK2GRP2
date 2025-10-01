// tests/income.test.js
process.env.NODE_ENV = 'test';

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;

beforeAll(() => {
  // Create an in-memory DB and initialize schema from backend/schema.sql
  db = new Database(':memory:');

  const schemaPath = path.join(__dirname, '..', 'backend', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute the SQL schema (creates tables, triggers, indexes and initial seed rows)
  db.exec(schemaSql);

  // Ensure seed rows we need exist (schema already inserts user id=1 and budget id=1,
  // but we'll ensure an account for budget 1 exists so transactions with account_id work)
  db.prepare(
    `INSERT OR IGNORE INTO accounts (account_id, budget_id, name, currency, balance)
     VALUES (?, ?, ?, ?, ?)`
  ).run(1, 1, 'Test Account', 'USD', 0);
});

afterAll(() => {
  if (db && typeof db.close === 'function') db.close();
});

describe('Income DB layer', () => {
  test('Insert income transaction and check cents storage', () => {
    const budget_id = 1;
    const account_id = 1;

    // Insert a transaction header (amount kept as sum of lines; triggers will update)
    const insertTxn = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (@budget_id, @account_id, @date, @amount, @notes, @type)
    `);

    // We will insert the header with amount = 0 and then insert a transaction_lines row
    // The triggers in schema.sql will keep transactions.amount in sync with lines sum.
    const header = insertTxn.run({
      budget_id,
      account_id,
      date: '2025-01-01',
      amount: 0,
      notes: 'Test income header',
      type: 'income'
    });

    const transaction_id = header.lastInsertRowid;

    // Insert a line (amount in cents)
    const cents = 12345; // $123.45
    db.prepare(
      `INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
       VALUES (?, ?, ?, ?, ?)`
    ).run(transaction_id, null, cents, 1, 'Test income line');

    // Because of triggers, transactions.amount should have been updated
    const txnRow = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transaction_id);
    expect(txnRow).toBeTruthy();
    expect(Number(txnRow.amount)).toBe(cents); // amount stored in cents

    // Also check the transaction_lines entry
    const lineRow = db.prepare('SELECT * FROM transaction_lines WHERE transaction_id = ?').get(transaction_id);
    expect(lineRow).toBeTruthy();
    expect(Number(lineRow.amount)).toBe(cents);

    // Optional: check account balance updated by delta triggers
    const accountRow = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(account_id);
    expect(accountRow).toBeTruthy();
    // account.balance is in cents (triggers update it)
    expect(Number(accountRow.balance)).toBe(cents);
  });
});

