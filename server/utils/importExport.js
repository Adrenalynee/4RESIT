import { pool } from '../db.js';
import { listCookbooksForUser, getCookbookDetail } from './cookbooks.js';
import { findRecipeIds, shapeRecipes, createRecipe, toggleFavorite } from './recipes.js';

export async function gatherExportData(userId) {
  const summaries = await listCookbooksForUser(userId);
  const cookbooks = await Promise.all(summaries.map((cb) => getCookbookDetail(cb.id)));

  const recipeIds = await findRecipeIds(userId, {});
  const recipes = await shapeRecipes(recipeIds, { includeComments: true });

  return { exportedAt: new Date().toISOString(), cookbooks, recipes };
}

export async function applyImport(userId, payload) {
  const idMap = {};
  let cookbooksImported = 0;
  let recipesImported = 0;

  for (const cb of payload.cookbooks || []) {
    const { rows } = await pool.query(
      'INSERT INTO cookbooks (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
      [cb.name || 'Cookbook importé', cb.description || '', userId],
    );
    const newId = rows[0].id;
    await pool.query('INSERT INTO cookbook_members (cookbook_id, user_id, role) VALUES ($1, $2, $3)', [newId, userId, 'creator']);
    idMap[cb.id] = newId;
    cookbooksImported++;
  }

  for (const r of payload.recipes || []) {
    const cookbookId = r.cookbookId ? idMap[r.cookbookId] || null : null;
    const recipeId = await createRecipe(userId, {
      title: r.title || 'Recette sans titre',
      cookbookId,
      image: r.image,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      servings: r.servings,
      source: r.source,
      tags: r.tags || [],
      ingredients: r.ingredients || [],
      steps: r.steps || [],
    });
    if (r.favorite) await toggleFavorite(recipeId);
    recipesImported++;
  }

  return { cookbooksImported, recipesImported };
}
