import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../utils/users.js';
import { isPasswordStrong } from '../utils/password.js';
import passport from '../config/passport.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard' },
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Pseudo, email et mot de passe requis' });
  }
  if (!isPasswordStrong(password)) {
    return res.status(400).json({ error: 'Le mot de passe ne respecte pas les critères de sécurité requis' });
  }

  const existing = await pool.query('SELECT email, name FROM users WHERE email = $1 OR name = $2', [email, name]);
  if (existing.rows.some((r) => r.email === email)) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }
  if (existing.rows.some((r) => r.name === name)) {
    return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let userId;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [name, email, passwordHash],
    );
    userId = rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'users_name_key') {
        return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
      }
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }
    throw err;
  }
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);

  const user = await getUserById(userId);
  res.status(201).json({ user, token: signToken(userId) });
});

router.post('/login', authLimiter, async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email (ou pseudo) et mot de passe requis' });
  }

  const { rows } = await pool.query(
    'SELECT id, password_hash FROM users WHERE email = $1 OR name = $1 LIMIT 1',
    [identifier],
  );
  const account = rows[0];
  if (!account || !account.password_hash) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const valid = await bcrypt.compare(password, account.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const user = await getUserById(account.id);
  res.json({ user, token: signToken(account.id) });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`/oauth/callback?token=${signToken(req.user.id)}`);
  },
);

router.get('/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json({ user });
});

export default router;
