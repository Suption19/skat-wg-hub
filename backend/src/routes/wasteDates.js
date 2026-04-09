const express = require('express');

const {
  listWasteDates,
  getWasteDateById,
  createWasteDate,
  updateWasteDate,
  patchWasteDate,
  deleteWasteDate,
  importIcsData,
} = require('../services/wasteDateService');

const router = express.Router();

router.post('/import', async (req, res, next) => {
  try {
    const { icsData } = req.body;
    if (!icsData) {
      return res.status(400).json({ error: 'ICS Daten fehlen' });
    }
    const count = await importIcsData(icsData);
    res.json({ message: `${count} Termine importiert.`, count });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const wasteDates = await listWasteDates();
    res.json({ items: wasteDates });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const wasteDate = await getWasteDateById(Number(req.params.id));
    if (!wasteDate) {
      return res.status(404).json({ error: 'Muelltermin nicht gefunden' });
    }
    res.json(wasteDate);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const wasteDate = await createWasteDate(req.body);
    res.status(201).json(wasteDate);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getWasteDateById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: 'Muelltermin nicht gefunden' });
    }

    const wasteDate = await updateWasteDate(Number(req.params.id), req.body);
    res.json(wasteDate);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const wasteDate = await patchWasteDate(Number(req.params.id), req.body);
    if (!wasteDate) {
      return res.status(404).json({ error: 'Muelltermin nicht gefunden' });
    }
    res.json(wasteDate);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const wasteDate = await deleteWasteDate(Number(req.params.id));
    if (!wasteDate) {
      return res.status(404).json({ error: 'Muelltermin nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

