import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../utils/users.js';
import { deleteUploadedFile } from '../utils/uploads.js';

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
  const { diet = '', allergies = [], favoriteCuisine = '', defaultServings = 2 } = req.body || {};

  await pool.query(
    'UPDATE user_preferences SET diet = $1, favorite_cuisine = $2, default_servings = $3 WHERE user_id = $4',
    [diet, favoriteCuisine, defaultServings, req.userId],
  );

  await pool.query('DELETE FROM user_allergies WHERE user_id = $1', [req.userId]);
  if (allergies.length > 0) {
    const values = allergies.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(`INSERT INTO user_allergies (user_id, allergy) VALUES ${values}`, [req.userId, ...allergies]);
  }

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
  if (!hash || !password || !(await bcrypt.compare(password, hash))) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);
  await deleteUploadedFile(rows[0]?.avatar_url);
  res.json({ success: true });
});

export default router;
