const express = require('express');
const { getUserSettings, updateUserSettings } = require('../db.js');
const { requireAuth } = require('../auth.js');


module.exports = (db) => {
    const router = express.Router();

    // GET all settings
    router.get('/', requireAuth, (req, res) => {
    try {
        const settings = getUserSettings(db, req.user.id);
        return res.json({ settings });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to get settings' });
    }
    });

    // POST update settings
    router.post('/', requireAuth, express.json(), (req, res) => {
    try {
        if (typeof req.body !== 'object' || req.body === null) {
            return res.status(400).json({ error: 'Invalid payload; expected JSON object' });
        }
        
        const currentSettings = getUserSettings(db, req.user.id);
        const updatedSettings = { ...currentSettings, ...req.body };
        updateUserSettings(db, req.user.id, updatedSettings);
        return res.json({ ok: true, settings: updatedSettings });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save settings' });
    }
    });

    return router;
};
