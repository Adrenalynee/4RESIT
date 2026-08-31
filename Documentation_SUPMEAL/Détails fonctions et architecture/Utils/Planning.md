# Planning Utils

## `addDaysIso(iso, amount): string` (fonction interne)

* **Paramètres**

  * `iso` : date de référence au format `YYYY-MM-DD` (string, requis)
  * `amount` : nombre de jours à ajouter (number, requis, peut être 0)

* **Retour**

  * `string` : nouvelle date au format `YYYY-MM-DD`, non exportée, utilisée uniquement par `getShoppingList`

* **Lignes importantes**

  * `` new Date(`${iso}T00:00:00Z`) `` : force l'interprétation de la date en UTC (minuit UTC) plutôt qu'en fuseau horaire local, pour éviter qu'un décalage de fuseau ne fasse "glisser" la date d'un jour
  * `d.setUTCDate(d.getUTCDate() + amount)` : addition en jours calendaires via les méthodes UTC (et non les méthodes locales `getDate`/`setDate`)
  * `d.toISOString().slice(0, 10)` : ne conserve que la partie `YYYY-MM-DD` de l'horodatage ISO complet

## `getShoppingList(userId, weekStart): Promise<Array<object>>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur (uuid, requis)
  * `weekStart` : date de début de la semaine au format `YYYY-MM-DD` (string, requis)

* **Retour**

  * `Promise<Array<object>>` : liste de lignes de courses fusionnées, chacune sous la forme `{ key, name, unit, qty: number|null, mixed: boolean }`

* **Lignes importantes**

  * `` const weekDates = new Set(Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i))); `` : matérialise les 7 jours de la semaine (de `weekStart` à `weekStart + 6`) sous forme d'un `Set` de dates ISO, pour des recherches d'appartenance en O(1)
  * `findRecipeIds(userId, {})` puis `shapeRecipes(recipeIds)` : charge toutes les recettes accessibles à l'utilisateur (possédées + cookbooks partagés), sans filtre, avant de ne garder que celles réellement planifiées cette semaine
  * `const occurrences = recipe.plannedDates.filter((d) => weekDates.has(d)).length;` : compte combien de fois la recette est planifiée *dans la semaine ciblée* — une recette planifiée trois jours différents de la semaine compte trois occurrences
  * `for (let i = 0; i < occurrences; i++) { for (const ing of recipe.ingredients) { ... } }` : chaque ingrédient de la recette est traité une fois par occurrence, ce qui multiplie effectivement les quantités par le nombre de jours où la recette est planifiée dans la semaine
  * `` const key = `${name.toLowerCase()}|${unit.toLowerCase()}`; `` (avec `name`/`unit` déjà `trim()`) : clé de regroupement insensible à la casse et aux espaces superflues — "Tomate", "tomate" et " Tomate " avec la même unité sont fusionnées dans la même ligne de la liste de courses
  * `const qty = ing.quantity == null || ing.quantity === '' ? NaN : Number(ing.quantity);` : une quantité non renseignée est stockée `NULL` en base ; elle est traitée explicitement comme `NaN` avant conversion, car `Number(null)` vaut `0` (pas `NaN`) et transformerait silencieusement une quantité absente en une vraie quantité de zéro
  * `qty: Number.isNaN(qty) ? null : qty, mixed: Number.isNaN(qty)` : une quantité non numérique (texte libre, champ vide ou absent) initialise l'entrée avec `qty: null` et la marque directement comme `mixed`
  * lors d'une fusion ultérieure sur la même clé : `if (!Number.isNaN(qty) && entry.qty !== null) { entry.qty += qty; } else { entry.mixed = true; }` — l'addition n'a lieu que si la nouvelle quantité *et* l'entrée existante sont toutes deux numériques ; dès qu'une seule occurrence de l'ingrédient a une quantité non numérique, le drapeau `mixed` est levé de façon définitive pour toute la ligne (aucun retour à `false` possible)
  * `return [...merged.values()];` : aplati la `Map` de regroupement en un tableau simple, une entrée par couple (nom, unité) distinct rencontré dans la semaine

## `getShoppingChecks(userId, weekStart): Promise<object>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur (uuid, requis)
  * `weekStart` : date de début de la semaine au format `YYYY-MM-DD` (string, requis)

* **Retour**

  * `Promise<object>` : état des cases cochées de la liste de courses pour cette semaine, sous la forme `{ [itemKey]: true | number }` (`itemKey` correspondant à la clé `name|unit` produite par `getShoppingList`) ; objet vide `{}` si l'utilisateur n'a encore rien coché cette semaine-là

* **Lignes importantes**

  * `SELECT checked FROM shopping_checks WHERE user_id = $1 AND week_start = $2` : une seule ligne possible par couple (utilisateur, semaine), grâce à la clé primaire composite de la table
  * `rows[0]?.checked || {}` : renvoie un objet vide (et non `null`/`undefined`) en l'absence de ligne, pour que le frontend n'ait pas à gérer de cas particulier

## `saveShoppingChecks(userId, weekStart, checked): Promise<void>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur (uuid, requis)
  * `weekStart` : date de début de la semaine au format `YYYY-MM-DD` (string, requis)
  * `checked` : état complet des cases cochées à enregistrer pour cette semaine (object, requis) — remplace intégralement l'état précédent, ce n'est pas une fusion

* **Lignes importantes**

  * `INSERT ... ON CONFLICT (user_id, week_start) DO UPDATE SET checked = $3, updated_at = now()` : upsert — crée la ligne au premier changement de la semaine, la remplace ensuite à chaque appel suivant
  * Appelée par la route `PUT /api/planning/shopping-checks`, elle-même déclenchée côté client avec un debounce de 400 ms après chaque coche/décoche (voir `PlanningPage.jsx`), pour éviter une requête réseau à chaque clic
