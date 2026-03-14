const express = require('express');

const {
  listResidents,
  getResidentById,
  createResident,
  updateResident,
  patchResident,
  deleteResident,
} = require('../services/residentService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const residents = await listResidents();
    res.json({ items: residents });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const resident = await getResidentById(Number(req.params.id));
    if (!resident) {
      return res.status(404).json({ error: 'Bewohner nicht gefunden' });
    }
    res.json(resident);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const resident = await createResident(req.body);
    res.status(201).json(resident);
  } catch (error) {
    if (
      error.message.includes('erforderlich') ||
      error.message.includes('festgelegt')
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getResidentById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: 'Bewohner nicht gefunden' });
    }

    const resident = await updateResident(Number(req.params.id), req.body);
    res.json(resident);
  } catch (error) {
    if (
      error.message.includes('erforderlich') ||
      error.message.includes('deaktiviert')
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const resident = await patchResident(Number(req.params.id), req.body);
    if (!resident) {
      return res.status(404).json({ error: 'Bewohner nicht gefunden' });
    }
    res.json(resident);
  } catch (error) {
    if (
      error.message.includes('erforderlich') ||
      error.message.includes('deaktiviert')
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const resident = await deleteResident(Number(req.params.id));
    if (!resident) {
      return res.status(404).json({ error: 'Bewohner nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('nicht gelöscht')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;


