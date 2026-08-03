import { pool } from '../db.js';
import { getMemberRole } from './cookbooks.js';

export async function findOrCreateIngredient(name) {
  const trimmed = name.trim();
  const { rows } = await pool.query('SELECT id FROM ingredients WHERE lower(name) = lower($1)', [trimmed]);
  if (rows[0]) return rows[0].id;
  const { rows: inserted } = await pool.query('INSERT INTO ingredients (name) VALUES ($1) RETURNING id', [trimmed]);
  return inserted[0].id;
}

export async function findOrCreateTag(name) {
  const trimmed = name.trim();
  const { rows } = await pool.query('SELECT id FROM tags WHERE lower(name) = lower($1)', [trimmed]);
  if (rows[0]) return rows[0].id;
  const { rows: inserted } = await pool.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [trimmed]);
  return inserted[0].id;
}

export async function findRecipeIds(userId, filters = {}) {
  const conditions = ['(r.owner_id = $1 OR r.cookbook_id IN (SELECT cookbook_id FROM cookbook_members WHERE user_id = $1))'];
  const params = [userId];

  if (filters.cookbookId) {
    params.push(filters.cookbookId);
    conditions.push(`r.cookbook_id = $${params.length}`);
  }
  if (filters.favoriteOnly) {
    conditions.push('r.favorite = true');
  }
  if (filters.maxPrepTime != null) {
    params.push(filters.maxPrepTime);
    conditions.push(`r.prep_time_minutes <= $${params.length}`);
  }
  if (filters.maxCookTime != null) {
    params.push(filters.maxCookTime);
    conditions.push(`r.cook_time_minutes <= $${params.length}`);
  }
  if (filters.ingredient) {
    params.push(`%${filters.ingredient}%`);
    conditions.push(
      `EXISTS (SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = r.id AND i.name ILIKE $${params.length})`,
    );
  }
  for (const tag of filters.tags || []) {
    params.push(tag);
    conditions.push(
      `EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = r.id AND t.name = $${params.length})`,
    );
  }
  if (filters.query) {
    params.push(`%${filters.query}%`);
    const q = params.length;
    conditions.push(`(
      r.title ILIKE $${q}
      OR EXISTS (SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = r.id AND i.name ILIKE $${q})
      OR EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = r.id AND t.name ILIKE $${q})
      OR EXISTS (SELECT 1 FROM recipe_steps s WHERE s.recipe_id = r.id AND s.instruction ILIKE $${q})
    )`);
  }

  const { rows } = await pool.query(
    `SELECT r.id FROM recipes r WHERE ${conditions.join(' AND ')} ORDER BY r.created_at DESC`,
    params,
  );
  return rows.map((r) => r.id);
}

export async function shapeRecipes(ids, { includeComments = false } = {}) {
  if (ids.length === 0) return [];

  const { rows: baseRows } = await pool.query('SELECT * FROM recipes WHERE id = ANY($1::uuid[])', [ids]);
  const { rows: ingredientRows } = await pool.query(
    `SELECT ri.recipe_id, i.name, ri.quantity, ri.unit
     FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ANY($1::uuid[]) ORDER BY ri.position`,
    [ids],
  );
  const { rows: tagRows } = await pool.query(
    `SELECT rt.recipe_id, t.name
     FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
     WHERE rt.recipe_id = ANY($1::uuid[])`,
    [ids],
  );
  const { rows: stepRows } = await pool.query(
    'SELECT recipe_id, instruction FROM recipe_steps WHERE recipe_id = ANY($1::uuid[]) ORDER BY position',
    [ids],
  );
  const { rows: dateRows } = await pool.query(
    `SELECT recipe_id, to_char(planned_date, 'YYYY-MM-DD') AS planned_date
     FROM recipe_planned_dates WHERE recipe_id = ANY($1::uuid[]) ORDER BY planned_date`,
    [ids],
  );
  let commentRows = [];
  if (includeComments) {
    ({ rows: commentRows } = await pool.query(
      `SELECT c.id, c.recipe_id, c.user_id, c.text, c.created_at, c.edited_at,
              u.id AS u_id, u.name AS u_name, u.email AS u_email, u.avatar_url AS u_avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.recipe_id = ANY($1::uuid[]) ORDER BY c.created_at`,
      [ids],
    ));
  }

  const baseById = new Map(baseRows.map((r) => [r.id, r]));
  const shaped = new Map(
    ids.filter((id) => baseById.has(id)).map((id) => {
      const r = baseById.get(id);
      return [id, {
        id: r.id,
        title: r.title,
        ownerId: r.owner_id,
        cookbookId: r.cookbook_id,
        image: r.image_url,
        prepTime: r.prep_time_minutes,
        cookTime: r.cook_time_minutes,
        servings: r.servings,
        source: r.source,
        favorite: r.favorite,
        tags: [],
        ingredients: [],
        steps: [],
        plannedDates: [],
        ...(includeComments ? { comments: [] } : {}),
      }];
    }),
  );

  ingredientRows.forEach((row) => shaped.get(row.recipe_id)?.ingredients.push({ name: row.name, quantity: row.quantity, unit: row.unit }));
  tagRows.forEach((row) => shaped.get(row.recipe_id)?.tags.push(row.name));
  stepRows.forEach((row) => shaped.get(row.recipe_id)?.steps.push(row.instruction));
  dateRows.forEach((row) => shaped.get(row.recipe_id)?.plannedDates.push(row.planned_date));
  if (includeComments) {
    commentRows.forEach((row) => shaped.get(row.recipe_id)?.comments.push({
      id: row.id,
      userId: row.user_id,
      text: row.text,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      user: { id: row.u_id, name: row.u_name, email: row.u_email, avatar: row.u_avatar_url },
    }));
  }

  return ids.filter((id) => shaped.has(id)).map((id) => shaped.get(id));
}

export async function getRecipeAccessInfo(recipeId, userId) {
  const { rows } = await pool.query('SELECT id, owner_id, cookbook_id FROM recipes WHERE id = $1', [recipeId]);
  const recipe = rows[0];
  if (!recipe) return { recipe: null };

  const isOwner = recipe.owner_id === userId;
  const cookbookRole = recipe.cookbook_id ? await getMemberRole(recipe.cookbook_id, userId) : null;

  return {
    recipe,
    isOwner,
    cookbookRole,
    canRead: isOwner || cookbookRole !== null,
    canWrite: isOwner || ['creator', 'editor'].includes(cookbookRole),
    canComment: isOwner || ['creator', 'editor', 'commenter'].includes(cookbookRole),
  };
}

async function replaceRecipeChildren(recipeId, { ingredients, tags, steps }) {
  if (ingredients) {
    await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    let position = 0;
    for (const ing of ingredients) {
      const ingredientId = await findOrCreateIngredient(ing.name);
      await pool.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position) VALUES ($1, $2, $3, $4, $5)',
        [recipeId, ingredientId, ing.quantity || null, ing.unit || '', position++],
      );
    }
  }
  if (tags) {
    await pool.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);
    for (const tag of tags) {
      const tagId = await findOrCreateTag(tag);
      await pool.query('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [recipeId, tagId]);
    }
  }
  if (steps) {
    await pool.query('DELETE FROM recipe_steps WHERE recipe_id = $1', [recipeId]);
    let position = 0;
    for (const instruction of steps) {
      await pool.query(
        'INSERT INTO recipe_steps (recipe_id, position, instruction) VALUES ($1, $2, $3)',
        [recipeId, position++, instruction],
      );
    }
  }
}

export async function createRecipe(ownerId, payload) {
  const { rows } = await pool.query(
    `INSERT INTO recipes (title, owner_id, cookbook_id, image_url, prep_time_minutes, cook_time_minutes, servings, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      payload.title,
      ownerId,
      payload.cookbookId || null,
      payload.image || null,
      payload.prepTime || 0,
      payload.cookTime || 0,
      payload.servings || 1,
      payload.source || '',
    ],
  );
  const recipeId = rows[0].id;
  await replaceRecipeChildren(recipeId, {
    ingredients: payload.ingredients || [],
    tags: payload.tags || [],
    steps: payload.steps || [],
  });
  return recipeId;
}

export async function updateRecipe(recipeId, patch) {
  const columns = {
    title: 'title',
    cookbookId: 'cookbook_id',
    image: 'image_url',
    prepTime: 'prep_time_minutes',
    cookTime: 'cook_time_minutes',
    servings: 'servings',
    source: 'source',
  };
  const fields = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] !== undefined) {
      values.push(patch[key]);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (fields.length > 0) {
    values.push(recipeId);
    await pool.query(`UPDATE recipes SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  }
  await replaceRecipeChildren(recipeId, {
    ingredients: patch.ingredients,
    tags: patch.tags,
    steps: patch.steps,
  });
}

export async function deleteRecipe(recipeId) {
  await pool.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
}

export async function toggleFavorite(recipeId) {
  await pool.query('UPDATE recipes SET favorite = NOT favorite WHERE id = $1', [recipeId]);
}

export async function addPlannedDate(recipeId, date) {
  await pool.query(
    'INSERT INTO recipe_planned_dates (recipe_id, planned_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [recipeId, date],
  );
}

export async function removePlannedDate(recipeId, date) {
  await pool.query('DELETE FROM recipe_planned_dates WHERE recipe_id = $1 AND planned_date = $2', [recipeId, date]);
}
