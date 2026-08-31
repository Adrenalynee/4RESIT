## `requireCookbookRole(...allowedRoles): Function`

* **Paramètres**

  * `...allowedRoles` : liste variadique des rôles autorisés à accéder à la route (string[], optionnel — une liste vide autorise tout membre, quel que soit son rôle)

* **Retour**

  * `Function` : middleware Express `(req, res, next)` généré dynamiquement, à monter sur une route paramétrée par `:id` (l'identifiant du cookbook)

* **Lignes importantes**

  * factory de middleware : `export function requireCookbookRole(...allowedRoles) { return async (req, res, next) => { ... }; }` — permet un usage déclaratif du type `requireCookbookRole('creator', 'editor')` directement dans la définition des routes
  * récupération du rôle courant : `const role = await getMemberRole(req.params.id, req.userId);` — délègue à `utils/cookbooks.js`, qui exécute `SELECT role FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2`
  * dépendance implicite à `requireAuth` : `req.userId` doit avoir été défini au préalable par le middleware d'authentification ; `requireCookbookRole` doit donc toujours être monté après `requireAuth` dans la chaîne de middlewares de la route

### Middleware retourné `(req, res, next): Promise<void>`

* **Paramètres**

  * `req.params.id` : identifiant UUID du cookbook ciblé par la route (string, requis)
  * `req.userId` : identifiant de l'utilisateur authentifié, injecté par `requireAuth` (string, requis)

* **Retour**

  * Middleware : passe au contrôleur suivant avec `req.cookbookRole` défini (rôle de l'utilisateur dans ce cookbook)
  * Statut 403 : `{ error: "Vous n'êtes pas membre de ce cookbook" }` si aucune ligne `cookbook_members` ne correspond (utilisateur non membre)
  * Statut 403 : `{ error: 'Permission refusée pour ce rôle' }` si l'utilisateur est bien membre mais que son rôle ne figure pas dans `allowedRoles`

* **Lignes importantes**

  * rejet si non-membre : `if (!role) return res.status(403).json({ error: "Vous n'êtes pas membre de ce cookbook" });` — `getMemberRole` renvoie `null` en l'absence de ligne, ce qui couvre aussi bien un cookbook inexistant qu'un cookbook existant mais dont l'utilisateur ne fait pas partie
  * vérification du rôle autorisé, uniquement si des rôles ont été précisés : `if (allowedRoles.length > 0 && !allowedRoles.includes(role)) { return res.status(403).json({ error: 'Permission refusée pour ce rôle' }); }` — un appel sans argument (`requireCookbookRole()`) se comporte donc comme un simple contrôle d'appartenance, sans restriction de rôle
  * mise à disposition du rôle pour la suite de la requête : `req.cookbookRole = role;` — évite aux contrôleurs de refaire une requête SQL pour connaître le rôle de l'utilisateur courant
  * poursuite de la chaîne : `next();`

### Usage dans l'application

* **Rôles disponibles** (type PostgreSQL `cookbook_role`, voir `Config/Database.md`) : `creator`, `editor`, `reader`, `commenter`
* **Exemples d'usage attendus** : `requireCookbookRole('creator')` pour la suppression d'un cookbook, `requireCookbookRole('creator', 'editor')` pour l'ajout de recettes, `requireCookbookRole()` sans argument pour une simple lecture du contenu du cookbook réservée aux membres
