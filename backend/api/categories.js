const express = require('express');

module.exports = function createCategoriesRouter(db) {
    const router = express.Router();

    // GET: all categories for a budget
    router.get('/:budgetId', (req, res) => {
        const { budgetId } = req.params;
        try {
            const categories = db
                .prepare(
                    'SELECT * FROM categories WHERE budget_id = ? ORDER BY name ASC',
                )
                .all(budgetId);
            res.json(categories);
        } catch (err) {
            console.error('Error fetching categories:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // GET: categories by type (income/expense)
    router.get('/:budgetId/type/:type', (req, res) => {
        const { budgetId, type } = req.params;
        try {
            const categories = db
                .prepare(
                    'SELECT * FROM categories WHERE budget_id = ? AND type = ? ORDER BY name ASC',
                )
                .all(budgetId, type);
            res.json(categories);
        } catch (err) {
            console.error('Error fetching categories by type:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // POST: create new category
    router.post('/', (req, res) => {
        const { budgetId, name, type } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        if (!type || !['income', 'expense'].includes(type)) {
            return res
                .status(400)
                .json({ error: 'Type must be either "income" or "expense"' });
        }

        try {
            const result = db
                .prepare(
                    'INSERT INTO categories (budget_id, name, type) VALUES (?, ?, ?)',
                )
                .run(budgetId, name.trim(), type);

            res.json({
                category_id: result.lastInsertRowid,
                budget_id: budgetId,
                name: name.trim(),
                type,
            });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res
                    .status(409)
                    .json({ error: 'Category name already exists' });
            }
            console.error('Error creating category:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // PUT: update category
    router.put('/:categoryId', (req, res) => {
        const { categoryId } = req.params;
        const { name, type } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        if (type && !['income', 'expense'].includes(type)) {
            return res
                .status(400)
                .json({ error: 'Type must be either "income" or "expense"' });
        }

        try {
            const result = db
                .prepare(
                    'UPDATE categories SET name = ?, type = ? WHERE category_id = ?',
                )
                .run(name.trim(), type, categoryId);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json({ success: true, changes: result.changes });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res
                    .status(409)
                    .json({ error: 'Category name already exists' });
            }
            console.error('Error updating category:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE: remove category
    router.delete('/:categoryId', (req, res) => {
        const { categoryId } = req.params;

        try {
            // Check if category is in use
            const inUse = db
                .prepare(
                    'SELECT COUNT(*) as count FROM transaction_lines WHERE category_id = ?',
                )
                .get(categoryId);

            if (inUse.count > 0) {
                return res.status(409).json({
                    error: 'Cannot delete category that is in use by transactions',
                    transactionCount: inUse.count,
                });
            }

            const result = db
                .prepare('DELETE FROM categories WHERE category_id = ?')
                .run(categoryId);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json({ success: true, deleted: result.changes });
        } catch (err) {
            console.error('Error deleting category:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // GET: category usage statistics
    router.get('/:categoryId/stats', (req, res) => {
        const { categoryId } = req.params;

        try {
            const stats = db
                .prepare(
                    `
        SELECT 
          c.category_id,
          c.name,
          c.type,
          COUNT(tl.line_id) as transaction_count,
          COALESCE(SUM(tl.amount), 0) as total_amount
        FROM categories c
        LEFT JOIN transaction_lines tl ON tl.category_id = c.category_id
        WHERE c.category_id = ?
        GROUP BY c.category_id
      `,
                )
                .get(categoryId);

            if (!stats) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json(stats);
        } catch (err) {
            console.error('Error fetching category stats:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
