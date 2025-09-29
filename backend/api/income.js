// backend/api/income.js
const express = require('express');
const { createTransactionAtomic, db: sharedDb } = require('../db'); // uses createTransactionAtomic exported from your db.js

module.exports = function createIncomeRouter(/*db*/) {
  const router = express.Router();

  // List incomes for a budget
  // GET /api/income?budget_id=1
  router.get('/', (req, res) => {
    const budget_id = Number(req.query.budget_id);
    if (!budget_id) return res.status(400).json({ error: 'budget_id query parameter is required' });

    // select transactions with type = 'income'
    const rows = sharedDb
      .prepare(`
        SELECT t.transaction_id, t.budget_id, t.account_id, t.date, t.notes, t.type,
               COALESCE((SELECT SUM(amount) FROM transaction_lines l WHERE l.transaction_id = t.transaction_id), 0) AS amount_cents
        FROM transactions t
        WHERE t.budget_id = ? AND t.type = 'income'
        ORDER BY date DESC, transaction_id DESC
      `)
      .all(budget_id);

    // convert cents -> dollars for client
    const resp = rows.map(r => ({
      id: r.transaction_id,
      budget_id: r.budget_id,
      account_id: r.account_id,
      date: r.date,
      description: r.notes,
      amount: (r.amount_cents || 0) / 100,
      type: r.type
    }));

    res.json(resp);
  });
  
};