const express = require('express');

module.exports = function createChartRouter(db) {
  const router = express.Router();

  // GET: totals per category
  router.get('/expenses-by-category/:budgetId', (req, res) => {
    const { budgetId } = req.params;
    const sql = `
      SELECT c.name AS category, SUM(l.amount) AS total
      FROM transaction_lines l
      JOIN categories c ON c.category_id = l.category_id
      JOIN transactions t ON t.transaction_id = l.transaction_id
      WHERE t.budget_id = ?
      GROUP BY c.category_id
      ORDER BY total DESC;
    `;
    try {
      const rows = db.prepare(sql).all(budgetId);
      res.json(rows);
    } catch (err) {
      console.error('Error in expenses-by-category:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET: totals filtered by tag
  router.get('/expenses-by-tag/:budgetId/:tagId', (req, res) => {
    const { budgetId, tagId } = req.params;
    const sql = `
      SELECT tg.name AS tag, SUM(l.amount) AS total
      FROM transaction_tags tt
      JOIN tags tg ON tg.tag_id = tt.tag_id
      JOIN transactions t ON t.transaction_id = tt.transaction_id
      JOIN transaction_lines l ON l.transaction_id = t.transaction_id
      WHERE t.budget_id = ? AND tg.tag_id = ?
      GROUP BY tg.tag_id;
    `;
    try {
      const rows = db.prepare(sql).all(budgetId, tagId);
      res.json(rows);
    } catch (err) {
      console.error('Error in expenses-by-tag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET: all chart configs for a budget
  router.get('/configs/:budgetId', (req, res) => {
    const { budgetId } = req.params;
    try {
      const rows = db.prepare(`SELECT * FROM chart_configs WHERE budget_id = ?`).all(budgetId);
      res.json(rows);
    } catch (err) {
      console.error('Error getting configs:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST: create new chart config
  router.post('/configs', (req, res) => {
    const { budgetId, name, type, config } = req.body;
    try {
      const result = db.prepare(
        `INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)`
      ).run(budgetId, name, type, JSON.stringify(config));
      
      res.json({ config_id: result.lastInsertRowid });
    } catch (err) {
      console.error('Error creating config:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: remove chart config
  router.delete('/configs/:configId', (req, res) => {
    const { configId } = req.params;
    try {
      const result = db.prepare(`DELETE FROM chart_configs WHERE config_id = ?`).run(configId);
      res.json({ deleted: result.changes });
    } catch (err) {
      console.error('Error deleting config:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};