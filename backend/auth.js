require('dotenv').config();

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function generateToken(user, rememberMe) {
    return jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '1h' },
    );
}

function verifyToken(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user; // attach decoded payload
        next();
    });
}

module.exports = { generateToken, verifyToken, requireAuth };
