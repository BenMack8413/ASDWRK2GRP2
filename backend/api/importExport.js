const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { getAllUserInfo, importUserInfo } = require('../helpers/userData');
const { requireAuth } = require('../auth.js');

module.exports = (db) => {
    const router = express.Router();

    // -----------------------
    // GET /api/userData/export
    router.get('/export', requireAuth, (req, res) => {
        try {
            const user_id = req.user.id;
            const exportPath = getAllUserInfo(db, user_id);
            res.download(exportPath, path.basename(exportPath), (err) => {
                if (err) console.error(err);
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Failed to export user data',
                detail: err.message,
            });
        }
    });

    // -----------------------
    // POST /api/userData/import
    router.post('/import', requireAuth, async (req, res) => {
        try {
            const user_id = req.user.id;
            if (!req.files || !req.files.file)
                return res.status(400).json({ error: 'No file uploaded' });

            const uploadedFile = req.files.file;
            const importPath = path.join(__dirname, '../imports', `user_${user_id}.sqlite`);
            await uploadedFile.mv(importPath);

            importUserInfo(db, user_id, importPath);
            res.json({ message: 'User data imported and overwritten successfully.' });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Failed to import user data',
                detail: err.message,
            });
        }
    });

    return router;
};
