# Suggestions Utils

## `suggestRecipes(recipes, preferences, limit = 8): Array<object>`

* **Paramètres**

  * `recipes` : recettes déjà façonnées (issues de `shapeRecipes`) parmi lesquelles choisir des suggestions (array d'objet, requis)
  * `preferences` : préférences de l'utilisateur (object, optionnel) — `{ diets: string[], allergies: string[], favoriteCuisines: string[] }`
  * `limit` : nombre maximum de suggestions renvoyées (number, optionnel, défaut `8`)

* **Retour**

  * `Array<object>` : sous-ensemble de `recipes` (fonction synchrone, pas de `Promise` — tout le calcul se fait en mémoire sur des données déjà chargées), débarrassé des recettes contenant un allergène, trié par score de pertinence décroissant et tronqué à `limit` éléments

* **Lignes importantes**

  * `const ALLERGEN_LABEL_BY_VALUE = new Map(ALLERGENS.map((a) => [a.value, a.label.toLowerCase()]));` : précalculée une seule fois au chargement du module, associe chaque valeur d'allergène contrôlée (ex. `lait`) à son libellé français en minuscule, pour pouvoir la comparer à des noms d'ingrédients en texte libre
  * exclusion des allergènes : `ingredientNames.some((name) => name.includes(label))` — correspondance par **sous-chaîne**, pas par égalité stricte : une recette contenant l'ingrédient "lait de coco" est exclue pour un utilisateur allergique au "lait", même s'il ne s'agit pas du même produit ; ce faux positif est volontaire (mieux vaut sur-exclure une recette que suggérer un allergène potentiel)
  * `.filter(...)` appliqué *avant* le calcul du score : une recette contenant un allergène est totalement retirée des suggestions, jamais simplement pénalisée dans le score
  * `if (cuisineValues.some((value) => tags.includes(value))) score += 3;` : +3 points si un tag de la recette correspond à une cuisine favorite de l'utilisateur — comparaison exacte sur les valeurs de tags, contrairement à la recherche par sous-chaîne utilisée pour les allergènes
  * `if (dietValues.some((value) => tags.includes(value))) score += 2;` : +2 points si un tag correspond à un régime alimentaire suivi par l'utilisateur
  * `if (r.favorite) score += 1;` : +1 point si la recette est déjà marquée favorite
  * `.sort((a, b) => b.score - a.score)` : tri strictement décroissant par score total (cuisine + régime + favori, cumulables jusqu'à 6 points)
  * `.slice(0, limit).map((x) => x.recipe)` : la troncature à `limit` a lieu avant de désenvelopper la structure intermédiaire `{ recipe, score }`, pour ne renvoyer que les objets recette au format attendu par l'appelant
