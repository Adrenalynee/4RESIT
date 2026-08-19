import { Router } from 'express';
import { DIFFICULTY_LEVELS } from '../utils/difficulty.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(DIFFICULTY_LEVELS);
});

export default router;
