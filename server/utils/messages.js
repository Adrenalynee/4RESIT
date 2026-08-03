import { pool } from '../db.js';

function shapeMessageRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    user: { id: row.u_id, name: row.u_name, email: row.u_email, avatar: row.u_avatar_url },
  };
}

const SELECT_WITH_USER = `
  SELECT m.id, m.user_id, m.text, m.created_at, m.edited_at,
         u.id AS u_id, u.name AS u_name, u.email AS u_email, u.avatar_url AS u_avatar_url
  FROM messages m JOIN users u ON u.id = m.user_id
`;

export async function listMessages(cookbookId) {
  const { rows } = await pool.query(`${SELECT_WITH_USER} WHERE m.cookbook_id = $1 ORDER BY m.created_at`, [cookbookId]);
  return rows.map(shapeMessageRow);
}

export async function createMessage(cookbookId, userId, text) {
  const { rows } = await pool.query('INSERT INTO messages (cookbook_id, user_id, text) VALUES ($1, $2, $3) RETURNING id', [cookbookId, userId, text]);
  const { rows: full } = await pool.query(`${SELECT_WITH_USER} WHERE m.id = $1`, [rows[0].id]);
  return shapeMessageRow(full[0]);
}

export async function updateMessage(messageId, text) {
  await pool.query('UPDATE messages SET text = $1, edited_at = now() WHERE id = $2', [text, messageId]);
  const { rows } = await pool.query(`${SELECT_WITH_USER} WHERE m.id = $1`, [messageId]);
  return shapeMessageRow(rows[0]);
}

export async function deleteMessage(messageId) {
  await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
}

export async function getMessage(messageId) {
  const { rows } = await pool.query('SELECT id, cookbook_id, user_id FROM messages WHERE id = $1', [messageId]);
  return rows[0] || null;
}
