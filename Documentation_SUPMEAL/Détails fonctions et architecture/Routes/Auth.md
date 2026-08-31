# Auth Routes

Fichier monté sur `/api/auth`. Les routes `/register` et `/login` sont protégées par un middleware de limitation de débit (`authLimiter`, `express-rate-limit`) configuré à 20 requêtes par tranche de 15 minutes et par IP, afin de limiter les attaques par force brute sur les identifiants.

## `POST /register`

* **Paramètres**

  * `req.body.name` : pseudo unique de l'utilisateur (string, requis).
  * `req.body.email` : adresse email (string, requis).
  * `req.body.password` : mot de passe en clair (string, requis).

* **Retour**

  * Statut 201 : `{ user, token }` — `user` provient de `getUserById` (profil + préférences), `token` est un JWT signé.
  * Statut 400 : champ manquant, email de format invalide, ou mot de passe ne respectant pas les critères de sécurité requis.
  * Statut 409 : email ou pseudo déjà utilisé.
  * Statut 429 : trop de tentatives (`authLimiter`, voir note en tête de fichier).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Limitation de débit appliquée en middleware de route : `router.post('/register', authLimiter, async (req, res) => {...})`.
  * Validation des champs obligatoires : `if (!name || !email || !password)`.
  * Validation du format de l'email : `isValidEmail(email)` (`utils/email.js`), regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Le client applique la même règle et bloque le bouton d'inscription tant que l'email saisi n'est pas valide.
  * Validation de la force du mot de passe : `isPasswordStrong(password)`, qui exige simultanément une longueur ≥ 8, une majuscule, un chiffre et un caractère spécial (`utils/password.js`).
  * Vérification d'unicité avant insertion, avec message dédié par champ en conflit : `const existing = await pool.query('SELECT email, name FROM users WHERE email = $1 OR name = $2', [email, name])`.
  * Hashage du mot de passe : `bcrypt.hash(password, 10)`.
  * Filet de sécurité contre une condition de course sur la contrainte d'unicité SQL : `if (err.code === '23505') { if (err.constraint === 'users_name_key') ... }`.
  * Création des préférences par défaut à l'inscription : `await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId])`.
  * Génération du token : `jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })` (fonction `signToken`).

## `POST /login`

* **Paramètres**

  * `req.body.identifier` : email ou pseudo de l'utilisateur (string, requis).
  * `req.body.password` : mot de passe en clair (string, requis).

* **Retour**

  * Statut 200 : `{ user, token }`.
  * Statut 400 : champ manquant.
  * Statut 401 : identifiant inconnu, compte sans mot de passe (ex. compte créé via Google), ou mot de passe invalide.
  * Statut 429 : trop de tentatives (`authLimiter`).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Identifiant flexible email/pseudo dans une seule requête : `'SELECT id, password_hash FROM users WHERE email = $1 OR name = $1 LIMIT 1'`.
  * Rejet explicite des comptes sans mot de passe local (comptes Google purs) : `if (!account || !account.password_hash)`.
  * Vérification du mot de passe : `bcrypt.compare(password, account.password_hash)`.
  * Réutilisation de `signToken` pour générer un JWT valable 7 jours.

## `GET /me`

* **Paramètres**

  * `req.userId` : ID utilisateur (number), injecté par le middleware `requireAuth` à partir du token JWT (`req.userId = decoded.sub`).

* **Retour**

  * Statut 200 : `{ user }`.
  * Statut 401 : token absent/invalide (via `requireAuth`), ou utilisateur introuvable (compte supprimé alors que le token est encore valide).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Middleware de garde placé directement sur la route : `router.get('/me', requireAuth, async (req, res) => {...})`.
  * Défense contre un token valide pointant vers un compte supprimé : `if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' })`.

## `GET /google`

* **Paramètres**

  * Aucun paramètre applicatif ; la requête déclenche la redirection OAuth vers Google.

* **Retour**

  * Statut 302 : redirection vers l'écran de consentement Google.

* **Lignes importantes**

  * Délégation complète à Passport : `passport.authenticate('google', { scope: ['profile', 'email'], session: false })`.
  * `session: false` : l'application reste stateless côté serveur, l'authentification finale repose uniquement sur le JWT émis au callback.

## `GET /google/callback`

* **Paramètres**

  * Paramètres de requête (`code`, `state`, ...) transmis par Google et consommés par la stratégie Passport, non lus directement par le handler.

* **Retour**

  * Statut 302 : redirection vers `` `/oauth/callback?token=...` `` en cas de succès.
  * Statut 302 : redirection vers `/login` en cas d'échec (`failureRedirect`).

* **Lignes importantes**

  * Chaîne de middlewares : `passport.authenticate('google', { session: false, failureRedirect: '/login' })` avant le handler final.
  * Résolution/création de l'utilisateur dans `findOrCreateGoogleUser` (`config/passport.js`) : recherche d'abord par compte OAuth déjà lié (`oauth_accounts`), puis par email existant, sinon création d'un nouvel utilisateur.
  * Gestion de collision de pseudo à la création automatique : `if (err.code === '23505' && err.constraint === 'users_name_key')` déclenche jusqu'à 5 tentatives avec un suffixe numérique aléatoire ajouté au nom.
  * Émission du token final dans la redirection elle-même : `res.redirect(\`/oauth/callback?token=${signToken(req.user.id)}\`)`.
