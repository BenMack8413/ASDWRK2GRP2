const express = require('express');

module.exports = function createUpcomingPaymentsRouter(db) {
    const router = express.Router();

    // GET all upcoming payments
    router.get('/', (req, res) => {
        const query = 'SELECT * FROM upcoming_payments';
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });

    // POST new upcoming payment
    router.post('/', (req, res) => {
        const { description, dueDate, amount } = req.body;
        const query =
            'INSERT INTO upcoming_payments (description, due_date, amount) VALUES (?, ?, ?)';
        db.run(query, [description, dueDate, amount], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, description, dueDate, amount });
        });
    });

    return router;
};
