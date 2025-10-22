const express = require('express');
const createTransactionsRouter = require('./transactions');
const createUserRouter = require('./user');
const createIncomeRouter = require('./income');
const createSimpleIncomeRouter = require('./incomes_simple');
const createChartRouter = require('./charts');
const createCategoriesRouter = require('./categories');
const createImportExportRouter = require('./importExport');
const createSettingsRouter = require('./settings');
// const sampleApiRouter = require('./sampleapi');

module.exports = function createApiRouter(db /*, createTransactionAtomic*/) {
    const router = express.Router();

    // mount feature routers
    router.use('/transactions', createTransactionsRouter(db));
    router.use('/user', createUserRouter(db));
    router.use('/income', createIncomeRouter(db));
    router.use('/incomes', createSimpleIncomeRouter());
    router.use('/charts', createChartRouter(db));
    router.use('/categories', createCategoriesRouter(db));
    router.use('/importExport', createImportExportRouter(db));
    router.use('/settings', createSettingsRouter(db));

    // router.use('/sampleApiRouter', sampleApiRouter(db));

    return router;
};
