# Uploads Routes

Fichier monté sur `/api/uploads`. Route unique d'upload d'image générique (avatar, image de recette, ...), utilisée par les autres routes qui stockent ensuite l'URL retournée (`avatar_url`, `image_url`).

## `POST /`

* **Paramètres**

  * Requête `multipart/form-data` avec un champ de fichier nommé `file` (requis).
  * `req.userId` (via `requireAuth`).

* **Retour**

  * Statut 201 : `{ url: "/uploads/<uuid>.<ext>" }`.
  * Statut 400 : format d'image non autorisé, fichier dépassant 5 Mo, ou aucun fichier reçu.
  * Statut 401 : non authentifié.

* **Lignes importantes**

  * Whitelist stricte par type MIME déclaré, l'extension stockée est dérivée de cette table et jamais du nom de fichier envoyé par le client : `const ALLOWED_MIME_TO_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }`.
  * SVG exclu volontairement de la whitelist : un SVG peut embarquer du JavaScript exécuté si le fichier est ouvert directement, ce qui exposerait à une XSS stockée.
  * Nom de fichier généré côté serveur, imprévisible et sans rapport avec le nom d'origine : `filename: (req, file, cb) => cb(null, \`${randomUUID()}${ALLOWED_MIME_TO_EXT[file.mimetype]}\`)`.
  * Limite de taille appliquée par Multer avant même l'écriture disque : `limits: { fileSize: 5 * 1024 * 1024 }`.
  * Rejet au niveau du filtre si le MIME n'est pas dans la table, avant tout traitement du fichier : `fileFilter: (req, file, cb) => { if (!ALLOWED_MIME_TO_EXT[file.mimetype]) return cb(new Error(...)); cb(null, true); }`.
  * Appel manuel de Multer (plutôt qu'en middleware de route classique) pour intercepter ses erreurs et répondre en JSON au lieu de laisser planter la requête : `upload.single('file')(req, res, (err) => {...})`.
  * Message dédié pour le dépassement de taille : `err.code === 'LIMIT_FILE_SIZE' ? 'Image trop volumineuse (max 5 Mo)' : err.message`.
