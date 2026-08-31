# Users Routes

Fichier monté sur `/api/users`. Toutes les routes passent par `router.use(requireAuth)` : chaque handler dispose donc de `req.userId` et ne peut agir que sur le compte de l'utilisateur authentifié (aucune route ne prend d'ID utilisateur en paramètre).

## `PATCH /me`

* **Paramètres**

  * `req.body.name` : nouveau pseudo (string, optionnel).
  * `req.body.avatar` : nouvelle URL d'avatar (string, optionnel).

* **Retour**

  * Statut 200 : `{ user }` mis à jour.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Construction dynamique de la requête `UPDATE` selon les champs réellement fournis : `if (name !== undefined) { values.push(name); fields.push(...) }`.
  * Récupération de l'ancien avatar avant mise à jour, pour pouvoir le nettoyer ensuite : `SELECT avatar_url FROM users WHERE id = $1`.
  * Suppression du fichier orphelin uniquement si l'avatar a réellement changé : `if (avatar !== undefined && avatar !== oldAvatar) { await deleteUploadedFile(oldAvatar); }`.
  * `deleteUploadedFile` (`utils/uploads.js`) ignore silencieusement les URLs qui ne pointent pas vers `/uploads/` (ex. avatar externe type pravatar.cc) : rien n'est supprimé sur le disque dans ce cas.

## `PATCH /me/preferences`

* **Paramètres**

  * `req.body.diets` : liste de régimes alimentaires (array de string, optionnel, défaut `[]`).
  * `req.body.allergies` : liste d'allergènes (array de string, optionnel, défaut `[]`).
  * `req.body.favoriteCuisines` : liste de cuisines favorites (array de string, optionnel, défaut `[]`).
  * `req.body.defaultServings` : nombre de portions par défaut (number, optionnel, défaut `2`).

* **Retour**

  * Statut 200 : `{ user }` mis à jour avec ses nouvelles préférences.
  * Statut 400 : `{ error }` listant les valeurs invalides — allergène(s), régime(s) ou cuisine(s) hors des listes prédéfinies.
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Validation stricte de chaque liste contre son référentiel figé (voir `Taxonomies.md`) : `allergies.filter((a) => !ALLERGEN_VALUES.includes(a))`, même logique pour `diets` et `favoriteCuisines`.
  * Mise à jour du nombre de portions : `UPDATE user_preferences SET default_servings = $1 WHERE user_id = $2`.
  * Remplacement complet (et non incrémental) de chaque ensemble de préférences via `replaceUserSet` : `DELETE FROM ${table} WHERE user_id = $1` suivi d'une réinsertion en lot des nouvelles valeurs — la liste envoyée par le client remplace donc toujours l'état précédent.

## `PATCH /me/password`

* **Paramètres**

  * `req.body.currentPassword` : mot de passe actuel (string, requis).
  * `req.body.newPassword` : nouveau mot de passe (string, requis).

* **Retour**

  * Statut 200 : `{ success: true }`.
  * Statut 400 : champ manquant.
  * Statut 401 : mot de passe actuel incorrect, ou compte sans mot de passe local (ex. compte Google pur, qui n'a pas de `password_hash`).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Validation des champs obligatoires : `if (!currentPassword || !newPassword)`.
  * Protection des comptes uniquement OAuth : `if (!hash || !(await bcrypt.compare(currentPassword, hash)))` renvoie 401 aussi bien si le hash est absent que s'il ne correspond pas.
  * Hashage du nouveau mot de passe : `bcrypt.hash(newPassword, 10)`.
  * À la différence de `POST /register`, cette route ne rappelle pas `isPasswordStrong` sur `newPassword` : aucune contrainte de robustesse n'est revérifiée côté serveur lors d'un changement de mot de passe.

## `DELETE /me`

* **Paramètres**

  * `req.body.password` : mot de passe de confirmation (string, requis uniquement si le compte a un mot de passe local ; ignoré/absent pour un compte créé exclusivement via Google OAuth).

* **Retour**

  * Statut 200 : `{ success: true }`.
  * Statut 401 : mot de passe incorrect (uniquement si le compte a un `password_hash`).
  * Statut 500 : erreur serveur.

* **Lignes importantes**

  * Vérification conditionnelle du mot de passe, uniquement si un hash existe : `if (hash && !(await bcrypt.compare(password || '', hash)))`. Un compte sans `password_hash` (OAuth pur) saute cette vérification et la suppression est acceptée sans mot de passe — sinon l'utilisateur n'aurait aucun moyen de supprimer son compte.
  * Côté client, `ConfirmDeleteAccountModal` reçoit `requirePassword={user.hasPassword}` : le champ mot de passe n'est affiché (et requis) que si le compte en a un.
  * Suppression du compte : `DELETE FROM users WHERE id = $1` — les données liées (recettes possédées, adhésions aux cookbooks, commentaires) sont supprimées ou détachées via les contraintes de clé étrangère en base.
  * Nettoyage de l'avatar uploadé associé après suppression : `await deleteUploadedFile(rows[0]?.avatar_url)`.
