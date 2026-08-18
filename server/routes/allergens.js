import { Router } from 'express';
import { ALLERGENS } from '../utils/allergens.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(ALLERGENS);
});

export default router;
