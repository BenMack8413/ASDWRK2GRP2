const express = require('express');
const createTransactionsRouter = require('./transactions');
const createUserRouter = require('./user');
const createIncomeRouter = require('./income');
const createSimpleIncomeRouter = require('./incomes_simple');
const createSavingGoalsRouter = require('./savingGoals');
const createUpcomingPaymentsRouter = require('./upcomingPayments');

// const sampleApiRouter = require('./sampleapi');

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/user', createUserRouter(db));
    router.use('/income', createIncomeRouter(db));
    router.use('/incomes', createSimpleIncomeRouter());
    router.use('/saving-goals', createSavingGoalsRouter(db));
    router.use('/upcoming-payments', createUpcomingPaymentsRouter(db));

    // router.use('/sampleApiRouter', sampleApiRouter(db));

    return router;
};
