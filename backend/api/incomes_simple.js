// backend/api/incomes_simple.js
const express = require('express');
const { db: sharedDb } = require('../db');

module.exports = function createSimpleIncomeRouter() {
    const router = express.Router();

    // GET /api/incomes?budget_id=1
    router.get('/', (req, res) => {
        const budget_id = Number(req.query.budget_id);
        if (!budget_id)
            return res.status(400).json({ error: 'budget_id required' });

        const rows = sharedDb
            .prepare(
                'SELECT * FROM incomes WHERE budget_id = ? ORDER BY date DESC, income_id DESC',
            )
            .all(budget_id);

        const resp = rows.map((r) => ({
            id: r.income_id,
            budget_id: r.budget_id,
            user_id: r.user_id,
            account_id: r.account_id,
            amount: (r.amount || 0) / 100,
            source: r.source,
            date: r.date,
            frequency: r.frequency,
            notes: r.notes,
            created_at: r.created_at,
        }));

        res.json(resp);
    });

    // POST /api/incomes
    // Body: { budget_id, amount (dollars), date (YYYY-MM-DD), source, frequency, notes, account_id?, user_id? }
    router.post('/', (req, res) => {
        try {
            const {
                budget_id,
                amount,
                date,
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
                    `INSERT INTO incomes (budget_id, user_id, account_id, amount, source, date, frequency, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .run(
                    Number(budget_id),
                    user_id || null,
                    account_id || null,
                    amount_cents,
                    source || null,
                    String(date),
                    frequency || null,
                    notes || null,
                );

            const created = sharedDb
                .prepare('SELECT * FROM incomes WHERE income_id = ?')
                .get(info.lastInsertRowid);

            res.status(201).json({
                id: created.income_id,
                budget_id: created.budget_id,
                amount: created.amount / 100,
                date: created.date,
                source: created.source,
                frequency: created.frequency,
                notes: created.notes,
            });
        } catch (err) {
            console.error('incomes_simple POST error:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    // DELETE /api/incomes/:id?budget_id=1
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
                    'DELETE FROM incomes WHERE income_id = ? AND budget_id = ?',
                )
                .run(id, budget_id);
            if (info.changes === 0)
                return res.status(404).json({ error: 'not found' });

            res.json({ ok: true });
        } catch (err) {
            console.error('incomes_simple DELETE error:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    return router;
};
