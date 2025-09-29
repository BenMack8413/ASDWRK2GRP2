// backend/api/incomes_simple.js
const express = require('express');
const { db: sharedDb } = require('../db');

module.exports = function createSimpleIncomeRouter() {
  const router = express.Router();

  // GET /api/incomes?budget_id=1
  router.get('/', (req, res) => {
    const budget_id = Number(req.query.budget_id);
    if (!budget_id) return res.status(400).json({ error: 'budget_id required' });

    const rows = sharedDb.prepare('SELECT * FROM incomes WHERE budget_id = ? ORDER BY date DESC').all(budget_id);
    const resp = rows.map(r => ({
      id: r.income_id,
      budget_id: r.budget_id,
      account_id: r.account_id,
      date: r.date,
      source: r.source,
      amount: (r.amount || 0) / 100,
      frequency: r.frequency,
      notes: r.notes
    }));
    res.json(resp);
  });

  // POST /api/incomes
  router.post('/', (req, res) => {
    try {
      const { budget_id, amount, date, source, frequency, notes, account_id, user_id } = req.body;
      if (!budget_id || !amount || !date) return res.status(400).json({ error: 'budget_id, amount, date required' });

      // ensure budget exists
      const budget = sharedDb.prepare('SELECT budget_id FROM budgets WHERE budget_id = ?').get(budget_id);
      if (!budget) return res.status(400).json({ error: 'budget_not_found' });

      const amount_cents = Math.round(Number(amount) * 100);

      const info = sharedDb.prepare(
        `INSERT INTO incomes (budget_id, user_id, account_id, amount, source, date, frequency, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(budget_id, user_id || null, account_id || null, amount_cents, source || null, date, frequency || null, notes || null);

      const created = sharedDb.prepare('SELECT * FROM incomes WHERE income_id = ?').get(info.lastInsertRowid);
      res.status(201).json({
        id: created.income_id,
        budget_id: created.budget_id,
        amount: created.amount / 100,
        date: created.date,
        source: created.source,
        frequency: created.frequency,
        notes: created.notes
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal error', detail: String(err.message || err) });
    }
  });

  // DELETE /api/incomes/:id?budget_id=1
  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    const budget_id = Number(req.query.budget_id);
    if (!id || !budget_id) return res.status(400).json({ error: 'id and budget_id required' });

    const info = sharedDb.prepare('DELETE FROM incomes WHERE income_id = ? AND budget_id = ?').run(id, budget_id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  });

  return router;
};
