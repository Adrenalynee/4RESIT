import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRecipeAccess } from '../middleware/recipeAccess.js';
import { getMemberRole } from '../utils/cookbooks.js';
import { getUserById } from '../utils/users.js';
import { suggestRecipes } from '../utils/suggestions.js';
import { deleteUploadedFile } from '../utils/uploads.js';
import { scrapeRecipeFromUrl } from '../utils/recipeScraper.js';
import { MEAL_TYPE_VALUES } from '../utils/mealTypes.js';
import { CUISINE_VALUES } from '../utils/cuisines.js';
import { DIET_VALUES } from '../utils/diets.js';
import { DIFFICULTY_VALUES } from '../utils/difficulty.js';
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

const TAG_VALUES = [...MEAL_TYPE_VALUES, ...CUISINE_VALUES, ...DIET_VALUES];

function validateRecipeCategories(body) {
  if (body.tags && body.tags.some((t) => !TAG_VALUES.includes(t))) {
    return 'Une ou plusieurs catégories ne sont pas valides';
  }
  if (body.difficulty && !DIFFICULTY_VALUES.includes(body.difficulty)) {
    return "La difficulté n'est pas valide";
  }
  return null;
}

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

  const categoryError = validateRecipeCategories(req.body || {});
  if (categoryError) return res.status(400).json({ error: categoryError });

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

router.post('/import-url', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL requise' });
  try {
    const draft = await scrapeRecipeFromUrl(url);
    res.json(draft);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erreur lors de la récupération de la recette' });
  }
});

router.get('/suggestions', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 8;
  const user = await getUserById(req.userId);
  const ids = await findRecipeIds(req.userId, {});
  const recipes = await shapeRecipes(ids);
  res.json(suggestRecipes(recipes, user.preferences, limit));
});

router.get('/:id', requireRecipeAccess('read'), async (req, res) => {
  const [recipe] = await shapeRecipes([req.params.id], { includeComments: true });
  res.json(recipe);
});

router.patch('/:id', requireRecipeAccess('write'), async (req, res) => {
  const patch = req.body || {};

  const categoryError = validateRecipeCategories(patch);
  if (categoryError) return res.status(400).json({ error: categoryError });

  if (patch.cookbookId) {
    const role = await getMemberRole(patch.cookbookId, req.userId);
    if (!['creator', 'editor'].includes(role)) {
      return res.status(403).json({ error: "Vous n'avez pas les droits pour déplacer cette recette vers ce cookbook" });
    }
  }

  const { rows } = await pool.query('SELECT image_url FROM recipes WHERE id = $1', [req.params.id]);
  const oldImage = rows[0]?.image_url;

  await updateRecipe(req.params.id, patch);
  if (patch.image !== undefined && patch.image !== oldImage) {
    await deleteUploadedFile(oldImage);
  }

  const [recipe] = await shapeRecipes([req.params.id]);
  res.json(recipe);
});

router.delete('/:id', requireRecipeAccess('write'), async (req, res) => {
  const { rows } = await pool.query('SELECT image_url FROM recipes WHERE id = $1', [req.params.id]);
  await deleteRecipe(req.params.id);
  await deleteUploadedFile(rows[0]?.image_url);
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
