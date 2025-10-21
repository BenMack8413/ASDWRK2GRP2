const request = require('supertest');
const express = require('express');
const createExpensesRouter = require('../expenses');

describe('expenses table', () => {
    beforeAll(() => {
        // ensure table exists
        db.prepare(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT,
                frequency TEXT,
                description TEXT
            )
        `).run();
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

