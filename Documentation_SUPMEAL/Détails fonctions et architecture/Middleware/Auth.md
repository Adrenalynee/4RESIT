## `requireAuth(req, res, next): void`

* **Paramètres**

  * `req.headers.authorization` : header d'autorisation au format `Bearer <token>` (string, requis)

* **Retour**

  * Middleware : passe au middleware suivant avec `req.userId` défini (identifiant utilisateur extrait du token)
  * Statut 401 : `{ error: 'Non authentifié' }` si le header est absent ou ne commence pas par `Bearer`
  * Statut 401 : `{ error: 'Session invalide' }` si le token est présent mais invalide, expiré ou signé avec une autre clé

* **Lignes importantes**

  * lecture du header avec valeur de repli : `const header = req.headers.authorization || '';` — évite un `undefined.split(...)` si le header est absent
  * découpage du schéma et du token : `const [scheme, token] = header.split(' ');`
  * validation du format : `if (scheme !== 'Bearer' || !token) { return res.status(401).json({ error: 'Non authentifié' }); }`
  * vérification et décodage du JWT : `const decoded = jwt.verify(token, process.env.JWT_SECRET);`
  * extraction de l'identifiant utilisateur depuis le claim standard `sub` : `req.userId = decoded.sub;`
  * passage au middleware suivant uniquement après validation réussie : `next();`
  * capture générique des erreurs de vérification (signature invalide, token expiré, token malformé) : `catch { res.status(401).json({ error: 'Session invalide' }); }`

### Usage dans l'application

* **Positionnement** : appliqué comme middleware de route sur l'ensemble des endpoints REST nécessitant une identité (recettes, cookbooks, préférences utilisateur, etc.)
* **Convention de claim** : contrairement à un usage où le payload contiendrait un objet utilisateur complet, SUPMEAL ne conserve que `sub` (l'identifiant UUID de `users.id`) dans le token ; toute donnée supplémentaire (nom, email, rôle) doit être requêtée en base par les contrôleurs via `req.userId`
* **Absence de middleware d'authentification optionnelle** : aucune variante `optionalAuth` n'est présente côté SUPMEAL ; toutes les routes protégées exigent un token valide

### Validation du secret JWT

* **Configuration**

  * Variable d'environnement : `JWT_SECRET`, utilisée directement dans l'appel à `jwt.verify` sans vérification explicite de sa présence dans ce fichier
  * Risque associé : si `JWT_SECRET` est `undefined` en production, `jwt.verify` échoue systématiquement (ou pire, selon la configuration de `jsonwebtoken`, peut se comporter de façon imprévisible), ce qui doit être garanti par la configuration de déploiement plutôt que par ce middleware

### Export

* **Fonction exportée** : `requireAuth` — export nommé unique du module, importé par les routeurs Express nécessitant une authentification stricte par Bearer token
