const { getAll, getOne, run } = require('../db');

const ALLOWED_CYCLES = new Set(['once', 'weekly', 'biweekly', 'monthly']);

function parseCsvToIds(csv) {
  if (!csv) return [];
  return csv
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
}

function parseCsvToNames(csv) {
  if (!csv) return [];
  return csv.split(',').map((value) => value.trim()).filter(Boolean);
}

function validateCycleFields(taskType) {
  if (!ALLOWED_CYCLES.has(taskType.cycle)) {
    throw new Error('cycle muss once, weekly, biweekly oder monthly sein');
  }

  if (taskType.cycle === 'once' && !taskType.oneTimeDate) {
    throw new Error('oneTimeDate ist für once erforderlich');
  }

  if (taskType.cycle === 'monthly') {
    const day = Number(taskType.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error('dayOfMonth muss zwischen 1 und 31 liegen');
    }
  }
}

function mapTaskTypePayload(payload = {}) {
  return {
    name: String(payload.name || '').trim(),
    description: payload.description ? String(payload.description).trim() : null,
    cycle: String(payload.cycle || 'weekly').trim(),
    oneTimeDate: payload.oneTimeDate ? String(payload.oneTimeDate).trim() : null,
    dayOfMonth: payload.dayOfMonth ? Number(payload.dayOfMonth) : null,
    isActive: payload.isActive === false ? 0 : 1,
    residentIds: Array.isArray(payload.residentIds)
      ? payload.residentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [],
  };
}

async function getAllResidentIds() {
  const rows = await getAll('SELECT id FROM residents ORDER BY id ASC');
  return rows.map((row) => row.id);
}

async function replaceResidentScope(taskTypeId, residentIds) {
  const effectiveResidentIds = residentIds.length > 0 ? residentIds : await getAllResidentIds();

  await run('DELETE FROM task_type_residents WHERE task_type_id = ?', [taskTypeId]);
  for (const residentId of effectiveResidentIds) {
    await run(
      'INSERT OR IGNORE INTO task_type_residents (task_type_id, resident_id) VALUES (?, ?)',
      [taskTypeId, residentId]
    );
  }
}

async function listTaskTypes() {
  const rows = await getAll(
    `
      SELECT
        tt.id,
        tt.name,
        tt.description,
        tt.cycle,
        tt.one_time_date AS oneTimeDate,
        tt.day_of_month AS dayOfMonth,
        tt.is_active AS isActive,
        tt.created_at AS createdAt,
        GROUP_CONCAT(r.id) AS residentIdsCsv,
        GROUP_CONCAT(r.name) AS residentNamesCsv
      FROM task_types tt
      LEFT JOIN task_type_residents ttr ON ttr.task_type_id = tt.id
      LEFT JOIN residents r ON r.id = ttr.resident_id
      GROUP BY tt.id
      ORDER BY tt.id ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    cycle: row.cycle,
    oneTimeDate: row.oneTimeDate,
    dayOfMonth: row.dayOfMonth,
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    residentIds: parseCsvToIds(row.residentIdsCsv),
    residentNames: parseCsvToNames(row.residentNamesCsv),
  }));
}

async function getTaskTypeById(id) {
  const rows = await listTaskTypes();
  return rows.find((row) => row.id === id) || null;
}

async function createTaskType(payload) {
  const taskType = mapTaskTypePayload(payload);
  if (!taskType.name) {
    throw new Error('name ist erforderlich');
  }
  validateCycleFields(taskType);

  const result = await run(
    `
      INSERT INTO task_types (name, description, cycle, one_time_date, day_of_month, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      taskType.name,
      taskType.description,
      taskType.cycle,
      taskType.cycle === 'once' ? taskType.oneTimeDate : null,
      taskType.cycle === 'monthly' ? taskType.dayOfMonth : null,
      taskType.isActive,
    ]
  );

  await replaceResidentScope(result.id, taskType.residentIds);
  return getTaskTypeById(result.id);
}

async function updateTaskType(id, payload) {
  const taskType = mapTaskTypePayload(payload);
  if (!taskType.name) {
    throw new Error('name ist erforderlich');
  }

  validateCycleFields(taskType);

  await run(
    `
      UPDATE task_types
      SET name = ?, description = ?, cycle = ?, one_time_date = ?, day_of_month = ?, is_active = ?
      WHERE id = ?
    `,
    [
      taskType.name,
      taskType.description,
      taskType.cycle,
      taskType.cycle === 'once' ? taskType.oneTimeDate : null,
      taskType.cycle === 'monthly' ? taskType.dayOfMonth : null,
      taskType.isActive,
      id,
    ]
  );

  await replaceResidentScope(id, taskType.residentIds);
  return getTaskTypeById(id);
}

async function patchTaskType(id, payload) {
  const current = await getTaskTypeById(id);
  if (!current) return null;

  return updateTaskType(id, {
    name: payload.name ?? current.name,
    description: payload.description ?? current.description,
    cycle: payload.cycle ?? current.cycle,
    oneTimeDate: payload.oneTimeDate ?? current.oneTimeDate,
    dayOfMonth: payload.dayOfMonth ?? current.dayOfMonth,
    isActive: payload.isActive ?? current.isActive,
    residentIds: payload.residentIds ?? current.residentIds,
  });
}

async function deleteTaskType(id) {
  const current = await getTaskTypeById(id);
  if (!current) return null;

  await run('DELETE FROM task_types WHERE id = ?', [id]);
  return current;
}

module.exports = {
  listTaskTypes,
  getTaskTypeById,
  createTaskType,
  updateTaskType,
  patchTaskType,
  deleteTaskType,
};


