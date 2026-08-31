# Messages Utils

## `listMessages(cookbookId): Promise<Array<object>>`

* **Paramètres**

  * `cookbookId` : identifiant du cookbook dont on liste les messages (uuid, requis)

* **Retour**

  * `Promise<Array<object>>` : messages du cookbook triés chronologiquement, chacun sous la forme `{ id, userId, text, createdAt, editedAt, user: { id, name, email, avatar } }`

* **Lignes importantes**

  * `SELECT_WITH_USER` : requête SQL partagée (avec `JOIN users u ON u.id = m.user_id`) réutilisée par `listMessages`, `createMessage` et `updateMessage`, pour éviter de dupliquer la jointure dans chaque fonction
  * `ORDER BY m.created_at` : ordre chronologique croissant (les plus anciens messages en premier), adapté à l'affichage d'un fil de discussion
  * `shapeMessageRow(row)` : fonction de mapping commune qui convertit chaque ligne SQL (snake_case) en objet JS (camelCase) avec un sous-objet `user`

## `createMessage(cookbookId, userId, text): Promise<object>`

* **Paramètres**

  * `cookbookId` : identifiant du cookbook (uuid, requis)
  * `userId` : identifiant de l'auteur du message (uuid, requis)
  * `text` : contenu du message (string, requis)

* **Retour**

  * `Promise<object>` : le message créé, entièrement hydraté avec les informations de son auteur

* **Lignes importantes**

  * `INSERT INTO messages (cookbook_id, user_id, text) VALUES ($1, $2, $3) RETURNING id` : insertion minimale, ne renvoie que l'id généré
  * `${SELECT_WITH_USER} WHERE m.id = $1` exécuté juste après l'insertion : recharge la ligne complète avec la jointure `users`, car un simple `RETURNING *` ne suffirait pas à obtenir les informations de profil de l'auteur
  * `shapeMessageRow(full[0])` : renvoie un objet dans le même format que celui produit par `listMessages`

## `updateMessage(messageId, text): Promise<object>`

* **Paramètres**

  * `messageId` : identifiant du message à modifier (uuid, requis)
  * `text` : nouveau contenu du message (string, requis)

* **Retour**

  * `Promise<object>` : le message mis à jour, réhydraté avec les informations de son auteur

* **Lignes importantes**

  * `UPDATE messages SET text = $1, edited_at = now() WHERE id = $2` : met aussi à jour l'horodatage `edited_at`, ce qui permet au client d'afficher un indicateur "modifié"
  * relecture via `SELECT_WITH_USER` après la mise à jour, plutôt qu'un `RETURNING`, pour rester cohérent avec `createMessage` et récupérer les infos utilisateur au passage

## `deleteMessage(messageId): Promise<void>`

* **Paramètres**

  * `messageId` : identifiant du message à supprimer (uuid, requis)

* **Retour**

  * `Promise<void>`

* **Lignes importantes**

  * `DELETE FROM messages WHERE id = $1` : suppression directe et définitive, sans étape de confirmation côté base de données

## `getMessage(messageId): Promise<object|null>`

* **Paramètres**

  * `messageId` : identifiant du message (uuid, requis)

* **Retour**

  * `Promise<object|null>` : version allégée du message `{ id, cookbook_id, user_id }` (sans les informations de profil), ou `null` s'il n'existe pas

* **Lignes importantes**

  * `SELECT id, cookbook_id, user_id FROM messages WHERE id = $1` : requête volontairement minimale, sans jointure `users`
  * `rows[0] || null` : utilisée en amont d'`updateMessage`/`deleteMessage` côté route pour vérifier que le message existe et que son `user_id` correspond bien à l'utilisateur qui tente l'action, sans avoir besoin des informations de profil complètes
