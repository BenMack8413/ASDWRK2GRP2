const express = require('express');
const { db } = require('../db');

module.exports = function createBudgetSimpleRouter(db) {
    const router = express.Router();

    // Ensure budget_simple table exists
    db.prepare(`
        CREATE TABLE IF NOT EXISTS budget_simple (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // GET /api/budget_simple
    router.get('/', (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM budget_simple ORDER BY created_at ASC').all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/budget_simple error', err);
            res.status(500).json({ error: 'Failed to load budgets' });
        }
    });

    // POST /api/budget_simple
    router.post('/', express.json(), (req, res) => {
        const { title, amount } = req.body;
        if (!title || amount == null) {
            return res.status(400).json({ error: 'title and amount are required' });
        }

        try {
            const info = db.prepare(
                `INSERT INTO budget_simple (title, amount) VALUES (?, ?)`
            ).run(title, amount);

            const created = db.prepare('SELECT * FROM budget_simple WHERE id = ?').get(info.lastInsertRowid);
            res.status(201).json(created);
        } catch (err) {
            console.error('POST /api/budget_simple error', err);
            res.status(500).json({ error: 'Failed to create budget' });
        }
    });

    // DELETE /api/budget_simple/:id
    router.delete('/:id', (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'invalid id' });

        try {
            const info = db.prepare('DELETE FROM budget_simple WHERE id = ?').run(id);
            if (info.changes) return res.json({ deleted: true });
            return res.status(404).json({ deleted: false });
        } catch (err) {
            console.error('DELETE /api/budget_simple/:id error', err);
            res.status(500).json({ error: 'Failed to delete budget' });
        }
    });

    return router;
};
