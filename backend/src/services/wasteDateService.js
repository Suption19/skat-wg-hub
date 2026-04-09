const { getAll, getOne, run } = require('../db');

function mapWasteDatePayload(payload = {}) {
  return {
    type: String(payload.type || '').trim(),
    date: String(payload.date || '').trim(),
    note: payload.note ? String(payload.note).trim() : null,
  };
}

async function listWasteDates() {
  return getAll(
    `
      SELECT id, type, date, note, created_at AS createdAt
      FROM waste_dates
      ORDER BY date ASC, id ASC
    `
  );
}

async function getWasteDateById(id) {
  return getOne(
    `
      SELECT id, type, date, note, created_at AS createdAt
      FROM waste_dates
      WHERE id = ?
    `,
    [id]
  );
}

async function createWasteDate(payload) {
  const wasteDate = mapWasteDatePayload(payload);
  if (!wasteDate.type || !wasteDate.date) {
    throw new Error('type und date sind erforderlich');
  }

  const result = await run(
    'INSERT INTO waste_dates (type, date, note) VALUES (?, ?, ?)',
    [wasteDate.type, wasteDate.date, wasteDate.note]
  );

  return getWasteDateById(result.id);
}

async function updateWasteDate(id, payload) {
  const wasteDate = mapWasteDatePayload(payload);
  if (!wasteDate.type || !wasteDate.date) {
    throw new Error('type und date sind erforderlich');
  }

  await run('UPDATE waste_dates SET type = ?, date = ?, note = ? WHERE id = ?', [
    wasteDate.type,
    wasteDate.date,
    wasteDate.note,
    id,
  ]);

  return getWasteDateById(id);
}

async function patchWasteDate(id, payload) {
  const current = await getWasteDateById(id);
  if (!current) return null;

  return updateWasteDate(id, {
    type: payload.type ?? current.type,
    date: payload.date ?? current.date,
    note: payload.note ?? current.note,
  });
}

async function deleteWasteDate(id) {
  const current = await getWasteDateById(id);
  if (!current) return null;

  await run('DELETE FROM waste_dates WHERE id = ?', [id]);
  return current;
}

async function importIcsData(icsData) {
  const lines = String(icsData).split(/\r?\n/);
  const events = [];
  let currentEvent = null;

  for (let line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.date && currentEvent.type) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('DTSTART')) {
        const match = line.match(/:(\d{4})(\d{2})(\d{2})/);
        if (match) {
          currentEvent.date = `${match[1]}-${match[2]}-${match[3]}`;
        }
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.type = line.substring(8).trim();
      }
    }
  }

  let count = 0;
  for (const event of events) {
    // Check if it already exists to avoid duplicates, or just insert
    // A simple INSERT OR IGNORE won't work without UNIQUE constraint.
    const existing = await getOne(
      'SELECT id FROM waste_dates WHERE date = ? AND type = ?',
      [event.date, event.type]
    );

    if (!existing) {
      await run('INSERT INTO waste_dates (type, date, note) VALUES (?, ?, ?)', [
        event.type,
        event.date,
        null,
      ]);
      count++;
    }
  }
  return count;
}

module.exports = {
  listWasteDates,
  getWasteDateById,
  createWasteDate,
  updateWasteDate,
  patchWasteDate,
  deleteWasteDate,
  importIcsData,
};

