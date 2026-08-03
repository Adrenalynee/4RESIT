import { pool } from '../db.js';

export async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url,
            up.diet, up.favorite_cuisine, up.default_servings,
            COALESCE(array_agg(ua.allergy) FILTER (WHERE ua.allergy IS NOT NULL), '{}') AS allergies
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id
     LEFT JOIN user_allergies ua ON ua.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, up.diet, up.favorite_cuisine, up.default_servings`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar_url,
    preferences: {
      diet: row.diet || '',
      allergies: row.allergies || [],
      favoriteCuisine: row.favorite_cuisine || '',
      defaultServings: row.default_servings || 2,
    },
  };
}
