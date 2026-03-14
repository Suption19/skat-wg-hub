const { getAll, getOne, run } = require('../db');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROTATION_EPOCH_MONDAY = '2026-01-05';

function formatIsoDateShort(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.`;
}

function isMuellTask(taskName) {
  return String(taskName || '').toLowerCase().includes('muell rausbringen');
}

function buildWeeklyTaskDetails(taskType, weekWasteDates) {
  if (!isMuellTask(taskType.name)) return null;

  const base = 'Müll aus der Wohnung rausbringen.';
  if (!weekWasteDates || weekWasteDates.length === 0) {
    return base;
  }

  const streetInfo = weekWasteDates
    .map((item) => `${formatIsoDateShort(item.date)} ${item.type}`)
    .join('; ');

  return `${base} Diese Woche auch an die Straße stellen: ${streetInfo}.`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeWeekStart(input) {
  const date = input ? new Date(`${input}T00:00:00Z`) : new Date();
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diffToMonday);
  return toIsoDate(utc);
}

function addDays(isoDate, amount) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

function weekRotationIndex(weekStart) {
  const weekStartDate = new Date(`${weekStart}T00:00:00Z`).getTime();
  const epochDate = new Date(`${ROTATION_EPOCH_MONDAY}T00:00:00Z`).getTime();
  return Math.floor((weekStartDate - epochDate) / (7 * MS_PER_DAY));
}

async function getStatsStartWeek(defaultWeekStart) {
  await run(
    `
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `
  );

  const existing = await getOne('SELECT value FROM app_meta WHERE key = ?', ['statsStartWeek']);
  if (existing && existing.value) {
    return existing.value;
  }

  await run('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', [
    'statsStartWeek',
    defaultWeekStart,
  ]);

  return defaultWeekStart;
}

async function getDueTaskTypes(weekStart) {
  const weekEnd = addDays(weekStart, 6);

  const candidates = await getAll(
    `
      SELECT id, name, cycle, one_time_date AS oneTimeDate, day_of_month AS dayOfMonth
      FROM task_types
      WHERE is_active = 1
      ORDER BY id ASC
    `
  );

  return candidates.filter((taskType) => {
    if (taskType.cycle === 'weekly') return true;
    if (taskType.cycle === 'once') {
      return Boolean(taskType.oneTimeDate) && taskType.oneTimeDate >= weekStart && taskType.oneTimeDate <= weekEnd;
    }

    if (taskType.cycle === 'monthly' && Number.isInteger(taskType.dayOfMonth)) {
      const startDate = new Date(`${weekStart}T00:00:00Z`);
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(startDate);
        date.setUTCDate(startDate.getUTCDate() + offset);
        if (date.getUTCDate() === taskType.dayOfMonth) {
          return true;
        }
      }
    }

    return false;
  });
}

async function getScopedResidentIds(taskTypeId) {
  const rows = await getAll(
    `
      SELECT r.id
      FROM task_type_residents ttr
      JOIN residents r ON r.id = ttr.resident_id
      WHERE ttr.task_type_id = ?
      ORDER BY r.id ASC
    `,
    [taskTypeId]
  );

  if (rows.length > 0) return rows.map((row) => row.id);

  const fallback = await getAll('SELECT id FROM residents ORDER BY id ASC');
  return fallback.map((row) => row.id);
}

async function getFullyUnavailableResidentIds(weekStart, weekEnd) {
  const rows = await getAll(
    `
      SELECT DISTINCT COALESCE(r_by_id.id, r_by_name.id) AS residentId
      FROM absences a
      LEFT JOIN residents r_by_id ON r_by_id.id = a.resident_id
      LEFT JOIN residents r_by_name ON r_by_name.name = a.person
      WHERE a.start_date <= ?
        AND a.end_date >= ?
        AND COALESCE(r_by_id.id, r_by_name.id) IS NOT NULL
    `,
    [weekStart, weekEnd]
  );

  return new Set(rows.map((row) => row.residentId));
}

async function getResidentLoadForWeek(weekStart) {
  const rows = await getAll(
    `
      SELECT resident_id AS residentId, COUNT(*) AS load
      FROM weekly_assignments
      WHERE week_start = ?
        AND resident_id IS NOT NULL
      GROUP BY resident_id
    `,
    [weekStart]
  );

  const loadMap = new Map();
  for (const row of rows) {
    loadMap.set(row.residentId, Number(row.load) || 0);
  }
  return loadMap;
}

function chooseResidentForTask({
  residentIds,
  preferredResidentId,
  unavailableResidentIds,
  residentLoad,
}) {
  const available = residentIds.filter((id) => !unavailableResidentIds.has(id));
  if (available.length === 0) return null;

  if (preferredResidentId && available.includes(preferredResidentId)) {
    return preferredResidentId;
  }

  const minLoad = available.reduce(
    (minimum, residentId) => Math.min(minimum, residentLoad.get(residentId) || 0),
    Number.POSITIVE_INFINITY
  );
  const candidates = new Set(
    available.filter((residentId) => (residentLoad.get(residentId) || 0) === minLoad)
  );

  // Tie-breaker: keep rotation order where possible.
  const preferredIndex = Math.max(0, residentIds.indexOf(preferredResidentId));
  for (let offset = 0; offset < residentIds.length; offset += 1) {
    const next = residentIds[(preferredIndex + offset) % residentIds.length];
    if (candidates.has(next)) {
      return next;
    }
  }

  return available[0];
}

async function ensureWeekAssignments(weekStartInput) {
  const weekStart = normalizeWeekStart(weekStartInput);
  const weekEnd = addDays(weekStart, 6);
  const dueTaskTypes = await getDueTaskTypes(weekStart);
  const rotationBase = weekRotationIndex(weekStart);
  const unavailableResidentIds = await getFullyUnavailableResidentIds(weekStart, weekEnd);
  const residentLoad = await getResidentLoadForWeek(weekStart);
  const weekWasteDates = await getAll(
    `
      SELECT date, type
      FROM waste_dates
      WHERE date BETWEEN ? AND ?
      ORDER BY date ASC, id ASC
    `,
    [weekStart, weekEnd]
  );

  for (let index = 0; index < dueTaskTypes.length; index += 1) {
    const taskType = dueTaskTypes[index];
    const details = buildWeeklyTaskDetails(taskType, weekWasteDates);
    const residentIds = await getScopedResidentIds(taskType.id);
    const preferredResidentId =
      residentIds.length > 0
        ? residentIds[(rotationBase + index) % residentIds.length]
        : null;
    const selectedResidentId = chooseResidentForTask({
      residentIds,
      preferredResidentId,
      unavailableResidentIds,
      residentLoad,
    });

    const exists = await getOne(
      `
        SELECT id, resident_id AS residentId, status
        FROM weekly_assignments
        WHERE week_start = ? AND task_type_id = ?
      `,
      [weekStart, taskType.id]
    );

    if (exists) {
      await run('UPDATE weekly_assignments SET details = ? WHERE id = ?', [
        details,
        exists.id,
      ]);

      const currentResidentId = exists.residentId;
      const shouldReassign =
        exists.status !== 'done' &&
        currentResidentId &&
        unavailableResidentIds.has(currentResidentId) &&
        selectedResidentId &&
        selectedResidentId !== currentResidentId;

      if (shouldReassign) {
        await run('UPDATE weekly_assignments SET resident_id = ? WHERE id = ?', [
          selectedResidentId,
          exists.id,
        ]);
        residentLoad.set(currentResidentId, Math.max(0, (residentLoad.get(currentResidentId) || 0) - 1));
        residentLoad.set(selectedResidentId, (residentLoad.get(selectedResidentId) || 0) + 1);
      }

      continue;
    }

    await run(
      `
        INSERT OR IGNORE INTO weekly_assignments (week_start, task_type_id, resident_id, details, status)
        VALUES (?, ?, ?, ?, 'open')
      `,
      [weekStart, taskType.id, selectedResidentId, details]
    );

    if (selectedResidentId) {
      residentLoad.set(selectedResidentId, (residentLoad.get(selectedResidentId) || 0) + 1);
    }
  }

  return weekStart;
}

async function ensureAssignmentRange(startWeek, endWeek) {
  if (!startWeek || !endWeek || endWeek < startWeek) {
    return;
  }

  let cursor = startWeek;
  while (cursor <= endWeek) {
    await ensureWeekAssignments(cursor);
    cursor = addDays(cursor, 7);
  }
}

async function listWeeklyAssignments(weekStartInput) {
  const weekStart = await ensureWeekAssignments(weekStartInput);

  const rows = await getAll(
    `
      SELECT
        wa.id,
        wa.week_start AS weekStart,
        wa.status,
        wa.details,
        wa.created_at AS createdAt,
        tt.id AS taskTypeId,
        tt.name AS taskName,
        tt.cycle,
        r.id AS residentId,
        r.name AS residentName
      FROM weekly_assignments wa
      JOIN task_types tt ON tt.id = wa.task_type_id
      LEFT JOIN residents r ON r.id = wa.resident_id
      WHERE wa.week_start = ?
      ORDER BY wa.id ASC
    `,
    [weekStart]
  );

  return { weekStart, items: rows };
}

async function patchWeeklyAssignment(id, payload = {}) {
  const nextStatus = payload.status ? String(payload.status).trim() : null;
  if (nextStatus && !['open', 'done'].includes(nextStatus)) {
    throw new Error('status muss open oder done sein');
  }

  if (nextStatus) {
    await run('UPDATE weekly_assignments SET status = ? WHERE id = ?', [nextStatus, id]);
  }

  return getOne(
    `
      SELECT
        wa.id,
        wa.week_start AS weekStart,
        wa.status,
        wa.details,
        wa.created_at AS createdAt,
        tt.id AS taskTypeId,
        tt.name AS taskName,
        tt.cycle,
        r.id AS residentId,
        r.name AS residentName
      FROM weekly_assignments wa
      JOIN task_types tt ON tt.id = wa.task_type_id
      LEFT JOIN residents r ON r.id = wa.resident_id
      WHERE wa.id = ?
    `,
    [id]
  );
}

async function listAllTimeCompletionStats(weekStartInput) {
  const cutoffWeekStart = normalizeWeekStart(weekStartInput);
  const startWeek = await getStatsStartWeek(cutoffWeekStart);

  // Kumulative Statistik: von Einführungswoche bis zur betrachteten Woche.
  await ensureAssignmentRange(startWeek, cutoffWeekStart);

  const rows = await getAll(
    `
      SELECT
        r.id AS residentId,
        r.name AS residentName,
        COUNT(wa.id) AS assigned,
        SUM(CASE WHEN wa.status = 'done' THEN 1 ELSE 0 END) AS done
      FROM residents r
      LEFT JOIN weekly_assignments wa
        ON wa.resident_id = r.id
       AND wa.week_start BETWEEN ? AND ?
      GROUP BY r.id
      ORDER BY r.id ASC
    `,
    [startWeek, cutoffWeekStart]
  );

  return {
    startWeek,
    cutoffWeekStart,
    items: rows.map((row) => ({
      residentId: row.residentId,
      residentName: row.residentName,
      assigned: Number(row.assigned) || 0,
      done: Number(row.done) || 0,
    })),
  };
}

module.exports = {
  normalizeWeekStart,
  ensureWeekAssignments,
  listWeeklyAssignments,
  patchWeeklyAssignment,
  listAllTimeCompletionStats,
};


