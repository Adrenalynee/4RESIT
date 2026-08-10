import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getShoppingList } from '../utils/planning.js';

const router = Router();
router.use(requireAuth);

router.get('/shopping-list', async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) requis' });
  }
  res.json(await getShoppingList(req.userId, weekStart));
});

export default router;
