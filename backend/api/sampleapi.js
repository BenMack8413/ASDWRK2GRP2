const express = require('express');

/*
  example helper function
  const { list of functions comma sepparated } = require('pathToFile');
  e.g. const { createTransactionAtomic, getTransactionId, etc } = require('../db');
*/

/*
    RELEVANT RETURN STATUS CODES
    200 OK                      Generic success	Returned                when a GET request succeeds or an update/delete is successful.
    201 Created                 Resource created                        Returned after successfully creating a resource (POST).
    202 Accepted	            Accepted for processing	                Server accepted request but hasn’t processed it yet (async processing).
    204 No Content	            Success but no response body	        Often used after DELETE or successful PUT/PATCH with nothing to return.

    400 Bad Request	            Request is malformed	                Missing required parameters, invalid JSON, invalid query.
    401 Unauthorized	        Authentication required	                Client must authenticate.
    403 Forbidden	            Authenticated but forbidden	            User lacks permission.
    404 Not Found	            Resource not found	                    Endpoint or item does not exist.
    405 Method Not Allowed	    Wrong HTTP method	                    e.g., POST on a GET-only endpoint.
    409 Conflict	            Conflict with current state	            Duplicate entry, version conflict.
    422 Unprocessable Entity	Valid request syntax, semantic error    Validation failed for provided data.

    500 Internal Server Error	Generic server error	                Uncaught exception in your code or DB failure.
    501 Not Implemented	        Feature not supported	                Endpoint exists but method not implemented.
    503 Service Unavailable	    Server temporarily unavailable	        Maintenance or overload.

*/

module.exports = (db, /* list of helper functions used { createTransactionAtomic, getTransactionId, etc } note: remove comma if no extra functions*/) => {
  const router = express.Router();

  // -------------------
  // GET all items for a specific budget
  // Example: GET /api/items?budget_id=1
  router.get('/', async (req, res) => {
    try {
      const budget_id = Number(req.query.budget_id);
      if (!budget_id) return res.status(400).json({ error: 'budget_id query parameter is required' });

      const items = getItems ? await getItems(budget_id) : [];
      res.status(200).json({ data: items });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error', detail: err.message });
    }
  });

  // -------------------
  // GET single item by ID
  // Example: GET /api/items/123
  router.get('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid item id' });

      const item = getItemById ? await getItemById(id) : null;
      if (!item) return res.status(404).json({ error: 'Item not found' });

      res.status(200).json({ data: item });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error', detail: err.message });
    }
  });

  // -------------------
  // POST new item
  router.post('/', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.name || !payload.budget_id) {
        return res.status(400).json({ error: 'Missing required fields: name, budget_id' });
      }

      const newItem = createItem ? await createItem(payload) : payload;
      res.status(201).json({ message: 'Item created', data: newItem });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create item', detail: err.message });
    }
  });

  // -------------------
  // PUT full update of item
  router.put('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;
      if (!id || !payload) return res.status(400).json({ error: 'Invalid id or payload' });

      const updated = updateItem ? await updateItem(id, payload) : payload;
      res.status(200).json({ message: 'Item updated', data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update item', detail: err.message });
    }
  });

  // -------------------
  // PATCH partial update
  router.patch('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;
      if (!id || !payload) return res.status(400).json({ error: 'Invalid id or payload' });

      const patched = updateItem ? await updateItem(id, payload, { partial: true }) : payload;
      res.status(200).json({ message: 'Item partially updated', data: patched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to patch item', detail: err.message });
    }
  });

  // -------------------
  // DELETE item
  router.delete('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });

      const deleted = deleteItem ? await deleteItem(id) : true;
      if (!deleted) return res.status(404).json({ error: 'Item not found' });

      res.status(200).json({ message: 'Item deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete item', detail: err.message });
    }
  });

  return router;
}