const express = require('express');

const {
  ensureWeekAssignments,
  listWeeklyAssignments,
  patchWeeklyAssignment,
  listAllTimeCompletionStats,
} = require('../services/weeklyAssignmentService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await listWeeklyAssignments(req.query.weekStart);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const weekStart = await ensureWeekAssignments(req.body.weekStart);
    const result = await listWeeklyAssignments(weekStart);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/stats/all-time', async (req, res, next) => {
  try {
    const result = await listAllTimeCompletionStats(req.query.weekStart);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await patchWeeklyAssignment(Number(req.params.id), req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Wochenzuweisung nicht gefunden' });
    }
    res.json(updated);
  } catch (error) {
    if (error.message.includes('muss')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;

