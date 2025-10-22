const express = require('express');
const { db } = require('../db');

module.exports = function createBudgetSimpleRouter(db) {
    const router = express.Router();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS budget_simple (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();

    // GET all simple budgets
    router.get('/', (req, res) => {
//        db.prepare(`SELECT * FROM budget_simple ORDER BY date_created ASC`, [], (err, rows) => {
//            if (err) return res.status(500).json({ error: err.message });
//            res.json(rows);
 //       });

        try {
            const rows = db.prepare('SELECT * FROM budget_simple ORDER BY created_at ASC').all();
            res.json(rows);
        } catch {

        }
    });

    //POST a new simple budget
    router.post('/', (req, res) => {
        const { title, amount } = req.body;
        if (!title || amount == null) return res.status(400).json({ error: 'Invalid input' });

        const sql = `INSERT INTO budget_simple (title, amount) VALUES (?, ?)`;
        db.run(sql, [title, amount], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get(`SELECT * FROM budget_simple WHERE id = ?`, [this.lastID], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        });
    });

    return router;
}