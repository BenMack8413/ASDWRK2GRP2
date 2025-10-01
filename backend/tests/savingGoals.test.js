const request = require('supertest');
const express = require('express');
const createSavingGoalsRouter = require('../savingGoals');

// Mock DB
const mockDb = {
  all: (query, params, cb) => cb(null, [{ id: 1, name: 'Test Goal', target_amount: 1000, current_amount: 100 }]),
  run: (query, params, cb) => cb.call({ lastID: 2 }, null)
};

const app = express();
app.use(express.json());
app.use('/api/saving-goals', createSavingGoalsRouter(mockDb));

describe('Saving Goals API', () => {
  it('should return all saving goals', async () => {
    const res = await request(app).get('/api/saving-goals');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should create a new saving goal', async () => {
    const res = await request(app)
      .post('/api/saving-goals')
      .send({ name: 'Vacation', targetAmount: 2000, currentAmount: 0 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Vacation');
  });
});
