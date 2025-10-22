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
                    SELECT COALESCE(SUM(amount), 0) AS total_cents
                    FROM incomes
                `)
                .get();
            const expenseRow = db
                .prepare(`
                    SELECT COALESCE(SUM(amount), 0) AS total 
                    FROM expenses
                    `)
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

    router.get('/monthly', async (req, res) => {
    try {
        const now = new Date();
        const startYear = now.getFullYear();
        const startMonth = now.getMonth(); // 0-indexed

        // Build 12-month range
        const months = Array.from({ length: 12 }).map((_, i) => {
            const date = new Date(startYear, startMonth + i, 1);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            return `${yyyy}-${mm}`;
        });

        // Fetch incomes from incomes_simple
        const incomeRows = db.prepare(`
            SELECT date, amount, frequency
            FROM incomes
        `).all();

        // Fetch expenses
        const expenseRows = db.prepare(`
            SELECT date, amount, frequency
            FROM expenses
        `).all();

        // Helper: calculate monthly equivalent
        const monthlyEquivalent = (amount, frequency) => {
            switch (frequency) {
                case 'daily': return amount * 30;
                case 'weekly': return amount * 4.345;
                case 'fortnightly': return amount * 2.1725;
                case 'monthly': return amount;
                case 'yearly': return amount / 12;
                default: return amount; // one-time or null
            }
        };

        // Aggregate per month
        const data = months.map(month => {
            const income = incomeRows
                .filter(r => r.date.startsWith(month))
                .reduce((sum, r) => sum + monthlyEquivalent(r.amount, r.frequency), 0);

            const expense = expenseRows
                .filter(r => r.date.startsWith(month))
                .reduce((sum, r) => sum + monthlyEquivalent(r.amount, r.frequency), 0);

            return { month, income, expense };
        });

        res.json(data);

        } catch (err) {
            console.error('Database error (monthly):', err);
            res.status(500).json({ error: 'Failed to load monthly budget data' });
        }
    });

    return router;
}
