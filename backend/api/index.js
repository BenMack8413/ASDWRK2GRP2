const express = require('express');
const createTransactionsRouter = require('./transactions');
const createUserRouter = require('./users');
const createIncomeRouter = require('./income');
// const sampleApiRouter = require('./sampleapi'); 

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/users', createUserRouter(db));
    router.use('/income', createIncomeRouter(db));

    // router.use('/sampleApiRouter', sampleApiRouter(db));

    return router;
};
