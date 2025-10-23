// backend/api/expense.js
const express = require('express');
const { createTransactionAtomic, db: sharedDb } = require('../db'); // uses createTransactionAtomic exported from your db.js

module.exports = function createExpenseRouter(db) {
    const router = express.Router();

    // List expenses (transactions with type = 'expense')
    // GET /api/expense?budget_id=1
    router.get('/', (req, res) => {
        const budget_id = Number(req.query.budget_id);
        if (!budget_id)
            return res
                .status(400)
                .json({ error: 'budget_id query parameter is required' });

        const rows = sharedDb
            .prepare(
                `
        SELECT t.transaction_id, t.budget_id, t.account_id, t.date, t.notes, t.type,
               COALESCE((SELECT SUM(amount) FROM transaction_lines l WHERE l.transaction_id = t.transaction_id), 0) AS amount_cents
        FROM transactions t
        WHERE t.budget_id = ? AND t.type = 'expense'
        ORDER BY date DESC, transaction_id DESC
      `,
            )
            .all(budget_id);

        // convert cents -> dollars and return absolute value so client gets a positive amount
        const resp = rows.map((r) => ({
            id: r.transaction_id,
            budget_id: r.budget_id,
            account_id: r.account_id,
            date: r.date,
            description: r.notes,
            amount: Math.abs(r.amount_cents || 0) / 100,
            type: r.type,
        }));

        res.json(resp);
    });

    // Create a new expense (creates transaction + one line)
    router.post('/', (req, res) => {
        try {
            const {
                budget_id,
                amount,
                date,
                category,
                source,
                frequency,
                description,
                account_id,
            } = req.body;
            if (!budget_id || !amount || !date) {
                return res
                    .status(400)
                    .json({ error: 'budget_id, amount and date are required' });
            }

            const amount_cents = Math.round(Number(amount) * 100);
            if (!Number.isFinite(amount_cents))
                return res.status(400).json({ error: 'invalid amount' });

            // For transaction lines we use a negative amount so the transaction sums to an outflow.
            const payload = {
                budget_id: Number(budget_id),
                account_id: account_id ? Number(account_id) : null,
                date: String(date),
                notes: description || category || source || null,
                type: 'expense',
                lines: [
                    {
                        category_id: null,
                        amount: -Math.abs(amount_cents), // negative cents for expense line
                        note: category || source || null,
                    },
                ],
                tag_ids: [],
            };

            const transaction_id = createTransactionAtomic(payload);

            const txn = sharedDb
                .prepare(
                    'SELECT * FROM transactions WHERE transaction_id = ? AND budget_id = ?',
                )
                .get(transaction_id, payload.budget_id);

            const amountRow = sharedDb
                .prepare(
                    'SELECT COALESCE(SUM(amount),0) AS amount_cents FROM transaction_lines WHERE transaction_id = ?',
                )
                .get(transaction_id);

            res.status(201).json({
                id: txn.transaction_id,
                budget_id: txn.budget_id,
                account_id: txn.account_id,
                date: txn.date,
                description: txn.notes,
                // send absolute (positive) amount in dollars so front-end displays -$amount if desired
                amount: Math.abs(amountRow.amount_cents || 0) / 100,
                type: txn.type,
            });
        } catch (err) {
            console.error('Failed to create expense:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    // Delete expense (delete transaction)
    router.delete('/:id', (req, res) => {
        const transaction_id = Number(req.params.id);
        const budget_id = Number(req.query.budget_id);
        if (!transaction_id || !budget_id) {
            return res
                .status(400)
                .json({ error: 'transaction id and budget_id are required' });
        }

        const info = sharedDb
            .prepare(
                'DELETE FROM transactions WHERE transaction_id = ? AND budget_id = ?',
            )
            .run(transaction_id, budget_id);

        if (info.changes === 0)
            return res.status(404).json({ error: 'not found' });
        res.json({ ok: true });
    });

    return router;
};
