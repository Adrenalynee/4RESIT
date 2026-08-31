# Cookbooks Routes

Fichier monté sur `/api/cookbooks`. Toutes les routes passent par `router.use(requireAuth)`. Les routes portant sur un cookbook précis (`/:id...`) sont en plus protégées par le middleware `requireCookbookRole(...allowedRoles)` (`middleware/cookbookRole.js`) : appelé sans argument il exige simplement que l'utilisateur soit membre du cookbook, quel que soit son rôle ; appelé avec un rôle (ici toujours `'creator'`) il exige ce rôle exact. Les rôles assignables à un membre via l'API sont limités à `ASSIGNABLE_ROLES = ['editor', 'reader', 'commenter']` — `'creator'` n'est jamais attribuable, il n'existe que pour le créateur d'origine.

## `GET /`

* **Paramètres**

  * `req.userId` (via `requireAuth`).

* **Retour**

  * Statut 200 : array de cookbooks `{ id, name, description, members, recipeIds }`.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Aucun middleware de rôle : la portée est déjà restreinte par la jointure elle-même, qui ne renvoie que les cookbooks dont l'utilisateur est membre : `JOIN cookbook_members cm ON cm.cookbook_id = cb.id AND cm.user_id = $1` (`listCookbooksForUser`).

## `POST /`

* **Paramètres**

  * `req.body.name` : nom du cookbook (string, requis).
  * `req.body.description` : description (string, optionnel, défaut `''`).

* **Retour**

  * Statut 201 : cookbook créé (avec l'utilisateur courant comme unique membre).
  * Statut 400 : nom manquant.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Validation : `if (!name) return res.status(400).json({ error: 'Le nom du cookbook est requis' })`.
  * Auto-adhésion du créateur avec le rôle spécial `'creator'`, non assignable ensuite par l'API : `INSERT INTO cookbook_members (cookbook_id, user_id, role) VALUES ($1, $2, 'creator')`.

## `GET /:id`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).

* **Retour**

  * Statut 200 : détail du cookbook `{ id, name, description, members, recipeIds }`.
  * Statut 403 : utilisateur non membre du cookbook (`requireCookbookRole()`).
  * Statut 404 : cookbook introuvable.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Middleware sans rôle imposé : `requireCookbookRole()` — accepte tout membre (creator, editor, reader, commenter) : `if (!role) return res.status(403)...`.
  * Garde défensive supplémentaire dans le handler : `if (!cookbook) return res.status(404)...`.

## `GET /:id/messages`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).

* **Retour**

  * Statut 200 : array de messages du chat du cookbook, triés chronologiquement, avec les informations de l'auteur.
  * Statut 403 : utilisateur non membre.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Même garde que `GET /:id` : `requireCookbookRole()`, ouverte à tous les rôles.
  * Jointure utilisateur systématique pour éviter un aller-retour supplémentaire côté client : `SELECT_WITH_USER` dans `utils/messages.js`.

## `PATCH /:id`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).
  * `req.body.name` : nouveau nom (string, optionnel).
  * `req.body.description` : nouvelle description (string, optionnel).

* **Retour**

  * Statut 200 : cookbook mis à jour.
  * Statut 400 : nom fourni mais vide après suppression des espaces.
  * Statut 403 : utilisateur n'a pas le rôle `'creator'`.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Rôle strict exigé : `requireCookbookRole('creator')`.
  * Validation du nom après `trim` : `if (name !== undefined && !name.trim())`.
  * Mise à jour dynamique selon les champs fournis, même mécanisme que `PATCH /me` côté utilisateurs.

## `DELETE /:id`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).

* **Retour**

  * Statut 200 : `{ success: true }`.
  * Statut 403 : utilisateur n'a pas le rôle `'creator'`.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * `requireCookbookRole('creator')` : seul le créateur peut supprimer le cookbook.
  * Suppression : `DELETE FROM cookbooks WHERE id = $1`.

## `POST /:id/members`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).
  * `req.body.identifier` : email ou pseudo de l'utilisateur à inviter (string, requis).
  * `req.body.role` : rôle à attribuer (string, optionnel, défaut `'reader'`, doit appartenir à `ASSIGNABLE_ROLES`).

* **Retour**

  * Statut 201 : cookbook mis à jour avec le nouveau membre.
  * Statut 400 : identifiant manquant ou rôle invalide.
  * Statut 403 : utilisateur n'a pas le rôle `'creator'`.
  * Statut 404 : aucun utilisateur ne correspond à l'identifiant.
  * Statut 409 : utilisateur déjà membre du cookbook.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Rôle strict exigé pour inviter : `requireCookbookRole('creator')`.
  * Whitelist des rôles assignables, `'creator'` en est exclu : `if (!ASSIGNABLE_ROLES.includes(role))`.
  * Recherche souple par email ou pseudo : `SELECT id FROM users WHERE email = $1 OR name = $1`.
  * Anti-doublon avant insertion : `const existingRole = await getMemberRole(...); if (existingRole) return res.status(409)...`.

## `PATCH /:id/members/:userId`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).
  * `req.params.userId` : ID du membre visé (requis).
  * `req.body.role` : nouveau rôle (string, requis, doit appartenir à `ASSIGNABLE_ROLES`).

* **Retour**

  * Statut 200 : cookbook mis à jour.
  * Statut 400 : rôle invalide, ou tentative de modifier le rôle du créateur.
  * Statut 403 : utilisateur courant n'a pas le rôle `'creator'`.
  * Statut 404 : membre introuvable dans ce cookbook.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Protection du rôle spécial : `if (targetRole === 'creator') return res.status(400).json({ error: 'Le rôle du créateur ne peut pas être modifié' })`.
  * Vérification préalable d'existence du membre ciblé avant toute écriture : `const targetRole = await getMemberRole(req.params.id, req.params.userId); if (!targetRole) return res.status(404)...`.

## `DELETE /:id/members/:userId`

* **Paramètres**

  * `req.params.id` : ID du cookbook (requis).
  * `req.params.userId` : ID du membre à retirer (requis).

* **Retour**

  * Statut 200 : cookbook mis à jour (sans le membre retiré).
  * Statut 400 : tentative de retirer le créateur.
  * Statut 403 : utilisateur courant n'a pas le rôle `'creator'`.
  * Statut 404 : membre introuvable.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Même garde que la modification de rôle, appliquée cette fois au retrait : `if (targetRole === 'creator') return res.status(400).json({ error: 'Le créateur ne peut pas être retiré du cookbook' })`.
  * Suppression de l'adhésion : `DELETE FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2`.
