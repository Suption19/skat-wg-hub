const express = require('express');

const {
  listTaskTypes,
  getTaskTypeById,
  createTaskType,
  updateTaskType,
  patchTaskType,
  deleteTaskType,
} = require('../services/taskTypeService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await listTaskTypes();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await getTaskTypeById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ error: 'Aufgabentyp nicht gefunden' });
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await createTaskType(req.body);
    res.status(201).json(item);
  } catch (error) {
    if (error.message.includes('erforderlich') || error.message.includes('muss')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const exists = await getTaskTypeById(Number(req.params.id));
    if (!exists) {
      return res.status(404).json({ error: 'Aufgabentyp nicht gefunden' });
    }

    const item = await updateTaskType(Number(req.params.id), req.body);
    res.json(item);
  } catch (error) {
    if (error.message.includes('erforderlich') || error.message.includes('muss')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const item = await patchTaskType(Number(req.params.id), req.body);
    if (!item) {
      return res.status(404).json({ error: 'Aufgabentyp nicht gefunden' });
    }
    res.json(item);
  } catch (error) {
    if (error.message.includes('erforderlich') || error.message.includes('muss')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await deleteTaskType(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ error: 'Aufgabentyp nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

