const path = require('path');
const Database = require('better-sqlite3');

// -----------------------------------
// TABLES to include (everything except charts)
const TABLES = [
    'users',
    'budgets',
    'settings',
    'accounts',
    'categories',
    'payees',
    'tags',
    'incomes',
    'transactions',
    'transaction_lines',
    'transaction_tags',
    'chart_configs',
    'recalc_requests',
];

// -----------------------------------
// Export: Copy user’s related rows into a temp .sqlite file
function getAllUserInfo(userId) {
    // Create export DB
    const exportPath = path.join(__dirname, `../exports/user_${userId}_${Date.now()}.sqlite`);
    const exportDb = new Database(exportPath);
    exportDb.pragma('foreign_keys = ON');

    // Rebuild schema (excluding charts)
    const schemaSql = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name IN (${TABLES.map(() => '?').join(',')})
    `).all(...TABLES).map(r => r.sql).filter(Boolean).join(';\n');
    exportDb.exec(schemaSql);

    // Also copy indexes & triggers for included tables
    const extrasSql = db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type IN ('index','trigger') 
        AND tbl_name IN (${TABLES.map(() => '?').join(',')})
    `).all(...TABLES).map(r => r.sql).filter(Boolean).join(';\n');
    if (extrasSql) exportDb.exec(extrasSql);

    // Extract user-scoped data
    const userBudgets = db.prepare(`SELECT budget_id FROM budgets WHERE user_id = ?`).all(userId);
    const budgetIds = userBudgets.map(b => b.budget_id);
    const insertMany = exportDb.transaction((rows, table) => {
        if (!rows.length) return;
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(',');
        const stmt = exportDb.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
        for (const row of rows) stmt.run(Object.values(row));
    });

    // USERS
    const userRow = db.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId);
    if (userRow) insertMany([userRow], 'users');

    // BUDGETS
    const budgets = db.prepare(`SELECT * FROM budgets WHERE user_id = ?`).all(userId);
    insertMany(budgets, 'budgets');

    // SETTINGS
    const settings = db.prepare(`SELECT * FROM settings WHERE user_id = ?`).all(userId);
    insertMany(settings, 'settings');

    // For each budget, copy linked tables
    for (const budget of budgetIds) {
        const related = {
            accounts: db.prepare(`SELECT * FROM accounts WHERE budget_id = ?`).all(budget),
            categories: db.prepare(`SELECT * FROM categories WHERE budget_id = ?`).all(budget),
            payees: db.prepare(`SELECT * FROM payees WHERE budget_id = ?`).all(budget),
            tags: db.prepare(`SELECT * FROM tags WHERE budget_id = ?`).all(budget),
            incomes: db.prepare(`SELECT * FROM incomes WHERE budget_id = ?`).all(budget),
            transactions: db.prepare(`SELECT * FROM transactions WHERE budget_id = ?`).all(budget),
            transaction_lines: db.prepare(`
                SELECT l.* FROM transaction_lines l
                JOIN transactions t ON t.transaction_id = l.transaction_id
                WHERE t.budget_id = ?
            `).all(budget),
            transaction_tags: db.prepare(`
                SELECT tt.* FROM transaction_tags tt
                JOIN transactions t ON t.transaction_id = tt.transaction_id
                WHERE t.budget_id = ?
            `).all(budget),
            chart_configs: db.prepare(`SELECT * FROM chart_configs WHERE budget_id = ?`).all(budget),
            recalc_requests: db.prepare(`SELECT * FROM recalc_requests`).all(), // optional
        };

        for (const [table, rows] of Object.entries(related)) insertMany(rows, table);
    }

    exportDb.close();
    return exportPath;
}

    // -----------------------------------
// Import: Replace user’s data with data from uploaded .sqlite file
function importUserInfo(userId, importFilePath) {
    const importDb = new Database(importFilePath, { readonly: true });
    const importTables = importDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name IN (${TABLES.map(() => '?').join(',')})
    `).all(...TABLES).map(r => r.name);

    const transaction = db.transaction(() => {
        // Delete existing user data
        const userBudgetIds = db.prepare(`SELECT budget_id FROM budgets WHERE user_id = ?`).all(userId);
        for (const t of importTables) {
            if (t === 'users') {
                db.prepare(`DELETE FROM users WHERE user_id = ?`).run(userId);
            } else if (t === 'budgets' || t === 'settings') {
                db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
            } else if (t !== 'recalc_requests') {
                for (const b of userBudgetIds)
                    db.prepare(`DELETE FROM ${t} WHERE budget_id = ?`).run(b.budget_id);
            }
        }

        // Re-insert from import DB
        for (const t of importTables) {
            const rows = importDb.prepare(`SELECT * FROM ${t}`).all();
            if (!rows.length) continue;
            const cols = Object.keys(rows[0]);
            const placeholders = cols.map(() => '?').join(',');
            const stmt = db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`);

            for (const r of rows) {
                // Overwrite user_id where applicable
                if ('user_id' in r) r.user_id = userId;
                stmt.run(Object.values(r));
            }
        }
    });

    transaction();
    importDb.close();
}

module.exports = { importUserInfo, getAllUserInfo};