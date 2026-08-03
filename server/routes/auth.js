import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../utils/users.js';

const router = Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;

  let userId;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, email, passwordHash, avatarUrl],
    );
    userId = rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }
    throw err;
  }
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);

  const user = await getUserById(userId);
  res.status(201).json({ user, token: signToken(userId) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  const account = rows[0];
  if (!account || !account.password_hash) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const valid = await bcrypt.compare(password, account.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const user = await getUserById(account.id);
  res.json({ user, token: signToken(account.id) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json({ user });
});

export default router;
