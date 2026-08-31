## `requireRecipeAccess(level = 'read'): Function`

* **Paramètres**

  * `level` : niveau d'accès requis pour la route (string, optionnel, défaut `'read'`), l'une des valeurs `'read'`, `'write'` ou `'comment'`

* **Retour**

  * `Function` : middleware Express `(req, res, next)` généré dynamiquement, à monter sur une route paramétrée par `:id` (l'identifiant de la recette)

* **Lignes importantes**

  * factory de middleware paramétrée par niveau : `export function requireRecipeAccess(level = 'read') { return async (req, res, next) => { ... }; }` — un seul middleware générique couvre les trois niveaux de permission au lieu de trois middlewares distincts
  * calcul centralisé des droits : `const info = await getRecipeAccessInfo(req.params.id, req.userId);` — délègue à `utils/recipes.js` le calcul complet de la matrice de droits sur la recette
  * dépendance implicite à `requireAuth` : `req.userId` doit être défini au préalable, ce middleware doit donc être monté après `requireAuth`

### Middleware retourné `(req, res, next): Promise<void>`

* **Paramètres**

  * `req.params.id` : identifiant UUID de la recette ciblée par la route (string, requis)
  * `req.userId` : identifiant de l'utilisateur authentifié, injecté par `requireAuth` (string, requis)

* **Retour**

  * Middleware : passe au contrôleur suivant avec `req.recipeAccess` défini (objet de droits calculés pour cette recette et cet utilisateur)
  * Statut 404 : `{ error: 'Recette introuvable' }` si aucune recette ne correspond à `req.params.id`
  * Statut 403 : `{ error: 'Action non autorisée sur cette recette' }` si le niveau de droit requis (`read`, `write` ou `comment`) n'est pas accordé à l'utilisateur

* **Lignes importantes**

  * rejet si recette absente : `if (!info.recipe) return res.status(404).json({ error: 'Recette introuvable' });`
  * sélection du droit à vérifier selon le niveau demandé : `const allowed = level === 'write' ? info.canWrite : level === 'comment' ? info.canComment : info.canRead;` — un ternaire en cascade fait correspondre le paramètre `level` au bon booléen calculé par `getRecipeAccessInfo`
  * rejet si droit non accordé : `if (!allowed) return res.status(403).json({ error: 'Action non autorisée sur cette recette' });`
  * mise à disposition des informations d'accès pour la suite de la requête : `req.recipeAccess = info;` — évite aux contrôleurs de recalculer la propriété ou le rôle cookbook
  * poursuite de la chaîne : `next();`

### `getRecipeAccessInfo(recipeId, userId)` — logique de calcul des droits (`utils/recipes.js`)

* **Paramètres**

  * `recipeId` : identifiant UUID de la recette (string, requis)
  * `userId` : identifiant de l'utilisateur (string, requis)

* **Retour**

  * `{ recipe: null }` si la recette n'existe pas
  * `{ recipe, isOwner, cookbookRole, canRead, canWrite, canComment }` sinon

* **Lignes importantes**

  * récupération minimale de la recette : `SELECT id, owner_id, cookbook_id FROM recipes WHERE id = $1` — seules les colonnes nécessaires au calcul des droits sont chargées
  * détection de la propriété directe : `const isOwner = recipe.owner_id === userId;`
  * résolution du rôle cookbook uniquement si la recette appartient à un cookbook : `const cookbookRole = recipe.cookbook_id ? await getMemberRole(recipe.cookbook_id, userId) : null;`
  * lecture accordée au propriétaire ou à tout membre du cookbook, quel que soit son rôle : `canRead: isOwner || cookbookRole !== null`
  * écriture réservée au propriétaire ou aux rôles `creator`/`editor` : `canWrite: isOwner || ['creator', 'editor'].includes(cookbookRole)`
  * commentaire ouvert en plus au rôle `commenter` : `canComment: isOwner || ['creator', 'editor', 'commenter'].includes(cookbookRole)`

### Usage dans l'application

* **Hiérarchie implicite des niveaux** : `write` et `comment` sont des sous-ensembles stricts de `read` (tout utilisateur pouvant écrire ou commenter peut aussi lire), la hiérarchie étant portée par la définition des trois booléens plutôt que par une comparaison numérique de niveaux
* **Recettes personnelles** : une recette sans `cookbook_id` n'est accessible qu'à son propriétaire (`cookbookRole` reste `null`, donc `canRead`/`canWrite`/`canComment` valent tous `isOwner`)
* **Exemples d'usage attendus** : `requireRecipeAccess('write')` pour la modification ou suppression d'une recette, `requireRecipeAccess('comment')` pour l'ajout d'un commentaire, `requireRecipeAccess()` (niveau `read` par défaut) pour la simple consultation
