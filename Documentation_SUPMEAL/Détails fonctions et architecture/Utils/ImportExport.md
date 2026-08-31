# ImportExport Utils

## `gatherExportData(userId): Promise<object>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur dont on exporte les données (uuid, requis)

* **Retour**

  * `Promise<object>` : `{ exportedAt: string (ISO), cookbooks: Array<object>, recipes: Array<object> }`

* **Lignes importantes**

  * `const summaries = await listCookbooksForUser(userId);` puis `Promise.all(summaries.map((cb) => getCookbookDetail(cb.id)))` : récupère d'abord la liste des cookbooks accessibles, puis recharge le détail complet de chacun en parallèle plutôt que séquentiellement
  * `findRecipeIds(userId, {})` : appelé sans aucun filtre, donc exporte l'intégralité des recettes accessibles à l'utilisateur (possédées et partagées via un cookbook)
  * `shapeRecipes(recipeIds, { includeComments: true })` : contrairement à un affichage classique, l'export inclut aussi les commentaires de chaque recette
  * `exportedAt: new Date().toISOString()` : horodatage de génération de l'export, utile pour dater le fichier produit côté client

## `applyImport(userId, payload): Promise<object>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur qui importe les données (uuid, requis)
  * `payload` : contenu à importer (object, requis) — `{ cookbooks?: Array<object>, recipes?: Array<object> }`, au format produit par `gatherExportData` ou par `csvToImportPayload`

* **Retour**

  * `Promise<object>` : `{ cookbooksImported: number, recipesImported: number }`

* **Lignes importantes**

  * `const idMap = {};` : table de correspondance entre les anciens identifiants de cookbook présents dans `payload` et les nouveaux identifiants générés en base, nécessaire pour ré-attacher correctement chaque recette importée à son cookbook
  * `INSERT INTO cookbooks (name, description, created_by) VALUES ($1, $2, $3) RETURNING id` suivi de `INSERT INTO cookbook_members (cookbook_id, user_id, role) VALUES ($1, $2, 'creator')` : l'utilisateur qui importe devient systématiquement `creator` du cookbook recréé, jamais un simple membre
  * `cb.name || 'Cookbook importé'` et `r.title || 'Recette sans titre'` : valeurs de repli si le fichier importé a des champs manquants
  * `const cookbookId = r.cookbookId ? idMap[r.cookbookId] || null : null;` : si le cookbook référencé par la recette n'a pas été importé (absent de `idMap`), la recette est rattachée à `null` (aucun cookbook) plutôt que de faire échouer tout l'import
  * délégation à `createRecipe(userId, { ... })` : réutilise toute la logique de normalisation et de création des enfants (ingrédients/tags/étapes) plutôt que de la dupliquer
  * `if (r.favorite) await toggleFavorite(recipeId);` : la recette est toujours créée non favorite par défaut, puis basculée dans un second appel si le champ `favorite` du payload l'exige (car `toggleFavorite` inverse l'état plutôt que de le fixer)
