// backend/api/expenses_simple.js
const express = require('express');
const { db: sharedDb } = require('../db');

module.exports = function createSimpleExpensesRouter() {
    const router = express.Router();

    // GET /api/expenses?budget_id=1
    router.get('/', (req, res) => {
        const budget_id = Number(req.query.budget_id);
        if (!budget_id)
            return res.status(400).json({ error: 'budget_id required' });

        const rows = sharedDb
            .prepare(
                'SELECT * FROM expenses WHERE budget_id = ? ORDER BY date DESC, expense_id DESC',
            )
            .all(budget_id);

        const resp = rows.map((r) => ({
            id: r.expense_id,
            budget_id: r.budget_id,
            user_id: r.user_id,
            account_id: r.account_id,
            amount: (r.amount || 0) / 100,
            category: r.category,
            source: r.source,
            date: r.date,
            frequency: r.frequency,
            notes: r.notes,
            created_at: r.created_at,
        }));

        res.json(resp);
    });

    // POST /api/expenses
    // Body: { budget_id, amount (dollars), date (YYYY-MM-DD), category, source, frequency, notes, account_id?, user_id? }
    router.post('/', (req, res) => {
        try {
            const {
                budget_id,
                amount,
                date,
                category,
                source,
                frequency,
                notes,
                account_id,
                user_id,
            } = req.body;
            if (!budget_id || !amount || !date) {
                return res
                    .status(400)
                    .json({ error: 'budget_id, amount and date are required' });
            }

            // Ensure budget exists
            const budget = sharedDb
                .prepare('SELECT budget_id FROM budgets WHERE budget_id = ?')
                .get(Number(budget_id));
            if (!budget)
                return res.status(400).json({
                    error: 'budget_not_found',
                    detail: `Budget ${budget_id} not found`,
                });

            // Validate optional account if provided
            if (account_id != null) {
                const acc = sharedDb
                    .prepare(
                        'SELECT account_id FROM accounts WHERE account_id = ? AND budget_id = ?',
                    )
                    .get(Number(account_id), Number(budget_id));
                if (!acc) {
                    return res.status(400).json({
                        error: 'account_not_found_or_mismatch',
                        detail: `Account ${account_id} not found for budget ${budget_id}`,
                    });
                }
            }

            const amount_cents = Math.round(Number(amount) * 100);
            const info = sharedDb
                .prepare(
                    `INSERT INTO expenses (budget_id, user_id, account_id, amount, category, source, date, frequency, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .run(
                    Number(budget_id),
                    user_id || null,
                    account_id || null,
                    amount_cents,
                    category || null,
                    source || null,
                    String(date),
                    frequency || null,
                    notes || null,
                );

            const created = sharedDb
                .prepare('SELECT * FROM expenses WHERE expense_id = ?')
                .get(info.lastInsertRowid);

            res.status(201).json({
                id: created.expense_id,
                budget_id: created.budget_id,
                amount: created.amount / 100,
                date: created.date,
                category: created.category,
                source: created.source,
                frequency: created.frequency,
                notes: created.notes,
            });
        } catch (err) {
            console.error('expenses_simple POST error:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    // DELETE /api/expenses/:id?budget_id=1
    router.delete('/:id', (req, res) => {
        try {
            const id = Number(req.params.id);
            const budget_id = Number(req.query.budget_id);
            if (!id || !budget_id)
                return res
                    .status(400)
                    .json({ error: 'id and budget_id required' });

            const info = sharedDb
                .prepare(
                    'DELETE FROM expenses WHERE expense_id = ? AND budget_id = ?',
                )
                .run(id, budget_id);
            if (info.changes === 0)
                return res.status(404).json({ error: 'not found' });

            res.json({ ok: true });
        } catch (err) {
            console.error('expenses_simple DELETE error:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    return router;
};
