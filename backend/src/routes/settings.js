const express = require('express');
const { listSettings, updateSetting } = require('../services/settingService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const settings = await listSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.get('/:key', async (req, res, next) => {
  try {
    const settings = await listSettings();
    if (settings[req.params.key] !== undefined) {
      res.json({ [req.params.key]: settings[req.params.key] });
    } else {
      res.json({ [req.params.key]: [] });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required' });
    }
    const updated = await updateSetting(key, value);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;