const express = require('express');


module.exports = (db) => {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.username || !payload.email || payload.password_hash) {
        return res.status(400).json({ error: 'Missing required fields: name, email and password' });
      }

      const newItem = createItem ? await createItem(payload) : payload;
      res.status(201).json({ message: 'Item created', data: newItem });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create item', detail: err.message });
    }
  });

  return router;
}