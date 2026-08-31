# Data Routes

Deux routeurs indépendants exportés par le même fichier : `exportRouter` monté sur `/api/export` et `importRouter` monté sur `/api/import`. Les deux routes exigent `requireAuth` directement en middleware de route (pas de `router.use` global, puisqu'il s'agit de deux routeurs distincts).

## `GET /api/export`

* **Paramètres**

  * `req.query.format` : `"json"` (défaut) ou `"csv"` (string, optionnel).

* **Retour**

  * Statut 200 : corps `application/json` (`{ exportedAt, cookbooks, recipes }`) ou `text/csv`, selon `format`, avec un en-tête `Content-Disposition: attachment` déclenchant un téléchargement de fichier.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Détermination du format par égalité stricte, toute valeur autre que `"csv"` retombe sur JSON : `const format = req.query.format === 'csv' ? 'csv' : 'json'`.
  * Agrégation de toutes les données de l'utilisateur avant sérialisation : `gatherExportData(req.userId)` (cookbooks détaillés + recettes avec commentaires).
  * Sérialisation CSV avec un encodage custom pour les champs composés : ingrédients en `quantity|unit|name` séparés par `;;` (`serializeIngredients`), tags séparés par `;`, étapes séparées par `;;`.
  * Nom de fichier fixe suggéré au téléchargement : `Content-Disposition: attachment; filename="supmeal-export.json"` (ou `.csv`).

## `POST /api/import`

* **Paramètres**

  * `req.body.format` : `"json"` ou `"csv"` (string, optionnel).
  * `req.body.content` : contenu brut du fichier à importer (string, requis).

* **Retour**

  * Statut 201 : `{ success: true, cookbooksImported, recipesImported }`.
  * Statut 400 : `content` manquant, ou fichier qui n'est ni un JSON ni un CSV SUPMEAL valide (échec de parsing).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Parsing conditionnel selon le format déclaré, avec un `catch` générique qui uniformise l'erreur pour les deux formats : `payload = format === 'csv' ? csvToImportPayload(content) : JSON.parse(content)`.
  * Remappage des IDs de cookbook lors de l'import : une table `idMap` relie les anciens ID (ceux de l'export JSON, ou des ID synthétiques `csv-cb-N` générés par le parseur CSV) aux nouveaux ID insérés en base.
  * Valeurs de repli si un champ est absent du fichier importé : `cb.name || 'Cookbook importé'`, `r.title || 'Recette sans titre'`.
  * Tout ce qui est importé est recréé sous la propriété de l'utilisateur courant (`createRecipe(userId, ...)`, `created_by = userId`) : l'import ne restaure pas la propriété ni les membres d'origine, il régénère un jeu de données propre à l'utilisateur qui importe.
  * Une recette marquée favorite dans le fichier est basculée après création via le même mécanisme que `POST /:id/toggle-favorite` : `if (r.favorite) await toggleFavorite(recipeId)`.
