const { getAll, getOne, run } = require('../db');

const TASK_SELECT = `
  SELECT
    tasks.id,
    tasks.title,
    tasks.description,
    tasks.status,
    tasks.due_date AS dueDate,
    tasks.resident_id AS residentId,
    COALESCE(residents.name, tasks.assigned_to) AS assignedTo,
    tasks.created_at AS createdAt
  FROM tasks
  LEFT JOIN residents ON residents.id = tasks.resident_id
`;

function mapTaskPayload(payload = {}) {
  return {
    title: String(payload.title || '').trim(),
    description: payload.description ? String(payload.description).trim() : '',
    status: payload.status ? String(payload.status).trim() : 'open',
    dueDate: payload.dueDate ? String(payload.dueDate).trim() : null,
    residentId: payload.residentId ? Number(payload.residentId) : null,
    assignedTo: payload.assignedTo ? String(payload.assignedTo).trim() : null,
  };
}

async function listTasks() {
  return getAll(`${TASK_SELECT} ORDER BY tasks.id ASC`);
}

async function getTaskById(id) {
  return getOne(`${TASK_SELECT} WHERE tasks.id = ?`, [id]);
}

async function createTask(payload) {
  const task = mapTaskPayload(payload);
  if (!task.title) {
    throw new Error('title ist erforderlich');
  }

  const result = await run(
    `
      INSERT INTO tasks (title, description, status, due_date, resident_id, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      task.title,
      task.description || null,
      task.status || 'open',
      task.dueDate,
      task.residentId,
      task.assignedTo,
    ]
  );

  return getTaskById(result.id);
}

async function updateTask(id, payload) {
  const task = mapTaskPayload(payload);
  if (!task.title) {
    throw new Error('title ist erforderlich');
  }

  await run(
    `
      UPDATE tasks
      SET title = ?, description = ?, status = ?, due_date = ?, resident_id = ?, assigned_to = ?
      WHERE id = ?
    `,
    [
      task.title,
      task.description || null,
      task.status || 'open',
      task.dueDate,
      task.residentId,
      task.assignedTo,
      id,
    ]
  );

  return getTaskById(id);
}

async function patchTask(id, payload) {
  const current = await getTaskById(id);
  if (!current) return null;

  return updateTask(id, {
    title: payload.title ?? current.title,
    description: payload.description ?? current.description,
    status: payload.status ?? current.status,
    dueDate: payload.dueDate ?? current.dueDate,
    residentId: payload.residentId ?? current.residentId,
    assignedTo: payload.assignedTo ?? current.assignedTo,
  });
}

async function deleteTask(id) {
  const current = await getTaskById(id);
  if (!current) return null;

  await run('DELETE FROM tasks WHERE id = ?', [id]);
  return current;
}

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
};

