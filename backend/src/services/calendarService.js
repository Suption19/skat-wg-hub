const { getAll, getOne, run } = require('../db');

const ALLOWED_EVENT_CATEGORIES = new Set(['termin', 'muell', 'geburtstag']);

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, amount) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

function daysBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

function normalizeYear(yearInput) {
  const fallback = new Date().getUTCFullYear();
  const parsed = Number(String(yearInput || '').trim());
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
    return String(fallback);
  }
  return String(parsed);
}

function mapCalendarItem(item) {
  return {
    id: item.id,
    date: item.date,
    category: item.category,
    tag: item.category,
    title: item.title,
    note: item.note || null,
    sourceEventId: item.sourceEventId || null,
    canDeleteOccurrence: Boolean(item.canDeleteOccurrence),
  };
}

function mapCalendarEventPayload(payload = {}) {
  const duration = payload.durationDays ? Number(payload.durationDays) : 1;
  return {
    date: String(payload.date || '').trim(),
    category: String(payload.category || 'termin').trim().toLowerCase(),
    title: String(payload.title || '').trim(),
    description: payload.description ? String(payload.description).trim() : null,
    durationDays: Number.isInteger(duration) ? Math.max(1, Math.min(duration, 60)) : 1,
  };
}

async function createCalendarEvent(payload) {
  const event = mapCalendarEventPayload(payload);
  if (!event.date) {
    throw new Error('date ist erforderlich');
  }
  if (!event.title) {
    throw new Error('title ist erforderlich');
  }
  if (!ALLOWED_EVENT_CATEGORIES.has(event.category)) {
    throw new Error('category muss termin, muell oder geburtstag sein');
  }

  const result = await run(
    `
      INSERT INTO calendar_events (date, category, title, description, duration_days)
      VALUES (?, ?, ?, ?, ?)
    `,
    [event.date, event.category, event.title, event.description, event.durationDays]
  );

  const created = await getOne(
    `
      SELECT id, date, category, title, description, duration_days AS durationDays
      FROM calendar_events
      WHERE id = ?
    `,
    [result.id]
  );

  return {
    id: created.id,
    date: created.date,
    category: created.category,
    title: created.title,
    description: created.description,
    durationDays: created.durationDays,
  };
}

async function deleteCalendarEventOccurrence(eventId, occurrenceDateInput) {
  const occurrenceDate = String(occurrenceDateInput || '').trim();
  if (!occurrenceDate) {
    throw new Error('date ist erforderlich');
  }

  const event = await getOne(
    `
      SELECT
        id,
        date,
        category,
        title,
        description,
        duration_days AS durationDays
      FROM calendar_events
      WHERE id = ?
    `,
    [eventId]
  );

  if (!event) {
    return null;
  }

  const durationDays = Number.isInteger(event.durationDays) ? event.durationDays : 1;
  const eventStart = event.date;
  const eventEnd = addDays(eventStart, Math.max(1, durationDays) - 1);

  if (occurrenceDate < eventStart || occurrenceDate > eventEnd) {
    return null;
  }

  if (durationDays <= 1) {
    await run('DELETE FROM calendar_events WHERE id = ?', [eventId]);
    return { deleted: true };
  }

  if (occurrenceDate === eventStart) {
    await run('UPDATE calendar_events SET date = ?, duration_days = ? WHERE id = ?', [
      addDays(eventStart, 1),
      durationDays - 1,
      eventId,
    ]);
    return { deleted: true };
  }

  if (occurrenceDate === eventEnd) {
    await run('UPDATE calendar_events SET duration_days = ? WHERE id = ?', [
      durationDays - 1,
      eventId,
    ]);
    return { deleted: true };
  }

  const beforeDuration = daysBetween(eventStart, occurrenceDate);
  const afterStart = addDays(occurrenceDate, 1);
  const afterDuration = daysBetween(afterStart, eventEnd) + 1;

  await run('UPDATE calendar_events SET duration_days = ? WHERE id = ?', [
    beforeDuration,
    eventId,
  ]);

  await run(
    `
      INSERT INTO calendar_events (date, category, title, description, duration_days)
      VALUES (?, ?, ?, ?, ?)
    `,
    [afterStart, event.category, event.title, event.description, afterDuration]
  );

  return { deleted: true };
}

async function listCalendarEvents(yearInput) {
  const year = normalizeYear(yearInput);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [wasteItems, rawCustomEvents, absences] = await Promise.all([
    getAll(
      `
        SELECT id, date, type, note
        FROM waste_dates
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC, id ASC
      `,
      [yearStart, yearEnd]
    ),
    getAll(
      `
        SELECT
          id,
          date,
          category,
          title,
          description,
          duration_days AS durationDays
        FROM calendar_events
        WHERE date <= ?
          AND date(date, '+' || (duration_days - 1) || ' day') >= ?
        ORDER BY date ASC, id ASC
      `,
      [yearEnd, yearStart]
    ),
    getAll(
      `
        SELECT
          absences.id,
          absences.start_date AS startDate,
          absences.end_date AS endDate,
          absences.note,
          COALESCE(residents.name, absences.person, 'Bewohner') AS residentName
        FROM absences
        LEFT JOIN residents ON residents.id = absences.resident_id
        WHERE absences.end_date >= ?
          AND absences.start_date <= ?
        ORDER BY absences.start_date ASC, absences.id ASC
      `,
      [yearStart, yearEnd]
    ),
  ]);

  const items = [];

  for (const item of wasteItems) {
    items.push(
      mapCalendarItem({
        id: `waste-${item.id}`,
        date: item.date,
        category: 'muell',
        title: item.type,
        note: item.note,
      })
    );
  }

  for (const event of rawCustomEvents) {
    const durationDays = Number.isInteger(event.durationDays) ? event.durationDays : 1;
    for (let offset = 0; offset < Math.max(1, durationDays); offset += 1) {
      const occurrenceDate = addDays(event.date, offset);
      if (occurrenceDate < yearStart || occurrenceDate > yearEnd) {
        continue;
      }

      items.push(
        mapCalendarItem({
          id: `event-${event.id}-${occurrenceDate}`,
          date: occurrenceDate,
          category: event.category,
          title: event.title,
          note: event.description,
          sourceEventId: event.id,
          canDeleteOccurrence: true,
        })
      );
    }
  }

  for (const absence of absences) {
    let cursor = absence.startDate < yearStart ? yearStart : absence.startDate;
    const endDate = absence.endDate > yearEnd ? yearEnd : absence.endDate;

    while (cursor <= endDate) {
      items.push(
        mapCalendarItem({
          id: `absence-${absence.id}-${cursor}`,
          date: cursor,
          category: 'abwesenheit',
          title: `${absence.residentName} abwesend`,
          note: absence.note,
        })
      );

      cursor = addDays(cursor, 1);
    }
  }

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return String(a.title).localeCompare(String(b.title));
  });

  return { year, items };
}

module.exports = {
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEventOccurrence,
};

