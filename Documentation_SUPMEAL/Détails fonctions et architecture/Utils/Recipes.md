# Recipes Utils

## `findOrCreateIngredient(name): Promise<string>`

* **Paramètres**

  * `name` : nom brut de l'ingrédient (string, requis)

* **Retour**

  * `Promise<string>` : identifiant (uuid) de l'ingrédient existant ou nouvellement créé

* **Lignes importantes**

  * `const trimmed = name.trim();` : normalise les espaces avant recherche/insertion
  * `SELECT id FROM ingredients WHERE lower(name) = lower($1)` : recherche insensible à la casse pour éviter de créer "Tomate" et "tomate" comme deux ingrédients distincts
  * `INSERT INTO ingredients (name) VALUES ($1) RETURNING id` : n'exécuté que si aucune ligne n'a été trouvée (pattern find-or-create)

## `findOrCreateTag(name): Promise<string>`

* **Paramètres**

  * `name` : nom brut du tag (string, requis)

* **Retour**

  * `Promise<string>` : identifiant (uuid) du tag existant ou nouvellement créé

* **Lignes importantes**

  * même structure que `findOrCreateIngredient` : `trim()` puis recherche insensible à la casse (`lower(name) = lower($1)`) avant création
  * `INSERT INTO tags (name) VALUES ($1) RETURNING id` : les tags sont donc partagés entre toutes les recettes qui utilisent le même libellé (casse ignorée)

## `findRecipeIds(userId, filters = {}): Promise<Array<string>>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur courant (uuid, requis)
  * `filters` : critères de recherche (object, optionnel) — `cookbookId`, `favoriteOnly` (bool), `maxPrepTime`, `maxCookTime` (number), `ingredient` (string), `tags` (array de string), `query` (string, recherche globale)

* **Retour**

  * `Promise<Array<string>>` : identifiants des recettes correspondant aux filtres, triés par date de création décroissante

* **Lignes importantes**

  * `'(r.owner_id = $1 OR r.cookbook_id IN (SELECT cookbook_id FROM cookbook_members WHERE user_id = $1))'` : condition de base toujours présente — restreint le résultat aux recettes possédées par l'utilisateur ou appartenant à un cookbook dont il est membre, avant même d'appliquer les filtres
  * construction dynamique des conditions : chaque filtre fourni ajoute une entrée à `conditions` et son paramètre à `params`, les filtres absents n'apparaissent pas dans la requête finale
  * `EXISTS (SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ... WHERE ri.recipe_id = r.id AND i.name ILIKE $n)` : le filtre `ingredient` recherche une correspondance partielle et insensible à la casse (`ILIKE '%...%'`) parmi les ingrédients de la recette
  * `for (const tag of filters.tags || [])` ajoute une condition `EXISTS` par tag : les tags multiples sont combinés en ET logique (une recette doit posséder *tous* les tags demandés, pas seulement l'un d'eux)
  * filtre `query` : une seule valeur `%...%` est réutilisée dans quatre `EXISTS`/`ILIKE` combinés en OR (titre, ingrédients, tags, étapes) — une recherche globale qui touche tout le contenu de la recette
  * `ORDER BY r.created_at DESC` appliqué en toute fin de requête, après application de tous les filtres

## `shapeRecipes(ids, { includeComments = false } = {}): Promise<Array<object>>`

* **Paramètres**

  * `ids` : identifiants des recettes à charger (array de uuid, requis)
  * `includeComments` : si `true`, charge et inclut aussi les commentaires de chaque recette (bool, optionnel, défaut `false`)

* **Retour**

  * `Promise<Array<object>>` : liste de recettes entièrement hydratées `{ id, title, ownerId, cookbookId, image, prepTime, cookTime, servings, source, favorite, difficulty, tags: [], ingredients: [], steps: [], plannedDates: [], comments?: [] }`, dans le même ordre que `ids` (les identifiants introuvables sont simplement omis) ; renvoie `[]` immédiatement si `ids` est vide

* **Lignes importantes**

  * `if (ids.length === 0) return [];` : évite d'exécuter `= ANY($1::uuid[])` sur un tableau vide (sortie anticipée)
  * cinq requêtes indépendantes (`recipes`, `recipe_ingredients`, `recipe_tags`, `recipe_steps`, `recipe_planned_dates`, plus `comments` si demandé), chacune via `WHERE ... = ANY($1::uuid[])` : charge en une passe les enfants de *toutes* les recettes demandées, plutôt que d'exécuter une requête par recette (évite le problème N+1)
  * `const baseById = new Map(baseRows.map((r) => [r.id, r]));` puis construction d'une seconde `Map` `shaped` : structure intermédiaire permettant de retrouver en O(1) la recette à enrichir pour chaque ligne enfant
  * `shaped.get(row.recipe_id)?.ingredients.push(...)` : le chaînage optionnel protège contre une ligne enfant orpheline dont le `recipe_id` ne correspondrait à aucune recette de base (incohérence de données)
  * requête `comments` conditionnelle (`if (includeComments)`) : jointure supplémentaire avec `users` pour inclure les informations d'auteur de chaque commentaire, chargée uniquement quand elle est explicitement demandée (ex. par `gatherExportData` mais pas par un simple listing)
  * `return ids.filter((id) => shaped.has(id)).map((id) => shaped.get(id));` : le tableau renvoyé respecte l'ordre de `ids` en entrée (utile car `findRecipeIds` a déjà appliqué un `ORDER BY`)

## `getRecipeAccessInfo(recipeId, userId): Promise<object>`

* **Paramètres**

  * `recipeId` : identifiant de la recette (uuid, requis)
  * `userId` : identifiant de l'utilisateur courant (uuid, requis)

* **Retour**

  * `Promise<object>` : `{ recipe: null }` si la recette n'existe pas ; sinon `{ recipe, isOwner, cookbookRole, canRead, canWrite, canComment }`

* **Lignes importantes**

  * `if (!recipe) return { recipe: null };` : sortie anticipée, aucun appel supplémentaire si la recette n'existe pas
  * `const isOwner = recipe.owner_id === userId;` : la propriété directe de la recette prime toujours sur le rôle dans un cookbook
  * `recipe.cookbook_id ? await getMemberRole(recipe.cookbook_id, userId) : null` : ne consulte le rôle dans le cookbook que si la recette appartient effectivement à un cookbook (délègue à `getMemberRole` de `cookbooks.js`)
  * `canRead: isOwner || cookbookRole !== null` : tout membre du cookbook (quel que soit son rôle) peut lire la recette
  * `canWrite: isOwner || ['creator', 'editor'].includes(cookbookRole)` : seuls le créateur et les éditeurs du cookbook peuvent modifier une recette qu'ils ne possèdent pas
  * `canComment: isOwner || ['creator', 'editor', 'commenter'].includes(cookbookRole)` : les commentateurs (`commenter`) ont un droit intermédiaire — commenter sans pouvoir modifier

## `replaceRecipeChildren(recipeId, { ingredients, tags, steps })` (fonction interne)

* **Paramètres**

  * `recipeId` : identifiant de la recette (uuid, requis)
  * `ingredients` : nouvelle liste d'ingrédients (array, optionnel — `undefined` signifie "ne pas toucher à cette liste")
  * `tags` : nouvelle liste de tags (array, optionnel, même règle)
  * `steps` : nouvelle liste d'étapes (array, optionnel, même règle)

* **Retour**

  * `Promise<void>` : non exportée, utilisée uniquement par `createRecipe` et `updateRecipe` pour appliquer le contenu associé d'une recette

* **Lignes importantes**

  * chacune des trois listes est traitée indépendamment sous une garde `if (ingredients)` / `if (tags)` / `if (steps)` : permet une mise à jour partielle (`updateRecipe` peut modifier uniquement le titre sans toucher aux ingrédients si `patch.ingredients` est `undefined`)
  * pattern "delete puis ré-insertion complète" pour ingrédients et étapes : `DELETE FROM recipe_ingredients WHERE recipe_id = $1` suivi d'une boucle d'`INSERT` avec `position` croissante — reconstruit entièrement l'ordre plutôt que de calculer un diff
  * chaque ingrédient est résolu via `findOrCreateIngredient(ing.name)` avant insertion, garantissant qu'il référence toujours une ligne existante dans `ingredients`
  * `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING` : à la différence des ingrédients/étapes, les tags ne sont pas réordonnés (pas de colonne `position`) et le conflit sur une association déjà existante est simplement ignoré
  * étapes réinsérées avec un compteur `position` incrémenté à chaque itération, garantissant leur ordre d'affichage

## `createRecipe(ownerId, payload): Promise<string>`

* **Paramètres**

  * `ownerId` : identifiant du propriétaire de la recette (uuid, requis)
  * `payload` : contenu de la recette (object, requis) — `title`, `cookbookId?`, `image?`, `prepTime?`, `cookTime?`, `servings?`, `source?`, `difficulty?`, `ingredients?[]`, `tags?[]`, `steps?[]`

* **Retour**

  * `Promise<string>` : identifiant (uuid) de la recette créée

* **Lignes importantes**

  * `INSERT INTO recipes (...) VALUES (...) RETURNING id` : insertion de la ligne principale, puis récupération immédiate de son id pour créer les enfants
  * valeurs par défaut si champ absent : `payload.prepTime || 0`, `payload.cookTime || 0`, `payload.servings || 1`, `payload.source || ''`, `payload.cookbookId || null`, `payload.difficulty || null`
  * délègue systématiquement à `replaceRecipeChildren(recipeId, { ingredients: payload.ingredients || [], tags: payload.tags || [], steps: payload.steps || [] })` : contrairement à `updateRecipe`, les trois listes sont toujours fournies (au moins vides) car il n'y a rien à préserver sur une création

## `updateRecipe(recipeId, patch): Promise<void>`

* **Paramètres**

  * `recipeId` : identifiant de la recette à modifier (uuid, requis)
  * `patch` : champs à mettre à jour (object, requis) — tout sous-ensemble de `title`, `cookbookId`, `image`, `prepTime`, `cookTime`, `servings`, `source`, `difficulty`, `ingredients`, `tags`, `steps`

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `const columns = { title: 'title', cookbookId: 'cookbook_id', ... }` : table de correspondance entre les clés camelCase du payload et les colonnes SQL snake_case
  * `if (patch[key] !== undefined)` : seuls les champs explicitement présents dans `patch` sont mis à jour — une valeur `null` explicite est appliquée (permet de vider un champ), mais un champ absent (`undefined`) laisse la colonne inchangée
  * `if (fields.length > 0) { ... UPDATE ... }` : la requête `UPDATE` est totalement sautée si aucun champ scalaire n'a changé (ex. seuls les ingrédients ont été modifiés)
  * `await replaceRecipeChildren(recipeId, { ingredients: patch.ingredients, tags: patch.tags, steps: patch.steps })` : toujours appelé, mais chaque liste garde la valeur `undefined` si elle n'était pas dans `patch`, ce qui fait que `replaceRecipeChildren` la laissera intacte (voir sa documentation ci-dessus)

## `deleteRecipe(recipeId): Promise<void>`

* **Paramètres**

  * `recipeId` : identifiant de la recette à supprimer (uuid, requis)

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `DELETE FROM recipes WHERE id = $1` : suppression unique de la ligne principale ; la suppression des lignes enfants (ingrédients, tags, étapes, dates planifiées, commentaires) n'est pas gérée explicitement ici et repose sur les contraintes `ON DELETE CASCADE` définies au niveau du schéma de base de données

## `toggleFavorite(recipeId): Promise<void>`

* **Paramètres**

  * `recipeId` : identifiant de la recette (uuid, requis)

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `UPDATE recipes SET favorite = NOT favorite WHERE id = $1` : bascule l'état favori de façon atomique côté SQL, sans lecture préalable de la valeur actuelle ni valeur explicite passée en paramètre

## `addPlannedDate(recipeId, date): Promise<void>`

* **Paramètres**

  * `recipeId` : identifiant de la recette (uuid, requis)
  * `date` : date planifiée au format `YYYY-MM-DD` (string, requis)

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `INSERT INTO recipe_planned_dates (recipe_id, planned_date) VALUES ($1, $2) ON CONFLICT DO NOTHING` : idempotent — planifier deux fois la même recette au même jour ne crée pas de doublon et ne lève pas d'erreur

## `removePlannedDate(recipeId, date): Promise<void>`

* **Paramètres**

  * `recipeId` : identifiant de la recette (uuid, requis)
  * `date` : date planifiée à retirer, au format `YYYY-MM-DD` (string, requis)

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `DELETE FROM recipe_planned_dates WHERE recipe_id = $1 AND planned_date = $2` : suppression ciblée sur la paire recette/date, sans effet si la date n'était pas planifiée
