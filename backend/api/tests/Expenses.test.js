const createExpensesRouter = require('../expenses');

describe('expenses table', () => {
    let db;
    beforeAll(() => {
        db = new Database(':memory:');
    
        const schemaPath = path.join(__dirname, '..', 'backend', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
    
        db.prepare(
            `INSERT OR IGNORE INTO accounts (account_id, budget_id, name, currency, balance)
         VALUES (?, ?, ?, ?, ?)`,
        ).run(1, 1, 'Test Account', 'USD', 0);
    });

    afterAll(() => {
        if (db && typeof db.close === 'function') db.close();
    });

    test('can insert and retrieve an expense row', () => {
        const uniqueSource = `test-source-${Date.now()}`;
        const amount = 123.45;
        const date = '2025-10-21';
        const frequency = 'Monthly';
        const description = 'automated test record';

        const insert = db.prepare(
            `INSERT INTO expenses (source, amount, date, frequency, description)
             VALUES (?, ?, ?, ?, ?)`
        );
        const info = insert.run(uniqueSource, amount, date, frequency, description);

        expect(info.lastInsertRowid).toBeGreaterThan(0);

        const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid);
        expect(row).toBeDefined();
        expect(row.source).toBe(uniqueSource);
        expect(Number(row.amount)).toBeCloseTo(amount);
        expect(row.date).toBe(date);
        expect(row.frequency).toBe(frequency);
        expect(row.description).toBe(description);

        // cleanup
        db.prepare('DELETE FROM expenses WHERE id = ?').run(info.lastInsertRowid);
    });
});

