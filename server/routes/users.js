import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById, replaceUserSet } from '../utils/users.js';
import { deleteUploadedFile } from '../utils/uploads.js';
import { ALLERGEN_VALUES } from '../utils/allergens.js';
import { DIET_VALUES } from '../utils/diets.js';
import { CUISINE_VALUES } from '../utils/cuisines.js';

const router = Router();
router.use(requireAuth);

router.patch('/me', async (req, res) => {
  const { name, avatar } = req.body || {};
  const fields = [];
  const values = [];
  if (name !== undefined) { values.push(name); fields.push(`name = $${values.length}`); }
  if (avatar !== undefined) { values.push(avatar); fields.push(`avatar_url = $${values.length}`); }

  if (fields.length > 0) {
    const { rows } = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.userId]);
    const oldAvatar = rows[0]?.avatar_url;

    values.push(req.userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);

    if (avatar !== undefined && avatar !== oldAvatar) {
      await deleteUploadedFile(oldAvatar);
    }
  }
  res.json({ user: await getUserById(req.userId) });
});

router.patch('/me/preferences', async (req, res) => {
  const { diets = [], allergies = [], favoriteCuisines = [], defaultServings = 2 } = req.body || {};

  const invalidAllergies = allergies.filter((a) => !ALLERGEN_VALUES.includes(a));
  if (invalidAllergies.length > 0) {
    return res.status(400).json({ error: `Allergène(s) invalide(s) : ${invalidAllergies.join(', ')}` });
  }
  const invalidDiets = diets.filter((d) => !DIET_VALUES.includes(d));
  if (invalidDiets.length > 0) {
    return res.status(400).json({ error: `Régime(s) invalide(s) : ${invalidDiets.join(', ')}` });
  }
  const invalidCuisines = favoriteCuisines.filter((c) => !CUISINE_VALUES.includes(c));
  if (invalidCuisines.length > 0) {
    return res.status(400).json({ error: `Cuisine(s) invalide(s) : ${invalidCuisines.join(', ')}` });
  }

  await pool.query('UPDATE user_preferences SET default_servings = $1 WHERE user_id = $2', [defaultServings, req.userId]);

  await replaceUserSet('user_allergies', 'allergy', req.userId, allergies);
  await replaceUserSet('user_diets', 'diet', req.userId, diets);
  await replaceUserSet('user_cuisines', 'cuisine', req.userId, favoriteCuisines);

  res.json({ user: await getUserById(req.userId) });
});

router.patch('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
  const hash = rows[0]?.password_hash;
  if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);
  res.json({ success: true });
});

router.delete('/me', async (req, res) => {
  const { password } = req.body || {};
  const { rows } = await pool.query('SELECT password_hash, avatar_url FROM users WHERE id = $1', [req.userId]);
  const hash = rows[0]?.password_hash;
  if (hash && !(await bcrypt.compare(password || '', hash))) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);
  await deleteUploadedFile(rows[0]?.avatar_url);
  res.json({ success: true });
});

export default router;
