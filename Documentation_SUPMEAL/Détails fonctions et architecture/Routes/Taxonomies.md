# Taxonomies Routes

Regroupe cinq fichiers de routes strictement identiques dans leur structure — `allergens.js`, `cuisines.js`, `diets.js`, `difficulty.js`, `mealTypes.js` — chacun exposant une unique route `GET /` qui renvoie une liste statique prédéfinie en mémoire (`ALLERGENS`, `CUISINES`, `DIETS`, `DIFFICULTY_LEVELS`, `MEAL_TYPES`, définies dans les fichiers correspondants de `utils/`). Aucune n'exige `requireAuth` : ce sont des référentiels publics, nécessaires pour afficher les formulaires (inscription aux préférences, création de recette) avant même que l'utilisateur soit authentifié.

Ces valeurs sont volontairement figées côté serveur plutôt que laissées en texte libre, pour deux raisons : garantir une cohérence des données (un même allergène ou une même cuisine est toujours représenté par la même valeur `value`, ce qui permet de le retrouver de façon fiable) et permettre le rapprochement automatique entre les préférences d'un utilisateur (`utils/users.js`, `utils/suggestions.js`) et les tags/allergènes portés par une recette lors du calcul des suggestions personnalisées (`GET /recipes/suggestions`) — un rapprochement par correspondance exacte de `value` serait impossible si les libellés étaient saisis librement.

## `GET /api/allergens`

* **Paramètres**

  * Aucun paramètre.

* **Retour**

  * Statut 200 : array de 14 allergènes `{ value, label }`, correspondant aux 14 allergènes à déclaration obligatoire de la réglementation européenne (gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques).

* **Lignes importantes**

  * Liste statique exportée telle quelle : `res.json(ALLERGENS)`.
  * `ALLERGEN_VALUES` (dérivé par `.map((a) => a.value)`) est réutilisé pour valider `PATCH /users/me/preferences` et pour le filtrage anti-allergènes de `GET /recipes/suggestions`.

## `GET /api/diets`

* **Paramètres**

  * Aucun paramètre.

* **Retour**

  * Statut 200 : array de 6 régimes `{ value, label }` (végétarien, végan, sans gluten, sans lactose, pescétarien, faible en glucides).

* **Lignes importantes**

  * Liste statique exportée telle quelle : `res.json(DIETS)`.
  * `DIET_VALUES` est réutilisé à la fois comme référentiel de validation des préférences utilisateur et comme sous-ensemble des tags valides sur une recette (`TAG_VALUES` dans `routes/recipes.js`).

## `GET /api/cuisines`

* **Paramètres**

  * Aucun paramètre.

* **Retour**

  * Statut 200 : array de 14 cuisines `{ value, label }` (française, italienne, espagnole, méditerranéenne, moyen-orientale, indienne, asiatique, chinoise, japonaise, coréenne, thaïlandaise, mexicaine, américaine, africaine).

* **Lignes importantes**

  * Liste statique exportée telle quelle : `res.json(CUISINES)`.
  * `CUISINE_VALUES` sert à la fois à valider `favoriteCuisines` côté utilisateur et à composer `TAG_VALUES` côté recette ; c'est ce recoupement de valeurs qui permet à `suggestRecipes` de faire correspondre les cuisines favorites d'un utilisateur aux tags d'une recette.

## `GET /api/meal-types`

* **Paramètres**

  * Aucun paramètre.

* **Retour**

  * Statut 200 : array de 9 types de plat/moment de repas `{ value, label }` (entrée, plat principal, accompagnement, dessert, apéritif, boisson, sauce, petit-déjeuner/brunch, goûter).

* **Lignes importantes**

  * Liste statique exportée telle quelle : `res.json(MEAL_TYPES)`.
  * `MEAL_TYPE_VALUES` compose lui aussi `TAG_VALUES` dans `routes/recipes.js`, utilisé pour valider les tags envoyés à la création/modification d'une recette.

## `GET /api/difficulty-levels`

* **Paramètres**

  * Aucun paramètre.

* **Retour**

  * Statut 200 : array de 4 niveaux de difficulté `{ value, label }` (très facile, facile, moyen, difficile).

* **Lignes importantes**

  * Liste statique exportée telle quelle : `res.json(DIFFICULTY_LEVELS)`.
  * `DIFFICULTY_VALUES` est le seul référentiel de taxonomie qui n'est pas combiné dans `TAG_VALUES` : la difficulté d'une recette est validée séparément (`validateRecipeCategories`), car elle correspond à une colonne dédiée (`difficulty`) et non à un tag parmi d'autres.
