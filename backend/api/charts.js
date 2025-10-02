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
    db.all(sql, [budgetId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
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
    db.all(sql, [budgetId, tagId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // (Optional) CRUD for saved chart configs
  router.get('/configs/:budgetId', (req, res) => {
    const { budgetId } = req.params;
    db.all(`SELECT * FROM chart_configs WHERE budget_id = ?`, [budgetId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  router.post('/configs', (req, res) => {
    const { budgetId, name, type, config } = req.body;
    db.run(
      `INSERT INTO chart_configs (budget_id, name, type, config_json) VALUES (?, ?, ?, ?)`,
      [budgetId, name, type, JSON.stringify(config)],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ config_id: this.lastID });
      }
    );
  });

  router.delete('/configs/:configId', (req, res) => {
    const { configId } = req.params;
    db.run(`DELETE FROM chart_configs WHERE config_id = ?`, [configId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });

  return router;
};
