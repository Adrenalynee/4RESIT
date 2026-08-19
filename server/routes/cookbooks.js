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

router.patch('/:id', requireCookbookRole('creator'), async (req, res) => {
  const { name, description } = req.body || {};
  if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Le nom du cookbook est requis' });

  const fields = [];
  const values = [];
  if (name !== undefined) { values.push(name.trim()); fields.push(`name = $${values.length}`); }
  if (description !== undefined) { values.push(description); fields.push(`description = $${values.length}`); }
  if (fields.length > 0) {
    values.push(req.params.id);
    await pool.query(`UPDATE cookbooks SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  }

  const cookbook = await getCookbookDetail(req.params.id);
  res.json(cookbook);
});

router.delete('/:id', requireCookbookRole('creator'), async (req, res) => {
  await pool.query('DELETE FROM cookbooks WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/members', requireCookbookRole('creator'), async (req, res) => {
  const { identifier, role = 'reader' } = req.body || {};
  if (!identifier) return res.status(400).json({ error: 'Email ou pseudo requis' });
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 OR name = $1', [identifier]);
  const invitedUser = rows[0];
  if (!invitedUser) return res.status(404).json({ error: 'Aucun utilisateur avec cet email ou ce pseudo' });

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
