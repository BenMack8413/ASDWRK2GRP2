const express = require('express');
const { createTransactionAtomic } = require('../db');

module.exports = function createTransactionsRouter(db) {
    const router = express.Router();

    // get transactions for a specific budget
    router.get('/', (req, res) => {
        const budget_id = Number(req.query.budget_id);
        if (!budget_id)
            return res
                .status(400)
                .json({ error: 'budget_id query parameter is required' });

        const rows = db
            .prepare(
                'SELECT * FROM transactions WHERE budget_id = ? ORDER BY date DESC, transaction_id DESC',
            )
            .all(budget_id);

        res.json(rows);
    });

    // GET transactuin by transaction id and budget id
    router.get('/:id', (req, res) => {
        const transaction_id = Number(req.params.id);
        if (!transaction_id)
            return res
                .status(400)
                .json({ error: 'transaction_id query parameter is required' });
        const budget_id = Number(req.query.budget_id);
        if (!budget_id)
            return res
                .status(400)
                .json({ error: 'budget_id query parameter is required' });

        const transaction = db
            .prepare(
                'SELECT * FROM transactions WHERE transaction_id = ? AND budget_id = ?',
            )
            .get(transaction_id, budget_id);

        if (!transaction)
            return res
                .status(404)
                .json({ error: 'transaction not found for this budget' });
        res.json(transaction);
    });

    // POST new transaction
    router.post('/', (req, res) => {
        try {
            const payload = req.body;
            if (
                !payload ||
                !payload.budget_id ||
                !Array.isArray(payload.lines) ||
                payload.lines.length === 0
            ) {
                return res.status(400).json({
                    error: 'budget_id and at least one line required',
                });
            }

            const transaction_id = createTransactionAtomic(payload);

            const txn = db
                .prepare(
                    'SELECT * FROM transactions WHERE transaction_id = ? AND budget_id = ?',
                )
                .get(transaction_id, payload.budget_id);

            const account = txn.account_id
                ? db
                      .prepare(
                          'SELECT account_id, balance FROM accounts WHERE account_id = ? AND budget_id = ?',
                      )
                      .get(txn.account_id, payload.budget_id)
                : null;

            res.status(201).json({ transaction: txn, account });
        } catch (err) {
            console.error('Failed to create transaction:', err);
            res.status(500).json({
                error: 'internal error',
                detail: String(err.message || err),
            });
        }
    });

    return router;
};
