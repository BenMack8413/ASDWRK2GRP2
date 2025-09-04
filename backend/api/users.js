const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db.js');
const { generateToken, requireAuth } = require('../auth.js');

module.exports = (db) => {
    const router = express.Router();

    router.post('/signup', async (req, res) => {
        try {
            const payload = req.body;
            if (!payload.username || !payload.email || payload.password_hash) {
                return res.status(400).json({
                    error: 'Missing required fields: name, email and password',
                });
            }

            const existing = db
                .prepare('SELECT id FROM users WHERE email = ?')
                .get(email);
            if (existing) {
                return res
                    .status(409)
                    .json({ error: 'Email already registered' });
            }

            const hash = await bcrypt.hash(password, 10);

            const userId = addUser
                ? await addUser(db, payload.username, payload.email, hash)
                : payload;
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

    return router;
};
