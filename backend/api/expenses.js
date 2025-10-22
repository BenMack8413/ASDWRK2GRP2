const express = require('express');
const { db } = require('../db');

module.exports = function createExpenseRouter(db) {
    const router = express.Router();

    // Ensure simple expenses table exists
    db.prepare(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT,
            frequency TEXT,
            description TEXT
        )
    `).run();

    // GET /api/expenses
    router.get('/', (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/expenses error', err);
            res.status(500).json({ error: 'Failed to load expenses' });
        }
    });

    // POST /api/expenses
    router.post('/', express.json(), (req, res) => {
        const { source, amount, date, frequency, description } = req.body;
        if (!source || amount == null) {
            return res.status(400).json({ error: 'source and amount are required' });
        }
        try {
            const info = db.prepare(
                `INSERT INTO expenses (source, amount, date, frequency, description)
                 VALUES (?, ?, ?, ?, ?)`
            ).run(source, amount, date || null, frequency || null, description || null);

            const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid);
            res.status(201).json(created);
        } catch (err) {
            console.error('POST /api/expenses error', err);
            res.status(500).json({ error: 'Failed to create expense' });
        }
    });

    // DELETE /api/expenses/:id
    router.delete('/:id', (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'invalid id' });
        try {
            const info = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
            if (info.changes) return res.json({ deleted: true });
            return res.status(404).json({ deleted: false });
        } catch (err) {
            console.error('DELETE /api/expenses/:id error', err);
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    });

    return router;
};