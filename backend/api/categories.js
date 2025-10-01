/* eslint-disable */
const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // -------------------
    // GET all categories for a budget
    router.get('/', async (req, res) => {
        try {
            const budget_id = Number(req.query.budget_id);
            if (!budget_id) {
                return res.status(400).json({ error: 'budget_id query parameter is required' });
            }

            const sql = 'SELECT * FROM categories WHERE budget_id = ?';
            const rows = await db.all(sql, [budget_id]);

            res.status(200).json({ data: rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error', detail: err.message });
        }
    });

    // -------------------
    // POST create category
    router.post('/', async (req, res) => {
        try {
            const { budget_id, name, type } = req.body;
            if (!budget_id || !name) {
                return res.status(400).json({ error: 'Missing required fields: budget_id, name' });
            }

            const sql = 'INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)';
            const result = await db.run(sql, [budget_id, name, type || null]);

            res.status(201).json({
                message: 'Category created',
                data: { category_id: result.lastID, budget_id, name, type }
            });
        } catch (err) {
            console.error(err);
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Category already exists in this budget' });
            }
            res.status(500).json({ error: 'Failed to create category', detail: err.message });
        }
    });

    // -------------------
    // PUT update category
    router.put('/:id', async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { name, type } = req.body;

            if (!id || !name) {
                return res.status(400).json({ error: 'Invalid id or name' });
            }

            const sql = 'UPDATE categories SET name = ?, type = ? WHERE category_id = ?';
            const result = await db.run(sql, [name, type || null, id]);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.status(200).json({ message: 'Category updated', data: { id, name, type } });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update category', detail: err.message });
        }
    });

    // -------------------
    // DELETE category
    router.delete('/:id', async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ error: 'Invalid id' });

            const sql = 'DELETE FROM categories WHERE category_id = ?';
            const result = await db.run(sql, [id]);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.status(200).json({ message: 'Category deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete category', detail: err.message });
        }
    });

    // -------------------
    // GET totals by category for a budget
    router.get('/totals/:budget_id', async (req, res) => {
        try {
            const budget_id = Number(req.params.budget_id);
            if (!budget_id) return res.status(400).json({ error: 'Invalid budget_id' });

            const sql = `
                SELECT c.category_id, c.name, c.type, SUM(l.amount) AS total
                FROM transaction_lines l
                JOIN categories c ON l.category_id = c.category_id
                JOIN transactions t ON t.transaction_id = l.transaction_id
                WHERE c.budget_id = ?
                GROUP BY c.category_id
                ORDER BY total DESC
            `;
            const rows = await db.all(sql, [budget_id]);

            res.status(200).json({ data: rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch totals by category', detail: err.message });
        }
    });

    return router;
};
