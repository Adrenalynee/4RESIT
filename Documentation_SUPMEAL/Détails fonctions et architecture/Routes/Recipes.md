# Recipes Routes

Fichier monté sur `/api/recipes`. Toutes les routes passent par `router.use(requireAuth)`. Les routes portant sur une recette précise (`/:id...`) sont protégées par `requireRecipeAccess(level)` (`middleware/recipeAccess.js`), qui calcule les droits via `getRecipeAccessInfo` (`utils/recipes.js`) :

* `canRead` : propriétaire de la recette OU membre du cookbook contenant la recette, quel que soit son rôle.
* `canWrite` : propriétaire OU rôle `'creator'`/`'editor'` dans le cookbook.
* `canComment` : propriétaire OU rôle `'creator'`/`'editor'`/`'commenter'` dans le cookbook.

Les routes `/import-url` et `/suggestions` sont déclarées avant `/:id` dans le routeur, ce qui est nécessaire pour qu'Express ne les fasse pas correspondre à la route paramétrée `GET /:id` (où `import-url`/`suggestions` seraient sinon interprétés comme un ID de recette).

## `GET /`

* **Paramètres**

  * `req.query.query` : recherche texte libre sur titre/ingrédients/tags/étapes (string, optionnel).
  * `req.query.cookbookId` : filtrer sur un cookbook (uuid, optionnel).
  * `req.query.ingredient` : filtrer par nom d'ingrédient partiel (string, optionnel).
  * `req.query.tags` : un ou plusieurs tags (string ou array de strings, optionnel).
  * `req.query.favoriteOnly` : `"true"` pour ne garder que les recettes favorites (string, optionnel).
  * `req.query.maxPrepTime`, `req.query.maxCookTime` : durées maximales en minutes (string convertie en number, optionnel).

* **Retour**

  * Statut 200 : array de recettes façonnées (`shapeRecipes`).
  * Statut 403 : `cookbookId` fourni mais l'utilisateur n'en est pas membre.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Normalisation de `tags` en tableau quel que soit le format envoyé : `const tags = req.query.tags ? [].concat(req.query.tags) : []`.
  * Contrôle d'accès explicite au cookbook demandé avant toute recherche : `if (cookbookId) { const role = await getMemberRole(cookbookId, req.userId); if (!role) return res.status(403)... }`.
  * La portée de la recherche elle-même est bornée aux recettes possédées ou aux cookbooks dont l'utilisateur est membre : `(r.owner_id = $1 OR r.cookbook_id IN (SELECT cookbook_id FROM cookbook_members WHERE user_id = $1))` (`findRecipeIds`).

## `POST /`

* **Paramètres**

  * `req.body.title` : titre de la recette (string, requis).
  * `req.body.cookbookId` : cookbook de destination (uuid, optionnel).
  * `req.body.tags` : tags parmi types de plat / cuisines / régimes (array, optionnel).
  * `req.body.difficulty` : niveau de difficulté (string, optionnel, doit appartenir à `DIFFICULTY_VALUES`).
  * `req.body.ingredients`, `req.body.steps`, `req.body.prepTime`, `req.body.cookTime`, `req.body.servings`, `req.body.image`, `req.body.source` : contenu de la recette (optionnels).

* **Retour**

  * Statut 201 : recette créée.
  * Statut 400 : titre manquant, ou catégories (tags/difficulté) invalides.
  * Statut 403 : `cookbookId` fourni mais rôle insuffisant pour y ajouter une recette.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Validation du titre : `if (!title || !title.trim())`.
  * Validation des catégories via une liste combinée : `const TAG_VALUES = [...MEAL_TYPE_VALUES, ...CUISINE_VALUES, ...DIET_VALUES]`, vérifiée par `validateRecipeCategories`.
  * Contrôle des droits d'écriture sur le cookbook cible : `if (!['creator', 'editor'].includes(role)) return res.status(403)...`.

## `POST /import-url`

* **Paramètres**

  * `req.body.url` : URL de la page recette à importer (string, requis).

* **Retour**

  * Statut 200 : brouillon de recette `{ title, image, prepTime, cookTime, servings, ingredients, steps, source }` — n'est **pas** enregistré en base, à valider/compléter côté client avant un `POST /`.
  * Statut 400 : URL manquante, ou domaine non autorisé.
  * Statut 422 : page récupérée mais aucune donnée structurée `Recipe` (JSON-LD) trouvée.
  * Statut 502 : site injoignable, délai dépassé, réponse HTTP en erreur, ou page trop volumineuse.

* **Lignes importantes**

  * Whitelist stricte de domaines, HTTPS uniquement : `const ALLOWED_HOSTS = ['marmiton.org', 'cuisineaz.com']` (`isAllowedRecipeUrl`).
  * Revérification du domaine sur l'URL finale après redirections, pour empêcher un contournement par redirection vers un autre hôte : `if (!isAllowedRecipeUrl(response.url))`.
  * Délai réseau borné : `FETCH_TIMEOUT_MS = 10000` piloté par un `AbortController`.
  * Taille de page plafonnée : `MAX_CONTENT_LENGTH = 5 * 1024 * 1024`, vérifiée via l'en-tête `content-length`.
  * Extraction via les données structurées `schema.org/Recipe` embarquées en JSON-LD : `$('script[type="application/ld+json"]')`, puis `findRecipeNode`.
  * Découpage best-effort d'une ligne d'ingrédient en quantité/unité/nom via une liste d'unités françaises connues (`UNIT_WORDS`) : `splitIngredientLine`.

## `GET /suggestions`

* **Paramètres**

  * `req.query.limit` : nombre maximal de suggestions (number, optionnel, défaut `8`).

* **Retour**

  * Statut 200 : array de recettes suggérées (au plus `limit`).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Déclarée avant `GET /:id` pour ne pas être interprétée comme un ID de recette.
  * Exclusion stricte des recettes dont un ingrédient contient le libellé d'un allergène déclaré par l'utilisateur : `!allergenLabels.some((label) => ingredientNames.some((name) => name.includes(label)))` (`suggestRecipes`, `utils/suggestions.js`).
  * Score de pertinence cumulatif après filtrage : `+3` si un tag correspond à une cuisine favorite, `+2` si un tag correspond à un régime suivi, `+1` si la recette est déjà marquée favorite, puis tri décroissant et troncature à `limit`.

## `GET /:id`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).

* **Retour**

  * Statut 200 : recette avec ses commentaires (`includeComments: true`).
  * Statut 403 : accès en lecture refusé (`requireRecipeAccess('read')`).
  * Statut 404 : recette introuvable.

* **Lignes importantes**

  * Niveau d'accès minimal exigé : `requireRecipeAccess('read')` — accessible à tout membre du cookbook, quel que soit son rôle, en plus du propriétaire.

## `PATCH /:id`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.body` : champs partiels de la recette (`title`, `cookbookId`, `image`, `prepTime`, `cookTime`, `servings`, `source`, `difficulty`, `tags`, `ingredients`, `steps`).

* **Retour**

  * Statut 200 : recette mise à jour.
  * Statut 400 : catégories (tags/difficulté) invalides.
  * Statut 403 : pas de droit d'écriture sur la recette (`requireRecipeAccess('write')`), ou pas de droit d'écriture sur le cookbook de destination si `cookbookId` change.

* **Lignes importantes**

  * **Vérification anti-IDOR sur le déplacement de recette** : `requireRecipeAccess('write')` ne contrôle que les droits sur le cookbook *actuel* de la recette (ou la propriété) ; sans vérification supplémentaire, un utilisateur ayant le droit d'écrire sur sa propre recette pourrait la déplacer vers l'ID de n'importe quel autre cookbook, y compris un cookbook auquel il n'a pas accès. La route ajoute donc un contrôle explicite sur le cookbook cible : `if (patch.cookbookId) { const role = await getMemberRole(patch.cookbookId, req.userId); if (!['creator', 'editor'].includes(role)) return res.status(403)... }`.
  * Nettoyage de l'ancienne image si elle est remplacée, même mécanisme que pour l'avatar utilisateur : `if (patch.image !== undefined && patch.image !== oldImage) { await deleteUploadedFile(oldImage); }`.

## `DELETE /:id`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).

* **Retour**

  * Statut 200 : `{ success: true }`.
  * Statut 403 : pas de droit d'écriture (`requireRecipeAccess('write')`).
  * Statut 404 : recette introuvable.

* **Lignes importantes**

  * Récupération de l'image avant suppression de la ligne, pour pouvoir nettoyer le fichier ensuite : `SELECT image_url FROM recipes WHERE id = $1` puis `await deleteUploadedFile(rows[0]?.image_url)`.

## `POST /:id/toggle-favorite`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).

* **Retour**

  * Statut 200 : recette avec son statut favori inversé.
  * Statut 403 : accès en lecture refusé.

* **Lignes importantes**

  * Niveau d'accès requis volontairement minimal : `requireRecipeAccess('read')`, pas `'write'`.
  * Le champ `favorite` est une colonne unique sur la ligne `recipes`, partagée par tous les membres du cookbook — ce n'est **pas** un marque-page personnel par utilisateur : `UPDATE recipes SET favorite = NOT favorite WHERE id = $1` change l'état pour tous les membres qui consultent cette recette.

## `POST /:id/planned-dates`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.body.date` : date de planification (string, requis).

* **Retour**

  * Statut 200 : recette avec la date ajoutée à `plannedDates`.
  * Statut 400 : date manquante.
  * Statut 403 : accès en lecture refusé.

* **Lignes importantes**

  * Niveau d'accès requis : `requireRecipeAccess('read')` — planifier une recette ne nécessite pas de droit d'écriture sur son contenu.
  * Insertion idempotente : `INSERT INTO recipe_planned_dates (recipe_id, planned_date) VALUES ($1, $2) ON CONFLICT DO NOTHING`.
  * À la différence de `weekStart` dans `GET /shopping-list` (routes Planning), le format de `date` n'est validé par aucune regex côté serveur ; seule sa présence est vérifiée.

## `DELETE /:id/planned-dates/:date`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.params.date` : date à retirer (string, requis).

* **Retour**

  * Statut 200 : recette avec la date retirée de `plannedDates`.
  * Statut 403 : accès en lecture refusé.

* **Lignes importantes**

  * Suppression ciblée : `DELETE FROM recipe_planned_dates WHERE recipe_id = $1 AND planned_date = $2`.

## `POST /:id/comments`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.body.text` : contenu du commentaire (string, requis, non vide après `trim`).

* **Retour**

  * Statut 201 : recette complète avec la liste de commentaires mise à jour.
  * Statut 400 : commentaire vide.
  * Statut 403 : pas de droit de commentaire (`requireRecipeAccess('comment')`).

* **Lignes importantes**

  * Niveau d'accès dédié : `requireRecipeAccess('comment')`, qui autorise aussi le rôle `'commenter'`, plus permissif que `'write'` mais plus restrictif que `'read'`.
  * La réponse renvoie la recette entière (recette + commentaires), pas seulement le commentaire créé.

## `PATCH /:id/comments/:commentId`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.params.commentId` : ID du commentaire (requis).
  * `req.body.text` : nouveau contenu (string, requis, non vide après `trim`).

* **Retour**

  * Statut 200 : recette avec le commentaire modifié.
  * Statut 400 : commentaire vide.
  * Statut 403 : utilisateur courant n'est pas l'auteur du commentaire.
  * Statut 404 : commentaire introuvable pour cette recette.

* **Lignes importantes**

  * Le middleware de route n'exige que `requireRecipeAccess('read')` : la véritable autorisation (être l'auteur du commentaire) est vérifiée à la main dans le handler, pas au niveau du middleware de rôle.
  * Requête de lookup bornée à la fois par l'ID du commentaire et par `recipe_id`, ce qui empêche de cibler un commentaire appartenant à une autre recette en devinant simplement son ID : `SELECT user_id FROM comments WHERE id = $1 AND recipe_id = $2`.
  * Contrôle de propriété explicite : `if (rows[0].user_id !== req.userId) return res.status(403)...`.

## `DELETE /:id/comments/:commentId`

* **Paramètres**

  * `req.params.id` : ID de la recette (requis).
  * `req.params.commentId` : ID du commentaire (requis).

* **Retour**

  * Statut 200 : recette avec le commentaire supprimé.
  * Statut 403 : utilisateur courant n'est pas l'auteur du commentaire.
  * Statut 404 : commentaire introuvable pour cette recette.

* **Lignes importantes**

  * Même garde d'accès et même scoping anti-IDOR que pour la modification : `SELECT user_id FROM comments WHERE id = $1 AND recipe_id = $2` puis contrôle `user_id !== req.userId`.
  * Suppression : `DELETE FROM comments WHERE id = $1`.
