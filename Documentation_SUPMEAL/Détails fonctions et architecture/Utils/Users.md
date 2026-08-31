# Users Utils

## `getUserById(id): Promise<object|null>`

* **Paramètres**

  * `id` : identifiant de l'utilisateur (uuid, requis)

* **Retour**

  * `Promise<object|null>` : objet utilisateur normalisé `{ id, name, email, avatar, hasPassword, oauthProviders, preferences: { diets, allergies, favoriteCuisines, defaultServings } }`, ou `null` si l'utilisateur n'existe pas

* **Lignes importantes**

  * `(u.password_hash IS NOT NULL) AS has_password` : calcule côté SQL si l'utilisateur a un mot de passe local, sans jamais renvoyer le hash lui-même
  * `LEFT JOIN user_allergies ua ... LEFT JOIN user_diets ud ... LEFT JOIN user_cuisines uc ... LEFT JOIN oauth_accounts oa` : agrège en une seule requête les préférences et les fournisseurs OAuth liés à l'utilisateur
  * `COALESCE(array_agg(DISTINCT ua.allergy) FILTER (WHERE ua.allergy IS NOT NULL), '{}')` : évite les doublons et remplace un agrégat vide/`NULL` par un tableau vide plutôt que `null`
  * `GROUP BY u.id, up.default_servings` : nécessaire car `default_servings` provient d'une jointure simple mêlée aux agrégats des jointures multiples
  * `defaultServings: row.default_servings || 2` : valeur par défaut de 2 portions si l'utilisateur n'a pas encore de ligne dans `user_preferences`

## `replaceUserSet(table, column, userId, values): Promise<void>`

* **Paramètres**

  * `table` : nom de la table cible, ex. `user_diets` (string, requis, valeur contrôlée par le code appelant et non par l'utilisateur final)
  * `column` : nom de la colonne stockant la valeur, ex. `diet` (string, requis, même contrainte)
  * `userId` : identifiant de l'utilisateur (uuid, requis)
  * `values` : nouvelles valeurs à associer à l'utilisateur (array de string, requis, peut être vide)

* **Retour**

  * `Promise<void>` : aucune valeur retournée, remplace intégralement le contenu de la table pour cet utilisateur

* **Lignes importantes**

  * `` `DELETE FROM ${table} WHERE user_id = $1` `` : supprime d'abord toutes les valeurs existantes pour repartir d'un ensemble propre (pattern "replace-all")
  * `` `${table}` ``/`` `${column}` `` interpolés directement dans le SQL : le nom de table/colonne n'est jamais fourni par une requête HTTP, uniquement par les appels internes (`replaceUserSet('user_diets', 'diet', ...)`), ce qui évite l'injection SQL malgré l'absence de paramètre lié pour ces identifiants
  * `` values.map((_, i) => `($1, $${i + 2})`).join(', ') `` : construit dynamiquement autant de tuples `(user_id, valeur)` que de valeurs à insérer, avec un seul aller-retour vers la base
  * `if (values.length > 0)` : l'insertion est sautée si le tableau est vide (ex. l'utilisateur retire toutes ses allergies), le `DELETE` seul suffit alors à vider la table
