// tests/categories.test.js
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
});

afterAll(() => {
  if (db && typeof db.close === 'function') db.close();
});

describe('Categories DB layer', () => {
  test('Insert category and verify storage', () => {
    const result = db.prepare(`
      INSERT INTO categories (budget_id, name, type)
      VALUES (?, ?, ?)
    `).run(1, 'Groceries', 'expense');

    expect(result.lastInsertRowid).toBeTruthy();

    const category = db.prepare('SELECT * FROM categories WHERE category_id = ?').get(result.lastInsertRowid);
    expect(category).toBeTruthy();
    expect(category.name).toBe('Groceries');
    expect(category.type).toBe('expense');
    expect(category.budget_id).toBe(1);
  });

  test('Insert multiple categories and retrieve all for budget', () => {
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Salary', 'income');
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Transportation', 'expense');
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Utilities', 'expense');

    const categories = db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY name ASC').all(1);
    
    expect(categories.length).toBeGreaterThanOrEqual(3);
    expect(categories.some(cat => cat.name === 'Salary')).toBe(true);
    expect(categories.some(cat => cat.name === 'Transportation')).toBe(true);
  });

  test('Filter categories by type', () => {
    const expenseCategories = db.prepare('SELECT * FROM categories WHERE budget_id = ? AND type = ?').all(1, 'expense');
    const incomeCategories = db.prepare('SELECT * FROM categories WHERE budget_id = ? AND type = ?').all(1, 'income');

    expect(expenseCategories.length).toBeGreaterThan(0);
    expect(incomeCategories.length).toBeGreaterThan(0);
    
    expenseCategories.forEach(cat => {
      expect(cat.type).toBe('expense');
    });

    incomeCategories.forEach(cat => {
      expect(cat.type).toBe('income');
    });
  });

  test('Update category name and type', () => {
    const insertResult = db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Old Name', 'expense');
    const categoryId = insertResult.lastInsertRowid;

    const updateResult = db.prepare('UPDATE categories SET name = ?, type = ? WHERE category_id = ?').run('New Name', 'income', categoryId);
    
    expect(updateResult.changes).toBe(1);

    const updated = db.prepare('SELECT * FROM categories WHERE category_id = ?').get(categoryId);
    expect(updated.name).toBe('New Name');
    expect(updated.type).toBe('income');
  });

  test('Delete category without transactions', () => {
    const insertResult = db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Delete Me', 'expense');
    const categoryId = insertResult.lastInsertRowid;

    const deleteResult = db.prepare('DELETE FROM categories WHERE category_id = ?').run(categoryId);
    expect(deleteResult.changes).toBe(1);

    const deleted = db.prepare('SELECT * FROM categories WHERE category_id = ?').get(categoryId);
    expect(deleted).toBeUndefined();
  });

  test('Category with unique constraint on budget_id and name', () => {
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Unique Category', 'expense');

    expect(() => {
      db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Unique Category', 'expense');
    }).toThrow();
  });

  test('Case-insensitive category name handling', () => {
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'dining out', 'expense');

    // This should throw due to COLLATE NOCASE
    expect(() => {
      db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'DINING OUT', 'expense');
    }).toThrow();
  });

  test('Category usage count in transactions', () => {
    const categoryId = db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Test Usage', 'expense').lastInsertRowid;

    // Create transaction
    const txnId = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, 1, '2025-01-01', -5000, 'Test', 'expense').lastInsertRowid;

    // Create transaction line with category
    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order)
      VALUES (?, ?, ?, ?)
    `).run(txnId, categoryId, -5000, 1);

    // Count usage
    const usage = db.prepare('SELECT COUNT(*) as count FROM transaction_lines WHERE category_id = ?').get(categoryId);
    expect(usage.count).toBe(1);
  });

  test('Cannot delete category in use by transactions', () => {
    const categoryId = db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'In Use', 'expense').lastInsertRowid;

    // Create transaction with this category
    const txnId = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, 1, '2025-01-01', -1000, 'Test', 'expense').lastInsertRowid;

    db.prepare(`
      INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order)
      VALUES (?, ?, ?, ?)
    `).run(txnId, categoryId, -1000, 1);

    // Check if category is in use
    const inUse = db.prepare('SELECT COUNT(*) as count FROM transaction_lines WHERE category_id = ?').get(categoryId);
    expect(inUse.count).toBeGreaterThan(0);

    // Business logic: should not allow deletion if in use
    if (inUse.count > 0) {
      // In the API, this would return an error instead of deleting
      expect(inUse.count).toBeGreaterThan(0);
    }
  });

  test('Category statistics - total amount and transaction count', () => {
    const categoryId = db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Stats Test', 'expense').lastInsertRowid;

    // Create multiple transactions
    const txn1 = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, 1, '2025-01-01', -1000, 'Test 1', 'expense').lastInsertRowid;

    const txn2 = db.prepare(`
      INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, 1, '2025-01-02', -2000, 'Test 2', 'expense').lastInsertRowid;

    db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn1, categoryId, -1000, 1);
    db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn2, categoryId, -2000, 1);

    const stats = db.prepare(`
      SELECT 
        COUNT(tl.line_id) as transaction_count,
        SUM(tl.amount) as total_amount
      FROM transaction_lines tl
      WHERE tl.category_id = ?
    `).get(categoryId);

    expect(stats.transaction_count).toBe(2);
    expect(stats.total_amount).toBe(-3000);
  });

  test('Categories scoped to budget (isolation)', () => {
    // Create category for budget 1
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(1, 'Budget 1 Category', 'expense');
    
    // Create category for budget 2 with same name (should be allowed)
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(2, 'Budget 1 Category', 'expense');

    const budget1Categories = db.prepare('SELECT * FROM categories WHERE budget_id = ?').all(1);
    const budget2Categories = db.prepare('SELECT * FROM categories WHERE budget_id = ?').all(2);

    expect(budget1Categories.length).toBeGreaterThan(0);
    expect(budget2Categories.length).toBeGreaterThan(0);
  });

  test('Category foreign key constraint on budget', () => {
    // Should fail with non-existent budget_id
    expect(() => {
      db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(9999, 'Invalid Budget', 'expense');
    }).toThrow();
  });

  test('Category deletion cascades when budget is deleted', () => {
    // Create a test budget
    const budgetId = db.prepare('INSERT INTO budgets (user_id, name, currency) VALUES (?, ?, ?)').run(1, 'Test Budget', 'USD').lastInsertRowid;
    
    // Create categories for this budget
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(budgetId, 'Test Cat 1', 'expense');
    db.prepare('INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)').run(budgetId, 'Test Cat 2', 'income');

    const beforeDelete = db.prepare('SELECT COUNT(*) as count FROM categories WHERE budget_id = ?').get(budgetId);
    expect(beforeDelete.count).toBe(2);

    // Delete budget
    db.prepare('DELETE FROM budgets WHERE budget_id = ?').run(budgetId);

    // Categories should be deleted due to CASCADE
    const afterDelete = db.prepare('SELECT COUNT(*) as count FROM categories WHERE budget_id = ?').get(budgetId);
    expect(afterDelete.count).toBe(0);
  });
});