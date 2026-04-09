const express = require('express');
const { listExpenses, createExpense } = require('../services/expenseService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const expenses = await listExpenses();
    res.json(expenses);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const expense = await createExpense(req.body);
    res.status(201).json(expense);
  } catch (err) {
    if (err.message.includes('required')) {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

module.exports = router;
