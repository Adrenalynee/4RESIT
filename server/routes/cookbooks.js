import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCookbookRole } from '../middleware/cookbookRole.js';
import { listCookbooksForUser, getCookbookDetail, getMemberRole } from '../utils/cookbooks.js';
import { listMessages } from '../utils/messages.js';

const ASSIGNABLE_ROLES = ['editor', 'reader', 'commenter'];

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const cookbooks = await listCookbooksForUser(req.userId);
  res.json(cookbooks);
});

router.post('/', async (req, res) => {
  const { name, description = '' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Le nom du cookbook est requis' });

  const { rows } = await pool.query(
    'INSERT INTO cookbooks (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
    [name, description, req.userId],
  );
  const cookbookId = rows[0].id;
  await pool.query(
    'INSERT INTO cookbook_members (cookbook_id, user_id, role) VALUES ($1, $2, $3)',
    [cookbookId, req.userId, 'creator'],
  );

  const cookbook = await getCookbookDetail(cookbookId);
  res.status(201).json(cookbook);
});

router.get('/:id', requireCookbookRole(), async (req, res) => {
  const cookbook = await getCookbookDetail(req.params.id);
  if (!cookbook) return res.status(404).json({ error: 'Cookbook introuvable' });
  res.json(cookbook);
});

router.get('/:id/messages', requireCookbookRole(), async (req, res) => {
  res.json(await listMessages(req.params.id));
});

router.post('/:id/members', requireCookbookRole('creator'), async (req, res) => {
  const { email, role = 'reader' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis' });
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const invitedUser = rows[0];
  if (!invitedUser) return res.status(404).json({ error: 'Aucun utilisateur avec cet email' });

  const existingRole = await getMemberRole(req.params.id, invitedUser.id);
  if (existingRole) return res.status(409).json({ error: 'Cet utilisateur est déjà membre' });

  await pool.query(
    'INSERT INTO cookbook_members (cookbook_id, user_id, role) VALUES ($1, $2, $3)',
    [req.params.id, invitedUser.id, role],
  );

  const cookbook = await getCookbookDetail(req.params.id);
  res.status(201).json(cookbook);
});

router.patch('/:id/members/:userId', requireCookbookRole('creator'), async (req, res) => {
  const { role } = req.body || {};
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

  const targetRole = await getMemberRole(req.params.id, req.params.userId);
  if (!targetRole) return res.status(404).json({ error: 'Membre introuvable' });
  if (targetRole === 'creator') return res.status(400).json({ error: 'Le rôle du créateur ne peut pas être modifié' });

  await pool.query(
    'UPDATE cookbook_members SET role = $1 WHERE cookbook_id = $2 AND user_id = $3',
    [role, req.params.id, req.params.userId],
  );

  const cookbook = await getCookbookDetail(req.params.id);
  res.json(cookbook);
});

router.delete('/:id/members/:userId', requireCookbookRole('creator'), async (req, res) => {
  const targetRole = await getMemberRole(req.params.id, req.params.userId);
  if (!targetRole) return res.status(404).json({ error: 'Membre introuvable' });
  if (targetRole === 'creator') return res.status(400).json({ error: 'Le créateur ne peut pas être retiré du cookbook' });

  await pool.query(
    'DELETE FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2',
    [req.params.id, req.params.userId],
  );

  const cookbook = await getCookbookDetail(req.params.id);
  res.json(cookbook);
});

export default router;
