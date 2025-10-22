const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { addUser, deleteUser, getAccountInfo } = require('../db.js');
const { generateToken, requireAuth } = require('../auth.js');

module.exports = (db) => {
    const router = express.Router();

    router.post('/signup', async (req, res) => {
        try {
            const { username, email, password_hash } = req.body;
            const password = password_hash;
            if (!username || !email || !password_hash) {
                return res.status(400).json({
                    error: 'Missing required fields: name, email and password',
                });
            }

            const existing = db
                .prepare('SELECT user_id FROM users WHERE email = ?')
                .get(email);
            if (existing) {
                return res
                    .status(409)
                    .json({ error: 'Email already registered' });
            }

            const hash = await bcrypt.hash(password, 10);

            const userId = await addUser(db, username, email, hash);
            res.status(201).json({
                message: 'User registered',
                userId: userId,
            });
        } catch (err) {
            console.error('Register error:', err);
            res.status(500).json({ error: 'Failed to register user' });
        }
    });

    router.post('/login', async (req, res) => {
        try {
            const { email, password, rememberMe } = req.body;

            if (!email || !password) {
                return res
                    .status(400)
                    .json({ error: 'Email and password required' });
            }

            // Fetch user from DB
            const user = db
                .prepare('SELECT * FROM users WHERE email = ?')
                .get(email);

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Compare password with hash
            const validPassword = await bcrypt.compare(
                password,
                user.password_hash,
            );
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Token expiration depends on rememberMe
            const expiresIn = rememberMe ? '30d' : '1h';

            const token = generateToken(user, rememberMe);

            res.json({ message: 'Login successful', token, expiresIn });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.get('/me', requireAuth, (req, res) => {
        res.json({ message: 'Authenticated user', user: req.user });
    });

    router.get('/information/:id', requireAuth, (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: 'Invalid id' });
            }

            const info = getAccountInfo(db, id);

            if (!info) {
                return res
                    .status(404)
                    .json({ error: 'Account info not found' });
            }
            return res.json(info);
        } catch (e) {
            console.error(e);
            res.status(500).json({
                error: 'Failed to retrieve account information',
                detail: e.message,
            });
        }
    });

    router.delete('/delete/:id', requireAuth, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: 'Invalid id' });
            }

            const deleted = deleteUser(db, id);

            if (!deleted) {
                return res.status(404).json({ error: 'Item not found' });
            }
            return res.status(200).json({ message: 'Item deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Failed to delete item',
                detail: err.message,
            });
        }
    });

    return router;
};
