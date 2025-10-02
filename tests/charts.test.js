// tests/charts.test.js
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

  // Insert test data for charts to use
  db.prepare('INSERT INTO categories (category_id, budget_id, name, type) VALUES (?, ?, ?, ?)').run(1, 1, 'Groceries', 'expense');
  db.prepare('INSERT INTO categories (category_id, budget_id, name, type) VALUES (?, ?, ?, ?)').run(2, 1, 'Transportation', 'expense');
  db.prepare('INSERT INTO categories (category_id, budget_id, name, type) VALUES (?, ?, ?, ?)').run(3, 1, 'Salary', 'income');

  db.prepare('INSERT INTO accounts (account_id, budget_id, name, currency, balance) VALUES (?, ?, ?, ?, ?)').run(1, 1, 'Test Account', 'USD', 0);

  // Create test transactions
  const txn1 = db.prepare('INSERT INTO transactions (budget_id, account_id, date, amount, type) VALUES (?, ?, ?, ?, ?)').run(1, 1, '2025-01-01', -5000, 'expense').lastInsertRowid;
  const txn2 = db.prepare('INSERT INTO transactions (budget_id, account_id, date, amount, type) VALUES (?, ?, ?, ?, ?)').run(1, 1, '2025-01-02', -3000, 'expense').lastInsertRowid;
  const txn3 = db.prepare('INSERT INTO transactions (budget_id, account_id, date, amount, type) VALUES (?, ?, ?, ?, ?)').run(1, 1, '2025-01-03', 10000, 'income').lastInsertRowid;

  db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn1, 1, -5000, 1);
  db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn2, 2, -3000, 1);
  db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn3, 3, 10000, 1);
});

afterAll(() => {
  if (db && typeof db.close === 'function') db.close();
});

describe('Chart Configs DB layer', () => {
  test('Insert chart config and verify storage', () => {
    const config = {
      chartData: { labels: ['A', 'B'], datasets: [{ data: [10, 20] }] },
      dataSource: 'expenses-by-category',
      startDate: '2025-01-01',
      endDate: '2025-01-31'
    };

    const result = db.prepare(`
      INSERT INTO chart_configs (budget_id, name, type, config_json)
      VALUES (?, ?, ?, ?)
    `).run(1, 'Test Chart', 'pie', JSON.stringify(config));

    expect(result.lastInsertRowid).toBeTruthy();

    const chartConfig = db.prepare('SELECT * FROM chart_configs WHERE config_id = ?').get(result.lastInsertRowid);
    expect(chartConfig).toBeTruthy();
    expect(chartConfig.name).toBe('Test Chart');
    expect(chartConfig.type).toBe('pie');
    expect(chartConfig.budget_id).toBe(1);

    const parsedConfig = JSON.parse(chartConfig.config_json);
    expect(parsedConfig.dataSource).toBe('expenses-by-category');
    expect(parsedConfig.startDate).toBe('2025-01-01');
  });

  test('Retrieve all chart configs for a budget', () => {
    db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Chart 1', 'bar', '{}');
    db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Chart 2', 'line', '{}');
    db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(2, 'Other Budget Chart', 'pie', '{}');

    const configs = db.prepare('SELECT * FROM chart_configs WHERE budget_id = ?').all(1);
    
    expect(configs.length).toBeGreaterThanOrEqual(2);
    expect(configs.every(c => c.budget_id === 1)).toBe(true);
  });

  test('Update chart config', () => {
    const configId = db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Old Name', 'pie', '{}').lastInsertRowid;

    const updateResult = db.prepare('UPDATE chart_configs SET name = ?, type = ? WHERE config_id = ?').run('New Name', 'bar', configId);
    
    expect(updateResult.changes).toBe(1);

    const updated = db.prepare('SELECT * FROM chart_configs WHERE config_id = ?').get(configId);
    expect(updated.name).toBe('New Name');
    expect(updated.type).toBe('bar');
  });

  test('Delete chart config', () => {
    const configId = db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Delete Me', 'pie', '{}').lastInsertRowid;

    const deleteResult = db.prepare('DELETE FROM chart_configs WHERE config_id = ?').run(configId);
    expect(deleteResult.changes).toBe(1);

    const deleted = db.prepare('SELECT * FROM chart_configs WHERE config_id = ?').get(configId);
    expect(deleted).toBeUndefined();
  });

  test('Chart config stores complex JSON correctly', () => {
    const complexConfig = {
      chartData: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Expenses',
          data: [100, 200, 150],
          backgroundColor: ['#ff0000', '#00ff00', '#0000ff']
        }]
      },
      dataSource: 'expenses-by-category',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      filters: {
        categories: [1, 2, 3],
        tags: ['essential']
      }
    };

    const configId = db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Complex Chart', 'line', JSON.stringify(complexConfig)).lastInsertRowid;

    const retrieved = db.prepare('SELECT * FROM chart_configs WHERE config_id = ?').get(configId);
    const parsedConfig = JSON.parse(retrieved.config_json);

    expect(parsedConfig.chartData.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(parsedConfig.chartData.datasets[0].data).toEqual([100, 200, 150]);
    expect(parsedConfig.filters.categories).toEqual([1, 2, 3]);
  });

  test('Chart config has created_at timestamp', () => {
    const configId = db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(1, 'Timestamp Test', 'pie', '{}').lastInsertRowid;

    const config = db.prepare('SELECT * FROM chart_configs WHERE config_id = ?').get(configId);
    expect(config.created_at).toBeTruthy();
    
    // Verify it's a valid timestamp
    const timestamp = new Date(config.created_at);
    expect(timestamp instanceof Date && !isNaN(timestamp)).toBe(true);
  });

  test('Chart config deletion cascades when budget is deleted', () => {
    const budgetId = db.prepare('INSERT INTO budgets (user_id, name, currency) VALUES (?, ?, ?)').run(1, 'Test Budget', 'USD').lastInsertRowid;
    
    db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(budgetId, 'Chart 1', 'pie', '{}');
    db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(budgetId, 'Chart 2', 'bar', '{}');

    const beforeDelete = db.prepare('SELECT COUNT(*) as count FROM chart_configs WHERE budget_id = ?').get(budgetId);
    expect(beforeDelete.count).toBe(2);

    db.prepare('DELETE FROM budgets WHERE budget_id = ?').run(budgetId);

    const afterDelete = db.prepare('SELECT COUNT(*) as count FROM chart_configs WHERE budget_id = ?').get(budgetId);
    expect(afterDelete.count).toBe(0);
  });

  test('Chart config foreign key constraint on budget', () => {
    expect(() => {
      db.prepare('INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)').run(9999, 'Invalid', 'pie', '{}');
    }).toThrow();
  });
});

describe('Chart Data Queries', () => {
  test('Expenses by category query returns correct totals', () => {
    const results = db.prepare(`
      SELECT c.name AS category, SUM(l.amount) AS total
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ? AND t.type = 'expense'
      GROUP BY c.category_id
      ORDER BY total DESC
    `).all(1);

    expect(results.length).toBeGreaterThan(0);
    
    const groceries = results.find(r => r.category === 'Groceries');
    expect(groceries).toBeTruthy();
    expect(groceries.total).toBe(-5000);

    const transportation = results.find(r => r.category === 'Transportation');
    expect(transportation).toBeTruthy();
    expect(transportation.total).toBe(-3000);
  });

  test('Expenses by category with date range', () => {
    const results = db.prepare(`
      SELECT c.name AS category, SUM(l.amount) AS total
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ? 
        AND t.type = 'expense'
        AND t.date BETWEEN ? AND ?
      GROUP BY c.category_id
      ORDER BY total DESC
    `).all(1, '2025-01-01', '2025-01-01');

    expect(results.length).toBe(1);
    expect(results[0].category).toBe('Groceries');
    expect(results[0].total).toBe(-5000);
  });

  test('Income vs expenses query', () => {
    const results = db.prepare(`
      SELECT 
        t.type,
        SUM(l.amount) AS total
      FROM transaction_lines l
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ?
      GROUP BY t.type
    `).all(1);

    expect(results.length).toBe(2);
    
    const income = results.find(r => r.type === 'income');
    const expenses = results.find(r => r.type === 'expense');

    expect(income.total).toBe(10000);
    expect(expenses.total).toBe(-8000);
  });

  test('Category with no transactions returns zero', () => {
    db.prepare('INSERT INTO categories (category_id, budget_id, name, type) VALUES (?, ?, ?, ?)').run(99, 1, 'Unused Category', 'expense');

    const results = db.prepare(`
      SELECT c.name AS category, COALESCE(SUM(l.amount), 0) AS total
      FROM categories c
      LEFT JOIN transaction_lines l ON l.category_id = c.category_id
      WHERE c.budget_id = ? AND c.category_id = ?
      GROUP BY c.category_id
    `).all(1, 99);

    expect(results.length).toBe(1);
    expect(results[0].total).toBe(0);
  });

  test('Multiple transactions in same category aggregate correctly', () => {
    const categoryId = 1; // Groceries
    
    // Add another grocery transaction
    const txn = db.prepare('INSERT INTO transactions (budget_id, account_id, date, amount, type) VALUES (?, ?, ?, ?, ?)').run(1, 1, '2025-01-05', -2000, 'expense').lastInsertRowid;
    db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn, categoryId, -2000, 1);

    const result = db.prepare(`
      SELECT c.name AS category, SUM(l.amount) AS total, COUNT(l.line_id) AS count
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      WHERE c.category_id = ?
      GROUP BY c.category_id
    `).get(categoryId);

    expect(result.total).toBe(-7000); // -5000 + -2000
    expect(result.count).toBe(2);
  });

  test('Chart data respects budget isolation', () => {
    // Create data for budget 2
    db.prepare('INSERT INTO categories (category_id, budget_id, name, type) VALUES (?, ?, ?, ?)').run(10, 2, 'Budget 2 Category', 'expense');
    
    const txn = db.prepare('INSERT INTO transactions (budget_id, account_id, date, amount, type) VALUES (?, ?, ?, ?, ?)').run(2, 1, '2025-01-01', -1000, 'expense').lastInsertRowid;
    db.prepare('INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order) VALUES (?, ?, ?, ?)').run(txn, 10, -1000, 1);

    const budget1Results = db.prepare(`
      SELECT COUNT(*) as count
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ?
    `).get(1);

    const budget2Results = db.prepare(`
      SELECT COUNT(*) as count
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ?
    `).get(2);

    expect(budget1Results.count).toBeGreaterThan(0);
    expect(budget2Results.count).toBeGreaterThan(0);
    expect(budget1Results.count).not.toBe(budget2Results.count);
  });
});