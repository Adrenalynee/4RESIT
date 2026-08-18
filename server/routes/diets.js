import { Router } from 'express';
import { DIETS } from '../utils/diets.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(DIETS);
});

export default router;
