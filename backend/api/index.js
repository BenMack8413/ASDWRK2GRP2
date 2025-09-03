const express = require('express');
const createTransactionsRouter = require('./transactions');
const creareUserRouter = require('./users');

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/users', creareUserRouter(db));

    // you can add more later:
    // router.use('/users', createUsersRouter(db));
    // router.use('/accounts', createAccountsRouter(db));

    return router;
};
