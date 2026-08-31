# Csv Utils

## `recipesToCsv(recipes, cookbooksById): string`

* **Paramètres**

  * `recipes` : recettes déjà façonnées, issues de `shapeRecipes` (array d'objet, requis)
  * `cookbooksById` : dictionnaire `id -> cookbook` permettant de résoudre le nom du cookbook de chaque recette (object, requis)

* **Retour**

  * `string` : contenu CSV complet (ligne d'en-tête puis une ligne par recette), séparateur `,`, fin de ligne `\r\n`

* **Lignes importantes**

  * `CSV_HEADERS = ['title', 'cookbook', 'prepTime', 'cookTime', 'servings', 'tags', 'source', 'favorite', 'ingredients', 'steps']` : fixe l'ordre et le nom exact des colonnes, réutilisé ensuite par `csvToImportPayload` pour relire le fichier
  * `escapeCsvField` : entoure la valeur de guillemets et double les guillemets internes (`.replace(/"/g, '""')`) uniquement si elle contient une virgule, un guillemet ou un retour à la ligne — respecte le format CSV standard sans alourdir les champs simples
  * `serializeIngredients` : encode chaque ingrédient en `quantity|unit|name` puis joint la liste d'ingrédients par `;;` — deux niveaux de séparateurs distincts (`|` pour les champs d'un ingrédient, `;;` entre ingrédients) pour éviter toute ambiguïté avec les valeurs elles-mêmes
  * `(r.tags || []).join(';')` et `(r.steps || []).join(';;')` : les tags utilisent `;` (valeurs courtes, peu de risque de collision) tandis que les étapes utilisent `;;` (texte libre pouvant contenir des virgules ou points-virgules)
  * `r.favorite ? 'true' : 'false'` : le booléen est sérialisé en toutes lettres pour rester lisible dans le fichier CSV brut

## `csvToImportPayload(text): object`

* **Paramètres**

  * `text` : contenu brut d'un fichier CSV (string, requis)

* **Retour**

  * `object` : `{ cookbooks: Array<{ id, name, description }>, recipes: Array<object> }`, dans le même format que celui attendu par `applyImport`

* **Lignes importantes**

  * `parseCsvRows` : parseur CSV écrit à la main (machine à états caractère par caractère, avec un drapeau `inQuotes`) plutôt qu'une simple découpe sur `,` — gère les champs entre guillemets contenant des virgules ou des retours à la ligne, ainsi que les guillemets doublés `""` comme guillemet littéral
  * `const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));` : indexe chaque colonne par le nom de son en-tête plutôt que par une position fixe, ce qui tolère un ordre de colonnes différent de `CSV_HEADERS`
  * `if (cols.length === 1 && cols[0] === '') return;` : ignore silencieusement les lignes vides (ex. ligne finale vide d'un fichier)
  * `cookbooksByName` (Map) : déduplique les cookbooks par nom et leur attribue un identifiant temporaire `csv-cb-${index}`, réutilisé comme `cookbookId` par toutes les recettes de ce même cookbook dans le fichier
  * identifiants temporaires `csv-r-${i}` / `csv-cb-${n}` : jouent le même rôle que les ids présents dans un export JSON — ils sont ensuite consommés par `applyImport` via son `idMap` pour recréer les cookbooks avec de vrais identifiants de base de données
  * `parseIngredients` : opération inverse de `serializeIngredients` (découpe sur `;;` puis sur `|`), tolérante aux champs vides via `raw.split(';;').filter(Boolean)`
