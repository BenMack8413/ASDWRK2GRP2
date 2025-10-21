const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAllUserInfo, importUserInfo } = require('../helpers/userData');
const { requireAuth } = require('../auth.js');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../uploads') }); // temporary folder


module.exports = (db) => {
    const router = express.Router();

    // -----------------------------------
    router.get('/export', requireAuth, (req, res) => {
        console.log(
            '[EXPORT] route hit, user:',
            req.user && req.user.id,
            'path:',
            req.path,
        );
        try {
            const userId = req.user.id;
            const filePath = getAllUserInfo(db, userId); // should return absolute path

            if (!filePath || !fs.existsSync(filePath)) {
                console.error('Export file not found:', filePath);
                return res.status(404).json({ error: 'Export file not found' });
            }

            // Use res.download to set Content-Disposition and stream safely
            const filename = `userdata_${userId}.sqlite`;
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="userdata_${userId}.sqlite"`,
            );
            console.log(
                'Sending file:',
                filePath,
                fs.existsSync(filePath) ? 'exists' : 'missing',
            );
             res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to download file' });
            }
        } else {
            // File successfully sent, safe to delete
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
            });
        }
    });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to export user data' });
        }
    });

    // -----------------------------------
    // Form field: file
    router.post(
  '/import',
  requireAuth,
  upload.single('file'), // matches FormData key
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user.id;
      const tempPath = req.file.path; // multer gives us a path

      try {
        importUserInfo(db, userId, tempPath);

        // delete temp file after import
        fs.unlink(tempPath, (err) => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });

        res.json({
          ok: true,
          message: 'User data imported successfully',
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Import failed' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to import user data' });
    }
  }
);
    return router;
};
