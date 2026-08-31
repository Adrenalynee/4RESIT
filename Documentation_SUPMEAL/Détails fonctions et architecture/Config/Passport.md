## Configuration Passport.js pour l'authentification Google OAuth 2.0

### `findOrCreateGoogleUser(profile): Promise<string>`

* **Paramètres**

  * `profile` : profil utilisateur renvoyé par Google via `passport-google-oauth20` (Object, requis)

    * `profile.id` : identifiant unique du compte Google (string)
    * `profile.emails[0].value` : adresse email principale (string, optionnel selon les scopes accordés)
    * `profile.displayName` : nom affiché du compte Google (string, optionnel)
    * `profile.photos[0].value` : URL de la photo de profil (string, optionnel)

* **Retour**

  * `string` (UUID) : identifiant de l'utilisateur SUPMEAL (`users.id`), qu'il vienne d'être créé ou qu'il existait déjà

* **Lignes importantes**

  * recherche d'un lien OAuth déjà existant : `SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = $1` — si l'utilisateur s'est déjà connecté une fois avec ce compte Google, on retrouve directement son `user_id` sans retoucher la table `users`
  * retour anticipé si déjà lié : `if (linked[0]) return linked[0].user_id;`
  * rattachement à un compte existant par email : `SELECT id FROM users WHERE email = $1` — permet de fusionner un compte Google avec un compte créé au préalable par mot de passe classique sur la même adresse
  * génération d'un nom d'affichage de repli : `const displayName = profile.displayName || email?.split('@')[0] || 'Utilisateur Google';`
  * boucle de résolution de conflit sur `name` (contrainte `UNIQUE` de la table `users`) : `for (let attempt = 0; attempt < 5; attempt++)`
  * détection précise du conflit : `if (err.code === '23505' && err.constraint === 'users_name_key')` — code d'erreur PostgreSQL pour violation de contrainte d'unicité, ciblé sur la contrainte du nom uniquement
  * suffixe aléatoire en cas de conflit : `name = \`${displayName}${Math.floor(Math.random() * 10000)}\`;`
  * création de l'utilisateur sans mot de passe : `INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id` — `password_hash` reste `NULL`, ce compte ne pourra donc jamais se connecter par identifiant/mot de passe
  * création des préférences par défaut : `INSERT INTO user_preferences (user_id) VALUES ($1)` — exécutée uniquement pour un utilisateur nouvellement créé (`!userId`)
  * enregistrement du lien OAuth idempotent : `INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, 'google', $2) ON CONFLICT DO NOTHING` — sécurise contre une double insertion en cas d'appels concurrents

### Enregistrement de la stratégie Google

#### Configuration conditionnelle

* **Paramètres d'environnement**

  * `GOOGLE_CLIENT_ID` : identifiant client OAuth Google (string, requis pour activer la stratégie)
  * `GOOGLE_CLIENT_SECRET` : secret client OAuth Google (string, requis pour activer la stratégie)
  * `GOOGLE_CALLBACK_URL` : URL de callback enregistrée côté Google Cloud Console (string, requis pour activer la stratégie)

* **Lignes importantes**

  * garde d'activation : `if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) { ... }` — la stratégie Google n'est enregistrée dans Passport que si les deux identifiants sont présents ; en leur absence, l'application démarre normalement mais la route de login Google n'aboutira pas
  * instanciation de la stratégie : `passport.use(new GoogleStrategy({ clientID, clientSecret, callbackURL }, async (accessToken, refreshToken, profile, done) => { ... }))`

> **Prérequis de déploiement** : pour qu'une instance réelle de SUPMEAL propose la connexion Google, il faut créer des identifiants OAuth 2.0 côté [Google Cloud Console](https://console.cloud.google.com/) (type "Application web"), y déclarer l'URL de callback exacte (`GOOGLE_CALLBACK_URL`), puis renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans les variables d'environnement du service serveur (fichier `.env` ou configuration `docker-compose`). Sans ces trois variables, le bloc `passport.use(...)` n'est jamais exécuté.

#### Fonction de callback `async (accessToken, refreshToken, profile, done)`

* **Paramètres**

  * `accessToken` : jeton d'accès Google (string), non exploité par SUPMEAL au-delà de la signature de la fonction
  * `refreshToken` : jeton de rafraîchissement Google (string, peut être absent), non exploité
  * `profile` : profil utilisateur Google (Object), transmis à `findOrCreateGoogleUser`
  * `done` : callback standard Passport `(error, user)` (Function)

* **Retour**

  * Succès : `done(null, { id: userId })` — l'objet minimal placé en session/redirection par Passport ne contient que l'identifiant SUPMEAL de l'utilisateur
  * Échec : `done(err)` — toute erreur survenue dans `findOrCreateGoogleUser` (contrainte SQL non gérée, erreur de connexion à la base, etc.) est propagée à Passport

* **Lignes importantes**

  * délégation complète de la logique métier : `const userId = await findOrCreateGoogleUser(profile);` — le callback Passport lui-même reste minimal, toute la complexité (fusion de compte, unicité du nom, préférences par défaut) est isolée dans `findOrCreateGoogleUser`, testable indépendamment de Passport
  * gestion d'erreur : `try { ... } catch (err) { done(err); }`

### Export du module

* **Ligne importante** : `export default passport;` — l'instance Passport configurée (avec ou sans stratégie Google selon les variables d'environnement) est exportée pour être branchée sur les routes OAuth du serveur Express (`/api/oauth/google`, `/api/oauth/google/callback`)

### Sécurité et gestion d'erreurs

* **Aucun mot de passe pour les comptes Google** : `password_hash` reste `NULL`, ce qui empêche toute connexion classique sur ces comptes et matérialise clairement leur origine OAuth
* **Fusion par email** : un compte créé manuellement puis reconnecté via Google avec la même adresse email est automatiquement rattaché plutôt que dupliqué
* **Unicité du nom** : résolution automatique par suffixe numérique aléatoire, bornée à 5 tentatives pour éviter une boucle infinie en cas de problème persistant
* **Idempotence du lien OAuth** : `ON CONFLICT DO NOTHING` protège contre les doubles callbacks ou tentatives concurrentes
* **Activation conditionnelle** : la stratégie Google n'est enregistrée que si les credentials sont présents, évitant une erreur au démarrage du serveur en environnement de développement sans configuration OAuth

### Variables d'environnement requises

* **`GOOGLE_CLIENT_ID`** : identifiant de l'application OAuth déclarée dans Google Cloud Console
* **`GOOGLE_CLIENT_SECRET`** : secret associé à cette application OAuth
* **`GOOGLE_CALLBACK_URL`** : URL absolue de la route de callback, doit correspondre exactement à celle enregistrée côté Google Cloud Console
