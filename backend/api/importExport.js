const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { getAllUserInfo, importUserInfo } = require('../helpers/userData');
const { requireAuth } = require('../auth.js');

module.exports = (db) => {
    const router = express.Router();

    // -----------------------------------
    router.get('/export', requireAuth, (req, res) => {
          console.log('[EXPORT] route hit, user:', req.user && req.user.id, 'path:', req.path);
        try {
    const userId = req.user.id;
    const filePath = getAllUserInfo(userId); // should return absolute path

    if (!filePath || !fs.existsSync(filePath)) {
      console.error('Export file not found:', filePath);
      return res.status(404).json({ error: 'Export file not found' });
    }

    // Use res.download to set Content-Disposition and stream safely
    const filename = `userdata_${userId}.sqlite`;
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending export file:', err);
        // If headers already sent, you can't send JSON; just log
        if (!res.headersSent) res.status(500).json({ error: 'Failed to download file' });
      } else {
        // Optionally delete exported temp file if you created one
        try { fs.unlinkSync(filePath); } catch(e) { /* ignore */ }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export user data' });
  }
    });

    // -----------------------------------
    // Form field: file
    router.post('/import', requireAuth, (req, res) => {
        try {
            if (!req.files || !req.files.file)
                return res.status(400).json({ error: 'No file uploaded' });

            const userId = req.user.id;
            const importFile = req.files.file;
            const tempPath = path.join(__dirname, '../uploads', importFile.name);
            importFile.mv(tempPath, (err) => {
                if (err) return res.status(500).json({ error: 'File upload failed' });
                try {
                    importUserInfo(userId, tempPath);
                    fs.unlink(tempPath, () => {});
                    res.json({ ok: true, message: 'User data imported successfully' });
                } catch (e) {
                    console.error(e);
                    res.status(500).json({ error: 'Import failed' });
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to import user data' });
        }
    });
    return router;
};
