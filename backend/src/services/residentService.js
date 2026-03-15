const { getAll, getOne, run } = require('../db');

const FIXED_NAMES = new Set(['Tomasz', 'Finn', 'Nele', 'Leila']);

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
  throw new Error('Bewohner sind in diesem Stand auf Tomasz, Finn, Nele und Leila festgelegt');
}

async function updateResident(id, payload) {
  const current = await getResidentById(id);
  if (!current) return null;

  const resident = mapResidentPayload(payload);
  if (!resident.name || !FIXED_NAMES.has(resident.name)) {
    throw new Error('name ist erforderlich');
  }

  if (resident.name !== current.name) {
    throw new Error('Umbenennen von Bewohnern ist aktuell deaktiviert');
  }

  await run(
    'UPDATE residents SET name = ?, email = ?, color = ? WHERE id = ?',
    [resident.name, resident.email, resident.color, id]
  );

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
  throw new Error('Bewohner können in diesem Stand nicht gelöscht werden');
}

module.exports = {
  listResidents,
  getResidentById,
  createResident,
  updateResident,
  patchResident,
  deleteResident,
};


