const { getAll, getOne, run } = require('../db');

function mapExpensePayload(payload) {
  return {
    resident_id: payload.resident_id ? parseInt(payload.resident_id, 10) : null,
    amount: parseFloat(payload.amount) || 0,
    description: String(payload.description || '').trim(),
    date: String(payload.date || '').trim(),
  };
}

async function listExpenses() {
  return getAll(`
    SELECT
      id, resident_id, amount, description, date, created_at AS createdAt
    FROM expenses
    ORDER BY date DESC, id DESC
  `);
}

async function getExpenseById(id) {
  return getOne('SELECT id, resident_id, amount, description, date, created_at AS createdAt FROM expenses WHERE id = ?', [id]);
}

async function createExpense(payload) {
  const expense = mapExpensePayload(payload);
  if (!expense.resident_id) {
    throw new Error('resident_id is required');
  }
  if (!expense.date) {
    throw new Error('date is required');
  }

  const result = await run(
    'INSERT INTO expenses (resident_id, amount, description, date) VALUES (?, ?, ?, ?)',
    [expense.resident_id, expense.amount, expense.description, expense.date]
  );

  return getExpenseById(result.id);
}

module.exports = {
  listExpenses,
  getExpenseById,
  createExpense
};
