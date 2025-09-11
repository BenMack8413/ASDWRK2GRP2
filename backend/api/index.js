const express = require('express');
const createTransactionsRouter = require('./transactions');
const createUserRouter = require('./user');
// const sampleApiRouter = require('./sampleapi'); 

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/user', createUserRouter(db));

    // router.use('/sampleApiRouter', sampleApiRouter(db));

    return router;
};
