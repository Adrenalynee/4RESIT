# Cookbooks Utils

## `listCookbooksForUser(userId): Promise<Array<object>>`

* **Paramètres**

  * `userId` : identifiant de l'utilisateur (uuid, requis)

* **Retour**

  * `Promise<Array<object>>` : liste des cookbooks dont l'utilisateur est membre, chacun sous la forme `{ id, name, description, members: [{ userId, role }], recipeIds: [] }`

* **Lignes importantes**

  * `JOIN cookbook_members cm ON cm.cookbook_id = cb.id AND cm.user_id = $1` : ne renvoie que les cookbooks dont l'utilisateur fait effectivement partie (pas de notion de cookbook public)
  * sous-requête `json_agg(json_build_object('userId', cm2.user_id, 'role', cm2.role))` : construit la liste des membres directement en SQL plutôt qu'avec une jointure séparée aplati côté JS
  * sous-requête `array_agg(r.id) FROM recipes r WHERE r.cookbook_id = cb.id` : ne renvoie que les identifiants des recettes du cookbook (pas leur contenu, pour rester léger dans un listing)
  * `COALESCE(..., '[]')` / `COALESCE(..., '{}')` : garantit des tableaux vides plutôt que `null` quand un cookbook n'a encore aucun membre ou aucune recette
  * `ORDER BY cb.created_at DESC` : les cookbooks les plus récents apparaissent en premier

## `getCookbookDetail(cookbookId): Promise<object|null>`

* **Paramètres**

  * `cookbookId` : identifiant du cookbook (uuid, requis)

* **Retour**

  * `Promise<object|null>` : détail complet `{ id, name, description, members: [{ userId, role, user: { id, name, email, avatar } }], recipeIds: [] }`, ou `null` si le cookbook n'existe pas

* **Lignes importantes**

  * `if (!cookbook) return null;` : sortie anticipée avant d'exécuter les deux requêtes suivantes si le cookbook cible n'existe pas
  * trois requêtes séparées (cookbook, membres+utilisateurs, recettes) plutôt qu'une seule requête à jointures multiples, pour garder des lignes plates faciles à ré-assembler en JS
  * `JOIN cookbook_members cm ... JOIN users u ON u.id = cm.user_id` : récupère, pour chaque membre, ses informations de profil complètes (nom, email, avatar), contrairement à `listCookbooksForUser` qui ne renvoie que l'id et le rôle
  * `ORDER BY cm.joined_at` : les membres sont listés dans leur ordre d'arrivée dans le cookbook

## `getMemberRole(cookbookId, userId): Promise<string|null>`

* **Paramètres**

  * `cookbookId` : identifiant du cookbook (uuid, requis)
  * `userId` : identifiant de l'utilisateur (uuid, requis)

* **Retour**

  * `Promise<string|null>` : rôle du membre (`creator`, `editor`, `commenter`, etc.) dans ce cookbook, ou `null` si l'utilisateur n'en est pas membre

* **Lignes importantes**

  * `SELECT role FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2` : requête directe sur la table d'association, sans jointure
  * `rows[0]?.role || null` : normalise l'absence de ligne (utilisateur non membre) en `null` plutôt qu'en `undefined`, utilisé ensuite comme base des contrôles d'autorisation dans `getRecipeAccessInfo`
