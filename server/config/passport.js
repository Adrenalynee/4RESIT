import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../db.js';

export async function findOrCreateGoogleUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;
  const displayName = profile.displayName || email?.split('@')[0] || 'Utilisateur Google';
  const avatarUrl = profile.photos?.[0]?.value || null;

  const { rows: linked } = await pool.query(
    "SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = $1",
    [googleId],
  );
  if (linked[0]) return linked[0].user_id;

  let userId;
  if (email) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing[0]) userId = existing[0].id;
  }

  if (!userId) {
    let name = displayName;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id',
          [name, email, avatarUrl],
        );
        userId = rows[0].id;
        break;
      } catch (err) {
        if (err.code === '23505' && err.constraint === 'users_name_key') {
          name = `${displayName}${Math.floor(Math.random() * 10000)}`;
          continue;
        }
        throw err;
      }
    }
    await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);
  }

  await pool.query(
    "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, 'google', $2) ON CONFLICT DO NOTHING",
    [userId, googleId],
  );

  return userId;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userId = await findOrCreateGoogleUser(profile);
        done(null, { id: userId });
      } catch (err) {
        done(err);
      }
    },
  ));
}

export default passport;
