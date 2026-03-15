const { getOne } = require('../db');

async function checkDatabaseHealth() {
  const result = await getOne('SELECT 1 as ok');
  return result && result.ok === 1 ? 'ok' : 'error';
}

module.exports = {
  checkDatabaseHealth,
};

