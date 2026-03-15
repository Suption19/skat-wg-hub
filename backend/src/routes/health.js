const express = require('express');

const { checkDatabaseHealth } = require('../services/healthService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await checkDatabaseHealth();

    res.json({
      status: 'ok',
      service: 'wg-hub-backend',
      time: new Date().toISOString(),
      db,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

