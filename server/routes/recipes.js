import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRecipeAccess } from '../middleware/recipeAccess.js';
import { getMemberRole } from '../utils/cookbooks.js';
import {
  findRecipeIds,
  shapeRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  addPlannedDate,
  removePlannedDate,
} from '../utils/recipes.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { query, cookbookId, ingredient, favoriteOnly, maxPrepTime, maxCookTime } = req.query;
  const tags = req.query.tags ? [].concat(req.query.tags) : [];

  if (cookbookId) {
    const role = await getMemberRole(cookbookId, req.userId);
    if (!role) return res.status(403).json({ error: "Vous n'êtes pas membre de ce cookbook" });
  }

  const ids = await findRecipeIds(req.userId, {
    query,
    cookbookId,
    ingredient,
    tags,
    favoriteOnly: favoriteOnly === 'true',
    maxPrepTime: maxPrepTime ? Number(maxPrepTime) : null,
    maxCookTime: maxCookTime ? Number(maxCookTime) : null,
  });
  res.json(await shapeRecipes(ids));
});

router.post('/', async (req, res) => {
  const { title, cookbookId } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Le titre est requis' });

  if (cookbookId) {
    const role = await getMemberRole(cookbookId, req.userId);
    if (!['creator', 'editor'].includes(role)) {
      return res.status(403).json({ error: "Vous n'avez pas les droits pour ajouter une recette à ce cookbook" });
    }
  }

  const recipeId = await createRecipe(req.userId, req.body);
  const [recipe] = await shapeRecipes([recipeId]);
  res.status(201).json(recipe);
});

router.get('/:id', requireRecipeAccess('read'), async (req, res) => {
  const [recipe] = await shapeRecipes([req.params.id], { includeComments: true });
  res.json(recipe);
});

router.patch('/:id', requireRecipeAccess('write'), async (req, res) => {
  await updateRecipe(req.params.id, req.body || {});
  const [recipe] = await shapeRecipes([req.params.id]);
  res.json(recipe);
});

router.delete('/:id', requireRecipeAccess('write'), async (req, res) => {
  await deleteRecipe(req.params.id);
  res.json({ success: true });
});

router.post('/:id/toggle-favorite', requireRecipeAccess('read'), async (req, res) => {
  await toggleFavorite(req.params.id);
  const [recipe] = await shapeRecipes([req.params.id]);
  res.json(recipe);
});

router.post('/:id/planned-dates', requireRecipeAccess('read'), async (req, res) => {
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Date requise' });
  await addPlannedDate(req.params.id, date);
  const [recipe] = await shapeRecipes([req.params.id]);
  res.json(recipe);
});

router.delete('/:id/planned-dates/:date', requireRecipeAccess('read'), async (req, res) => {
  await removePlannedDate(req.params.id, req.params.date);
  const [recipe] = await shapeRecipes([req.params.id]);
  res.json(recipe);
});

router.post('/:id/comments', requireRecipeAccess('comment'), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });

  await pool.query('INSERT INTO comments (recipe_id, user_id, text) VALUES ($1, $2, $3)', [req.params.id, req.userId, text.trim()]);
  const [recipe] = await shapeRecipes([req.params.id], { includeComments: true });
  res.status(201).json(recipe);
});

router.patch('/:id/comments/:commentId', requireRecipeAccess('read'), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });

  const { rows } = await pool.query('SELECT user_id FROM comments WHERE id = $1 AND recipe_id = $2', [req.params.commentId, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Commentaire introuvable' });
  if (rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres commentaires' });

  await pool.query('UPDATE comments SET text = $1, edited_at = now() WHERE id = $2', [text.trim(), req.params.commentId]);
  const [recipe] = await shapeRecipes([req.params.id], { includeComments: true });
  res.json(recipe);
});

router.delete('/:id/comments/:commentId', requireRecipeAccess('read'), async (req, res) => {
  const { rows } = await pool.query('SELECT user_id FROM comments WHERE id = $1 AND recipe_id = $2', [req.params.commentId, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Commentaire introuvable' });
  if (rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres commentaires' });

  await pool.query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
  const [recipe] = await shapeRecipes([req.params.id], { includeComments: true });
  res.json(recipe);
});

export default router;
