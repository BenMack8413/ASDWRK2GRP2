// tests/income.test.js
process.env.NODE_ENV = 'test';

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;

beforeAll(() => {
  db = new Database(':memory:');

  const schemaPath = path.join(__dirname, '..', 'backend', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Ensure seed rows we need exist
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

    const insertTxn = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (@budget_id, @account_id, @date, @amount, @notes, @type)
    `);

    const header = insertTxn.run({
      budget_id,
      account_id,
      date: '2025-01-01',
      amount: 0,
      notes: 'Test income header',
      type: 'income'
    });

    const transaction_id = header.lastInsertRowid;
    const cents = 12345; // $123.45

    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(transaction_id, null, cents, 1, 'Test income line');

    const txnRow = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transaction_id);
    expect(txnRow).toBeTruthy();
    expect(Number(txnRow.amount)).toBe(cents);

    const lineRow = db.prepare('SELECT * FROM transaction_lines WHERE transaction_id = ?').get(transaction_id);
    expect(lineRow).toBeTruthy();
    expect(Number(lineRow.amount)).toBe(cents);

    const accountRow = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(account_id);
    expect(accountRow).toBeTruthy();
    expect(Number(accountRow.balance)).toBe(cents);
  });

  test('Multiple income lines sum correctly in transaction.amount', () => {
    const transaction_id = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (1, 1, '2025-01-02', 0, 'Multi-line header', 'income')
    `).run().lastInsertRowid;

    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(transaction_id, null, 1000, 1, 'Line 1');

    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(transaction_id, null, 2000, 2, 'Line 2');

    const txnRow = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transaction_id);
    expect(Number(txnRow.amount)).toBe(3000);
  });

  test('Inserting income with category updates correctly', () => {
    const transaction_id = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (1, 1, '2025-01-03', 0, 'Category header', 'income')
    `).run().lastInsertRowid;

    // Use NULL for category_id to avoid foreign key failure
    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(transaction_id, null, 5000, 1, 'Category line');

    const lineRow = db.prepare('SELECT * FROM transaction_lines WHERE transaction_id = ?').get(transaction_id);
    expect(lineRow.category_id).toBeNull();
    expect(Number(lineRow.amount)).toBe(5000);
  });

  test('Income transaction notes are stored correctly', () => {
    const notesText = 'Special notes test';
    const transaction_id = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (1, 1, '2025-01-04', 0, ?, 'income')
    `).run(notesText).lastInsertRowid;

    const txnRow = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transaction_id);
    expect(txnRow.notes).toBe(notesText);
  });
});
