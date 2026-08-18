import { pool } from '../db.js';

export async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url,
            up.default_servings,
            COALESCE(array_agg(DISTINCT ua.allergy) FILTER (WHERE ua.allergy IS NOT NULL), '{}') AS allergies,
            COALESCE(array_agg(DISTINCT ud.diet) FILTER (WHERE ud.diet IS NOT NULL), '{}') AS diets,
            COALESCE(array_agg(DISTINCT uc.cuisine) FILTER (WHERE uc.cuisine IS NOT NULL), '{}') AS cuisines
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id
     LEFT JOIN user_allergies ua ON ua.user_id = u.id
     LEFT JOIN user_diets ud ON ud.user_id = u.id
     LEFT JOIN user_cuisines uc ON uc.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, up.default_servings`,
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
      diets: row.diets || [],
      allergies: row.allergies || [],
      favoriteCuisines: row.cuisines || [],
      defaultServings: row.default_servings || 2,
    },
  };
}

export async function replaceUserSet(table, column, userId, values) {
  await pool.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  if (values.length > 0) {
    const placeholders = values.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(`INSERT INTO ${table} (user_id, ${column}) VALUES ${placeholders}`, [userId, ...values]);
  }
}
