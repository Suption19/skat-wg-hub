const { getAll, getOne, run } = require('../db');

async function listSettings() {
  const rows = await getAll('SELECT key, value FROM settings');
  return rows.reduce((acc, row) => {
    try {
      acc[row.key] = JSON.parse(row.value);
    } catch {
      acc[row.key] = row.value;
    }
    return acc;
  }, {});
}

async function updateSetting(key, value) {
  const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, valStr]
  );
  return { key, value };
}

module.exports = {
  listSettings,
  updateSetting
};
