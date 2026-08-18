import { Router } from 'express';
import { CUISINES } from '../utils/cuisines.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(CUISINES);
});

export default router;
