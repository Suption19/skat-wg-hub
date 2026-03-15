const express = require('express');

const {
  getSkatOverview,
  startSkatGame,
  addSkatEntry,
  finishSkatGame,
  deleteSkatGame,
} = require('../services/skatService');

const router = express.Router();

router.get('/overview', async (req, res, next) => {
  try {
    const result = await getSkatOverview();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/games', async (req, res, next) => {
  try {
    const game = await startSkatGame();
    res.status(201).json(game);
  } catch (error) {
    next(error);
  }
});

router.post('/games/:id/entries', async (req, res, next) => {
  try {
    const entry = await addSkatEntry(Number(req.params.id), req.body);
    res.status(201).json(entry);
  } catch (error) {
    if (
      error.message.includes('erforderlich') ||
      error.message.includes('nicht gefunden') ||
      error.message.includes('aktive Spiele') ||
      error.message.includes('ganze Zahl')
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/games/:id/finish', async (req, res, next) => {
  try {
    const game = await finishSkatGame(Number(req.params.id));
    if (!game) {
      return res.status(404).json({ error: 'Skat-Spiel nicht gefunden' });
    }
    res.json(game);
  } catch (error) {
    next(error);
  }
});

router.delete('/games/:id', async (req, res, next) => {
  try {
    const deleted = await deleteSkatGame(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Skat-Spiel nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

