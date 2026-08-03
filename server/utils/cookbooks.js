import { pool } from '../db.js';

export async function listCookbooksForUser(userId) {
  const { rows } = await pool.query(
    `SELECT cb.id, cb.name, cb.description,
            COALESCE((
              SELECT json_agg(json_build_object('userId', cm2.user_id, 'role', cm2.role))
              FROM cookbook_members cm2 WHERE cm2.cookbook_id = cb.id
            ), '[]') AS members,
            COALESCE((
              SELECT array_agg(r.id) FROM recipes r WHERE r.cookbook_id = cb.id
            ), '{}') AS recipe_ids
     FROM cookbooks cb
     JOIN cookbook_members cm ON cm.cookbook_id = cb.id AND cm.user_id = $1
     ORDER BY cb.created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    members: row.members,
    recipeIds: row.recipe_ids,
  }));
}

export async function getCookbookDetail(cookbookId) {
  const { rows: cookbookRows } = await pool.query(
    'SELECT id, name, description FROM cookbooks WHERE id = $1',
    [cookbookId],
  );
  const cookbook = cookbookRows[0];
  if (!cookbook) return null;

  const { rows: memberRows } = await pool.query(
    `SELECT cm.user_id, cm.role, u.id AS u_id, u.name AS u_name, u.email AS u_email, u.avatar_url AS u_avatar_url
     FROM cookbook_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.cookbook_id = $1
     ORDER BY cm.joined_at`,
    [cookbookId],
  );
  const { rows: recipeRows } = await pool.query('SELECT id FROM recipes WHERE cookbook_id = $1', [cookbookId]);

  return {
    id: cookbook.id,
    name: cookbook.name,
    description: cookbook.description,
    members: memberRows.map((m) => ({
      userId: m.user_id,
      role: m.role,
      user: { id: m.u_id, name: m.u_name, email: m.u_email, avatar: m.u_avatar_url },
    })),
    recipeIds: recipeRows.map((r) => r.id),
  };
}

export async function getMemberRole(cookbookId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2',
    [cookbookId, userId],
  );
  return rows[0]?.role || null;
}
