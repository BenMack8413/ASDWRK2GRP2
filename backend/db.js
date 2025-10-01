const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { error } = require('console');

const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, 'mybudget.db');
const SCHEMA_FILE =
    process.env.SCHEMA_FILE || path.resolve(__dirname, 'schema.sql');
const SKIP_INIT =
    process.env.SKIP_DB_INIT === '1' || process.env.SKIP_DB_INIT === 'true';

const db = new Database(DB_FILE);
db.pragma('foreign_keys = ON');

// Initialize schema if needed
if (!SKIP_INIT) {
    if (!fs.existsSync(SCHEMA_FILE)) {
        console.error('schema.sql not found at', SCHEMA_FILE);
        process.exit(1);
    }
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    try {
        db.exec('BEGIN;');
        db.exec(schemaSql);
        db.exec('COMMIT;');
        db.prepare('INSERT INTO recalc_requests DEFAULT VALUES').run();
        console.log('Database initialized and recalculation enqueued.');
    } catch (err) {
        db.exec('ROLLBACK;');
        console.error('Failed to apply schema:', err);
        process.exit(1);
    }
} else {
    console.log('SKIP_DB_INIT enabled — not applying schema.');
}

// Helper: atomic transaction insertion
const createTransactionAtomic = db.transaction((payload) => {
    const {
        budget_id,
        account_id,
        date,
        notes,
        type,
        lines = [],
        tag_ids = [],
    } = payload;
    const insertTxn = db.prepare(
        `INSERT INTO transactions (budget_id, account_id, date, amount, notes, type)
     VALUES (@budget_id, @account_id, @date, 0, @notes, @type)`,
    );
    const res = insertTxn.run({ budget_id, account_id, date, notes, type });
    const transaction_id = res.lastInsertRowid;

    const insertLine = db.prepare(
        `INSERT INTO transaction_lines (transaction_id, category_id, amount, line_order, note)
     VALUES (@transaction_id, @category_id, @amount, @line_order, @note)`,
    );
    lines.forEach((line, i) => {
        insertLine.run({
            transaction_id,
            category_id: line.category_id || null,
            amount: line.amount,
            line_order: line.line_order ?? i + 1,
            note: line.note || null,
        });
    });

    if (Array.isArray(tag_ids) && tag_ids.length) {
        const insertTag = db.prepare(
            `INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)`,
        );
        tag_ids.forEach((tag_id) => insertTag.run(transaction_id, tag_id));
    }

    return transaction_id;
});

// adds new user to the and returns the user_id
function addUser(db, username, email, passwordHash) {
    if (!username || !email || !passwordHash) {
        throw new Error('Username, email, and passwordHash are required');
    }

    try {
        const statement = db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
    `);
        const info = statement.run(username, email, passwordHash);
        return info.lastInsertRowid; // the new user_id
    } catch (err) {
        // handle unique constraint violations
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('Username or email already exists');
        }
        throw err;
    }
}

function deleteUser(db, id) {
    if (!id) throw new Error('User ID Required');

    const idNum = Number(id);
    if (!Number.isInteger(idNum)) throw new TypeError('Invalid user ID');

    try {
        const statement = db.prepare(`DELETE FROM users WHERE user_id = ?`);
        const info = statement.run(idNum);
        console.log('deleteUser debug:', { id: idNum, changes: info.changes });

        return info.changes > 0; // true if a row was deleted
    } catch (err) {
        console.error(err);
        throw new Error('Something went wrong when deleting user');
    }
}

function getAccountInfo(db, id) {
    if (!id) throw new Error('User ID Required');

    const idNum = Number(id);
    if (!Number.isInteger(idNum)) throw new TypeError('Invalid user ID');

    try {
        const statement = db.prepare(
            `SELECT username, email, date_created FROM users WHERE user_id = ?`,
        );
        const info = statement.get(idNum);

        return info;
    } catch (err) {
        console.error(err);
        throw new Error(
            'Something went wrong when retrieving user information',
        );
    }
}

function getUserSettings(db, id) {
    if (!id) throw new Error('User ID Required');

    const idNum = Number(id);
    if (!Number.isInteger(idNum)) throw new TypeError('Invalid user ID');

    try {
            const statement = db.prepare(
                `SELECT data FROM settings WHERE user_id = ?`,
            );
            const row = statement.get(idNum);

            if (!row) {
                return { settings: null };
            }

            console.log({ settings: JSON.parse(row.data) });
            return { settings: JSON.parse(row.data) };
    } catch (e) {
        console.error(e);
        throw new Error('Something went wrong when retrieving user settings');
    }
}

function updateUserSettings(db, id, settingsObj) {
    if (!id) throw new Error('User ID Required');

    if (typeof settingsObj !== 'object' || settingsObj === null) {
        throw new TypeError('settings must be an object');
    }

    const idNum = Number(id);
    const text = JSON.stringify(settingsObj);
    if (!Number.isInteger(idNum)) throw new TypeError('Invalid user ID');

    try {
        const statement = db.prepare(
            `
            INSERT INTO settings (user_id, data)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                data = excluded.data
            `,
        );
        const info = statement.run(idNum, text);

        return {
            ok: true,
            changes: info.changes,
            lastInsertRowid: info.lastInsertRowid,
        };
    } catch (e) {
        console.error(e);
        throw new Error('Something went wrong when retrieving user settings');
    }
}

module.exports = {
    db,
    createTransactionAtomic,
    addUser,
    deleteUser,
    getAccountInfo,
    getUserSettings,
    updateUserSettings,
};
