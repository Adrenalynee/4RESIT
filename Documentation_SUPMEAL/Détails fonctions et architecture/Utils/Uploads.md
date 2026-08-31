# Uploads Utils

## `deleteUploadedFile(url): Promise<void>`

* **Paramètres**

  * `url` : chemin ou URL du fichier tel que stocké en base (string ou `null`, optionnel), ex. `/uploads/3f2a...png`

* **Retour**

  * `Promise<void>` : ne renvoie rien, effectue une suppression "best effort" du fichier sur le disque

* **Lignes importantes**

  * `if (!url || !url.startsWith('/uploads/')) return;` : garde-fou qui n'essaie de supprimer que les fichiers réellement stockés localement sous `/uploads/` — une URL externe (ex. avatar par défaut hébergé sur pravatar.cc) est ignorée silencieusement
  * `path.basename(url)` : ne conserve que le nom de fichier final, empêche une éventuelle traversée de répertoire (`../../`) si la valeur stockée en base était malformée ou manipulée
  * `await unlink(path.join(UPLOAD_DIR, filename))` dans un `try { ... } catch { }` vide : la suppression est volontairement tolérante à l'échec — fichier déjà supprimé ou jamais stocké localement, le commentaire dans le code précise explicitement ce cas
  * la configuration multer (whitelist stricte des types MIME acceptés — `image/png`, `image/jpeg`, `image/webp`, `image/gif` — génération des noms de fichiers via `randomUUID()`, et limite de taille de 5 Mo) ne vit pas dans ce module utilitaire : elle est définie dans le handler de route `server/routes/uploads.js`, qui n'appelle `utils/uploads.js` que pour la suppression via `deleteUploadedFile`
