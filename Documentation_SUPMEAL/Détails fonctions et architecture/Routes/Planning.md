# Planning Routes

Fichier monté sur `/api/planning`. Toutes les routes passent par `router.use(requireAuth)`.

## `GET /shopping-list`

* **Paramètres**

  * `req.query.weekStart` : premier jour de la semaine au format `YYYY-MM-DD` (string, requis).

* **Retour**

  * Statut 200 : array d'articles `{ key, name, unit, qty, mixed }`.
  * Statut 400 : `weekStart` manquant ou ne respectant pas le format attendu.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Validation stricte du format de date par regex : `if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart))`.
  * Fenêtre de 7 jours calculée en UTC à partir de `weekStart` : `Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i))`.
  * Récupère toutes les recettes accessibles à l'utilisateur (possédées ou dans un cookbook dont il est membre), puis ne garde que les occurrences planifiées dans la semaine demandée : `recipe.plannedDates.filter((d) => weekDates.has(d)).length`.
  * Une même recette planifiée plusieurs fois dans la semaine multiplie ses ingrédients d'autant : boucle `for (let i = 0; i < occurrences; i++)`.
  * Fusion des ingrédients par nom et unité, insensible à la casse : `const key = \`${name.toLowerCase()}|${unit.toLowerCase()}\``.
  * Marqueur `mixed` lorsque la quantité n'est pas numérique ou que des quantités numériques et non numériques se mélangent pour le même article, afin de ne pas afficher une somme trompeuse : `entry.mixed = true`.
