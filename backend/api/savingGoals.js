const express = require('express');

module.exports = function createSavingGoalsRouter(db) {
    const router = express.Router();

    // GET all saving goals
    router.get('/', (req, res) => {
        const query = 'SELECT * FROM saving_goals';
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });

    // POST new saving goal
    router.post('/', (req, res) => {
        const { name, targetAmount, currentAmount } = req.body;
        const query =
            'INSERT INTO saving_goals (name, target_amount, current_amount) VALUES (?, ?, ?)';
        db.run(query, [name, targetAmount, currentAmount], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name, targetAmount, currentAmount });
        });
    });

    return router;
};
