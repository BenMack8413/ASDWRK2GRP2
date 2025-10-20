const request = require('supertest');
const express = require('express');
const createUpcomingPaymentsRouter = require('../upcomingPayments');

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock DB
const mockDb = {
    all: (query, params, cb) =>
        cb(null, [
            { id: 1, description: 'Rent', due_date: '2025-10-01', amount: 500 },
        ]),
    run: (query, params, cb) => cb.call({ lastID: 2 }, null),
};

const app = express();
app.use(express.json());
app.use('/api/upcoming-payments', createUpcomingPaymentsRouter(mockDb));

describe('Upcoming Payments API', () => {
    it('should return all upcoming payments', async () => {
        const res = await request(app).get('/api/upcoming-payments');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should create a new upcoming payment', async () => {
        const res = await request(app).post('/api/upcoming-payments').send({
            description: 'Electricity',
            dueDate: '2025-11-01',
            amount: 150,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body.description).toBe('Electricity');
    });
});
