import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getShoppingList, getShoppingChecks, saveShoppingChecks } from '../utils/planning.js';

const router = Router();
router.use(requireAuth);

router.get('/shopping-list', async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) requis' });
  }
  res.json(await getShoppingList(req.userId, weekStart));
});

router.get('/shopping-checks', async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) requis' });
  }
  res.json(await getShoppingChecks(req.userId, weekStart));
});

router.put('/shopping-checks', async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) requis' });
  }
  const { checked } = req.body || {};
  if (typeof checked !== 'object' || checked === null || Array.isArray(checked)) {
    return res.status(400).json({ error: 'checked (objet) requis' });
  }
  await saveShoppingChecks(req.userId, weekStart, checked);
  res.status(204).end();
});

export default router;
