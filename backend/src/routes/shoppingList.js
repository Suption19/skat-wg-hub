const express = require('express');

const {
  listShoppingItems,
  createShoppingItem,
  deleteShoppingItem,
} = require('../services/shoppingListService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await listShoppingItems();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await createShoppingItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    if (error.message.includes('erforderlich')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await deleteShoppingItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ error: 'Einkaufslisteneintrag nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

