const { getAll, getOne, run } = require('../db');

const ABSENCE_SELECT = `
  SELECT
    absences.id,
    absences.resident_id AS residentId,
    COALESCE(residents.name, absences.person) AS residentName,
    absences.start_date AS startDate,
    absences.end_date AS endDate,
    absences.note,
    absences.created_at AS createdAt
  FROM absences
  LEFT JOIN residents ON residents.id = absences.resident_id
`;

function mapAbsencePayload(payload = {}) {
  return {
    residentId: payload.residentId ? Number(payload.residentId) : null,
    residentName: payload.residentName ? String(payload.residentName).trim() : null,
    startDate: String(payload.startDate || '').trim(),
    endDate: String(payload.endDate || '').trim(),
    note: payload.note ? String(payload.note).trim() : null,
  };
}

async function listAbsences() {
  return getAll(`${ABSENCE_SELECT} ORDER BY absences.start_date ASC, absences.id ASC`);
}

async function getAbsenceById(id) {
  return getOne(`${ABSENCE_SELECT} WHERE absences.id = ?`, [id]);
}

async function createAbsence(payload) {
  const absence = mapAbsencePayload(payload);
  if (!absence.startDate || !absence.endDate) {
    throw new Error('startDate und endDate sind erforderlich');
  }

  const result = await run(
    `
      INSERT INTO absences (resident_id, person, start_date, end_date, note)
      VALUES (?, ?, ?, ?, ?)
    `,
    [absence.residentId, absence.residentName, absence.startDate, absence.endDate, absence.note]
  );

  return getAbsenceById(result.id);
}

async function updateAbsence(id, payload) {
  const absence = mapAbsencePayload(payload);
  if (!absence.startDate || !absence.endDate) {
    throw new Error('startDate und endDate sind erforderlich');
  }

  await run(
    `
      UPDATE absences
      SET resident_id = ?, person = ?, start_date = ?, end_date = ?, note = ?
      WHERE id = ?
    `,
    [absence.residentId, absence.residentName, absence.startDate, absence.endDate, absence.note, id]
  );

  return getAbsenceById(id);
}

async function patchAbsence(id, payload) {
  const current = await getAbsenceById(id);
  if (!current) return null;

  return updateAbsence(id, {
    residentId: payload.residentId ?? current.residentId,
    residentName: payload.residentName ?? current.residentName,
    startDate: payload.startDate ?? current.startDate,
    endDate: payload.endDate ?? current.endDate,
    note: payload.note ?? current.note,
  });
}

async function deleteAbsence(id) {
  const current = await getAbsenceById(id);
  if (!current) return null;

  await run('DELETE FROM absences WHERE id = ?', [id]);
  return current;
}

module.exports = {
  listAbsences,
  getAbsenceById,
  createAbsence,
  updateAbsence,
  patchAbsence,
  deleteAbsence,
};

