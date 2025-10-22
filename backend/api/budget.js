const express = require('express');
const { db } = require('../db');

module.exports = function createBudgetRouter(db) {
    const router = express.Router();

    // GET /api/summary
    router.get('/', async (req, res) => {

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${yyyy}-${mm}`; // e.g. "2025-10"

        try {
            const incomeRows = db
            .prepare(`
                SELECT amount, frequency
                FROM incomes
                WHERE date LIKE ?
            `).all(`${monthPrefix}%`);

            // Fetch this month's expenses
            const expenseRows = db
            .prepare(`
                SELECT amount, frequency
                FROM expenses
                WHERE date LIKE ?
            `).all(`${monthPrefix}%`);

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

            const income = incomeRows.reduce((sum, r) => sum + monthlyEquivalent(r.amount / 100, r.frequency), 0);
            const expense = expenseRows.reduce((sum, r) => sum + monthlyEquivalent(r.amount, r.frequency), 0);
            const running = income - expense;

            res.json({ income, expense, running });
        } catch (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to load budget summary' });
        }
    });

    // routes/budget.js
    router.get('/monthly', async (req, res) => {
        try {
            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthsAhead = 12;

            // Build base months map (current + next 11)
            const monthMap = {};
            for (let i = 0; i < monthsAhead; i++) {
                const d = new Date(startOfCurrentMonth.getFullYear(), startOfCurrentMonth.getMonth() + i, 1);
                const key = d.toISOString().slice(0, 7);
                monthMap[key] = { month: key, income: 0, expense: 0 };
            }

            // Load all incomes & expenses (recurring or one-time)
            const incomes = db.prepare('SELECT amount, frequency, date FROM incomes').all();
            const expenses = db.prepare('SELECT amount, frequency, date FROM expenses').all();

            function addAmount(item, type) {
                const baseDate = new Date(item.date);
                const amount = item.amount / 100; // assuming stored in cents
                const freq = (item.frequency || 'one-time').toLowerCase();

                for (let i = 0; i < monthsAhead; i++) {
                    const d = new Date(startOfCurrentMonth.getFullYear(), startOfCurrentMonth.getMonth() + i, 1);
                    const key = d.toISOString().slice(0, 7);

                    // Skip months before the base date
                    if (d < new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)) continue;

                    // Add amount depending on frequency
                    const diffMonths =
                        (d.getFullYear() - baseDate.getFullYear()) * 12 + (d.getMonth() - baseDate.getMonth());

                    let include = false;
                    switch (freq) {
                        case 'one-time':
                            include = diffMonths === 0;
                            break;
                        case 'weekly':
                            include = true; // we’ll scale it to approximate monthly
                            break;
                        case 'fortnightly':
                            include = true; // same idea — scale later
                            break;
                        case 'monthly':
                            include = diffMonths >= 0;
                            break;
                        case 'yearly':
                            include = diffMonths % 12 === 0;
                            break;
                    }

                    if (include) {
                        let adjAmount = amount;
                        if (freq === 'weekly') adjAmount *= 4.345; // approx weeks per month
                        if (freq === 'fortnightly') adjAmount *= 2.1725;

                        if (type === 'income') monthMap[key].income += adjAmount;
                        else monthMap[key].expense += adjAmount;
                    }
                }
            }

            // Add incomes & expenses
            incomes.forEach(i => addAmount(i, 'income'));
            expenses.forEach(e => addAmount(e, 'expense'));

            // Convert map to ordered array
            const results = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

            res.json(results);
        } catch (err) {
            console.error('Failed to compute monthly data:', err);
            res.status(500).json({ error: 'Failed to compute monthly data' });
        }
    });
    return router;
}
