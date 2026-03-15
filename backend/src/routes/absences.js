const express = require('express');

const {
  listAbsences,
  getAbsenceById,
  createAbsence,
  updateAbsence,
  patchAbsence,
  deleteAbsence,
} = require('../services/absenceService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const absences = await listAbsences();
    res.json({ items: absences });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const absence = await getAbsenceById(Number(req.params.id));
    if (!absence) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    res.json(absence);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const absence = await createAbsence(req.body);
    res.status(201).json(absence);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getAbsenceById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }

    const absence = await updateAbsence(Number(req.params.id), req.body);
    res.json(absence);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const absence = await patchAbsence(Number(req.params.id), req.body);
    if (!absence) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    res.json(absence);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const absence = await deleteAbsence(Number(req.params.id));
    if (!absence) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

