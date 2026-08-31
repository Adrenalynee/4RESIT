# Taxonomies Utils

Regroupe cinq modules (`allergens.js`, `cuisines.js`, `diets.js`, `difficulty.js`, `mealTypes.js`) qui suivent tous le même patron : une constante `LIST` d'objets `{ value, label }` (valeur technique + libellé français affiché), et une constante `LIST_VALUES` dérivée ne conservant que les `value`, utilisée pour la validation côté serveur des données envoyées par le client (préférences utilisateur, champs de recette, etc.).

## `ALLERGENS` / `ALLERGEN_VALUES` (allergens.js)

* **Paramètres**

  * Aucun (constantes statiques, pas de fonction)

* **Retour**

  * `ALLERGENS` : array de 14 objets `{ value, label }` — allergènes reconnus (gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques)
  * `ALLERGEN_VALUES` : array de string, dérivé de `ALLERGENS`

* **Lignes importantes**

  * `export const ALLERGEN_VALUES = ALLERGENS.map((a) => a.value);` : dérivation automatique — toute entrée ajoutée à `ALLERGENS` devient immédiatement valide côté validation, sans duplication de liste

## `CUISINES` / `CUISINE_VALUES` (cuisines.js)

* **Paramètres**

  * Aucun

* **Retour**

  * `CUISINES` : array de 14 objets `{ value, label }` — cuisines du monde proposées comme préférence (française, italienne, asiatique, mexicaine, africaine, etc.)
  * `CUISINE_VALUES` : array de string, dérivé de `CUISINES`

* **Lignes importantes**

  * `export const CUISINE_VALUES = CUISINES.map((c) => c.value);` : même patron de dérivation que `ALLERGENS`, ces valeurs sont réutilisées par `suggestRecipes` pour comparer aux tags de recette (`favoriteCuisines`)

## `DIETS` / `DIET_VALUES` (diets.js)

* **Paramètres**

  * Aucun

* **Retour**

  * `DIETS` : array de 6 objets `{ value, label }` — régimes alimentaires (végétarien, végan, sans gluten, sans lactose, pescétarien, faible en glucides)
  * `DIET_VALUES` : array de string, dérivé de `DIETS`

* **Lignes importantes**

  * `export const DIET_VALUES = DIETS.map((d) => d.value);` : ces valeurs sont également celles comparées aux tags de recette dans `suggestRecipes` (+2 points de score si correspondance)

## `DIFFICULTY_LEVELS` / `DIFFICULTY_VALUES` (difficulty.js)

* **Paramètres**

  * Aucun

* **Retour**

  * `DIFFICULTY_LEVELS` : array de 4 objets `{ value, label }` — très facile, facile, moyen, difficile
  * `DIFFICULTY_VALUES` : array de string, dérivé de `DIFFICULTY_LEVELS`

* **Lignes importantes**

  * `export const DIFFICULTY_VALUES = DIFFICULTY_LEVELS.map((d) => d.value);` : liste utilisée pour valider le champ `difficulty` d'une recette (`createRecipe`/`updateRecipe`)

## `MEAL_TYPES` / `MEAL_TYPE_VALUES` (mealTypes.js)

* **Paramètres**

  * Aucun

* **Retour**

  * `MEAL_TYPES` : array de 9 objets `{ value, label }` — entrée, plat principal, accompagnement, dessert, apéritif, boisson, sauce, petit-déjeuner/brunch, goûter
  * `MEAL_TYPE_VALUES` : array de string, dérivé de `MEAL_TYPES`

* **Lignes importantes**

  * `export const MEAL_TYPE_VALUES = MEAL_TYPES.map((m) => m.value);` : même patron que les quatre autres modules — une seule source de vérité (`LIST`) dont dérive automatiquement la liste de validation (`LIST_VALUES`)
