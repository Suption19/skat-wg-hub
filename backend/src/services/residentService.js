const { getAll, getOne, run } = require('../db');

function mapResidentPayload(payload = {}) {
  return {
    name: String(payload.name || '').trim(),
    email: payload.email ? String(payload.email).trim() : null,
    color: payload.color ? String(payload.color).trim() : null,
  };
}

async function listResidents() {
  return getAll(
    `
      SELECT id, name, email, color, created_at AS createdAt
      FROM residents
      ORDER BY id ASC
    `
  );
}

async function getResidentById(id) {
  return getOne(
    `
      SELECT id, name, email, color, created_at AS createdAt
      FROM residents
      WHERE id = ?
    `,
    [id]
  );
}

async function createResident(payload) {
  const resident = mapResidentPayload(payload);
  if (!resident.name) {
    throw new Error('Name ist erforderlich');
  }

  const existing = await getOne('SELECT id FROM residents WHERE name = ?', [resident.name]);
  if (existing) {
    throw new Error('Ein Bewohner mit diesem Namen existiert bereits');
  }

  const result = await run(
    'INSERT INTO residents (name, email, color) VALUES (?, ?, ?)',
    [resident.name, resident.email, resident.color]
  );
  
  // Create user automatically
  const { createUserForResident } = require('./authService');
  await createUserForResident(result.id, resident.name, false);

  return getResidentById(result.id);
}

async function updateResident(id, payload) {
  const current = await getResidentById(id);
  if (!current) return null;

  const resident = mapResidentPayload(payload);
  if (!resident.name) {
    throw new Error('Name ist erforderlich');
  }

  if (resident.name !== current.name) {
    const existing = await getOne('SELECT id FROM residents WHERE name = ?', [resident.name]);
    if (existing && existing.id !== current.id) {
      throw new Error('Ein Bewohner mit diesem Namen existiert bereits');
    }
  }

  await run(
    'UPDATE residents SET name = ?, email = ?, color = ? WHERE id = ?',
    [resident.name, resident.email, resident.color, id]
  );
  
  // Update linked user if name is changed (optional, but keep simple for now)
  // or user just logs in with old username
  return getResidentById(id);
}

async function patchResident(id, payload) {
  const current = await getResidentById(id);
  if (!current) return null;

  return updateResident(id, {
    name: payload.name ?? current.name,
    email: payload.email ?? current.email,
    color: payload.color ?? current.color,
  });
}

async function deleteResident(id) {
  const current = await getResidentById(id);
  if (!current) return;
  await run('DELETE FROM residents WHERE id = ?', [id]);
}

module.exports = {
  listResidents,
  getResidentById,
  createResident,
  updateResident,
  patchResident,
  deleteResident,
};


