const express = require('express');

const {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
} = require('../services/taskService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const tasks = await listTasks();
    res.json({ items: tasks });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await getTaskById(Number(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getTaskById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    }

    const task = await updateTask(Number(req.params.id), req.body);
    res.json(task);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await patchTask(Number(req.params.id), req.body);
    if (!task) {
      return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    }
    res.json(task);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await deleteTask(Number(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

