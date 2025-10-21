const express = require('express');
const createTransactionsRouter = require('./transactions');
const createUserRouter = require('./user');
const createIncomeRouter = require('./income');
const createExpenseRouter = require('./expenses');
const createSimpleIncomeRouter = require('./incomes_simple');
const createChartRouter = require('./charts');
const createCategoriesRouter = require('./categories');
// const sampleApiRouter = require('./sampleapi');

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/user', createUserRouter(db));
    router.use('/income', createIncomeRouter(db));
    router.use('/incomes', createSimpleIncomeRouter());
    router.use('/expenses', createExpenseRouter(db));
    router.use('/charts', createChartRouter(db));
    router.use('/categories', createCategoriesRouter(db));

    // router.use('/sampleApiRouter', sampleApiRouter(db));

    return router;
};
