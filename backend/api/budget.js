const express = require('express');
const { db } = require('../db');

module.exports = function createBudgetRouter(db) {
    const router = express.Router();

    // GET /api/summary
    router.get('/', async (req, res) => {
        try {
            // Example queries
            const incomeRow = db
                .prepare(`
                    SELECT 
                        COALESCE(SUM(l.amount), 0) AS total_cents
                    FROM transactions t
                    LEFT JOIN transaction_lines l ON l.transaction_id = t.transaction_id
                    WHERE t.type = 'income'
                `)
                .get();
            const expenseRow = db
                .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`)
                .get();

            const income = (incomeRow?.total_cents || 0) / 100;
            const expense = expenseRow?.total || 0;
            const running = income - expense;

            res.json({ income, expense, running });
        } catch (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to load budget summary' });
        }
    });

    return router;
}
