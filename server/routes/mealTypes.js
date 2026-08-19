import { Router } from 'express';
import { MEAL_TYPES } from '../utils/mealTypes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(MEAL_TYPES);
});

export default router;
