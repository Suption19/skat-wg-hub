const { getAll, getOne, run } = require('../db');

function mapShoppingItemPayload(payload = {}) {
  return {
    text: String(payload.text || '').trim(),
  };
}

async function listShoppingItems() {
  const rows = await getAll(
    `
      SELECT
        id,
        text,
        created_at AS createdAt
      FROM shopping_list_items
      ORDER BY id DESC
    `
  );

  return rows;
}

async function getShoppingItemById(id) {
  return getOne(
    `
      SELECT
        id,
        text,
        created_at AS createdAt
      FROM shopping_list_items
      WHERE id = ?
    `,
    [id]
  );
}

async function createShoppingItem(payload) {
  const item = mapShoppingItemPayload(payload);
  if (!item.text) {
    throw new Error('text ist erforderlich');
  }

  const result = await run(
    `
      INSERT INTO shopping_list_items (text)
      VALUES (?)
    `,
    [item.text]
  );

  return getShoppingItemById(result.id);
}

async function deleteShoppingItem(id) {
  const current = await getShoppingItemById(id);
  if (!current) return null;

  await run('DELETE FROM shopping_list_items WHERE id = ?', [id]);
  return current;
}

module.exports = {
  listShoppingItems,
  createShoppingItem,
  deleteShoppingItem,
};

