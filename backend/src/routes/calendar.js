const express = require('express');

const {
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEventOccurrence,
} = require('../services/calendarService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await listCalendarEvents(req.query.year);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/events', async (req, res, next) => {
  try {
    const result = await createCalendarEvent(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('erforderlich') || error.message.includes('muss')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    const result = await deleteCalendarEventOccurrence(Number(req.params.id), req.query.date);
    if (!result) {
      return res.status(404).json({ error: 'Kalendereintrag nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;

