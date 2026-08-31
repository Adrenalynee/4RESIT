## Messagerie temps réel des cookbooks (Socket.IO)

Le principe des trois sous-sections (**Paramètres**, **Retour**, **Lignes importantes**) est conservé, mais adapté au fonctionnement événementiel de Socket.IO : **Paramètres** décrit la forme du payload reçu par l'événement, **Retour** décrit ce qui est réémis (vers l'émetteur seul ou diffusé à la room), et **Lignes importantes** met en avant les vérifications de permission et les accès base de données.

### `roomName(cookbookId): string`

* **Paramètres**

  * `cookbookId` : identifiant UUID du cookbook (string, requis)

* **Retour**

  * `string` : nom de la room Socket.IO associée au cookbook, au format `` `cookbook:${cookbookId}` ``

* **Lignes importantes**

  * construction du nom de room : `` return `cookbook:${cookbookId}`; `` — garantit qu'un seul namespace de room par cookbook est utilisé, aussi bien à la jonction (`socket.join`) qu'à la diffusion (`io.to(...)`)

### `attachChat(io): void`

Point d'entrée du module, appelé une seule fois au démarrage du serveur avec l'instance `io` de Socket.IO. Met en place le middleware d'authentification de la connexion, puis enregistre les gestionnaires d'événements pour chaque socket connecté.

#### Middleware d'authentification de connexion (`io.use`)

* **Paramètres**

  * `socket.handshake.auth.token` : token JWT transmis par le client lors de l'établissement de la connexion websocket (string, requis)

* **Retour**

  * Connexion acceptée : appel de `next()` sans argument, avec `socket.userId` défini pour toute la durée de vie du socket
  * Connexion refusée : appel de `next(new Error('Non authentifié'))` ou `next(new Error('Session invalide'))` — Socket.IO refuse alors l'établissement de la connexion et le client reçoit un événement `connect_error` côté navigateur

* **Lignes importantes**

  * lecture du token dans le handshake plutôt que dans un header HTTP classique : `const token = socket.handshake.auth?.token;` — Socket.IO transporte l'authentification via l'objet `auth` fourni au moment du `io(url, { auth: { token } })` côté client, et non via un header `Authorization`
  * rejet si absence de token : `if (!token) return next(new Error('Non authentifié'));`
  * vérification et extraction de l'identifiant utilisateur : `socket.userId = jwt.verify(token, process.env.JWT_SECRET).sub;` — même claim `sub` et même secret que le middleware HTTP `requireAuth`, ce qui garantit la cohérence des identités entre REST et websocket
  * rejet en cas de token invalide ou expiré : `catch { next(new Error('Session invalide')); }`

### Événement `cookbook:join`

* **Paramètres**

  * `cookbookId` : identifiant UUID du cookbook que le client souhaite rejoindre (string, requis, extrait du payload `{ cookbookId }`)

* **Retour**

  * Succès : aucun événement explicite renvoyé, le socket est simplement ajouté à la room `cookbook:${cookbookId}` et recevra dès lors tous les événements `message:new` / `message:updated` / `message:deleted` diffusés sur cette room
  * Échec : événement `error` émis uniquement vers l'émetteur, payload `{ error: "Vous n'êtes pas membre de ce cookbook" }`

* **Lignes importantes**

  * déstructuration défensive du payload : `async ({ cookbookId } = {}) => { ... }` — la valeur par défaut `{}` évite une exception si le client émet l'événement sans payload
  * vérification d'appartenance au cookbook : `const role = await getMemberRole(cookbookId, socket.userId);` — même fonction `utils/cookbooks.js` que celle utilisée par le middleware HTTP `requireCookbookRole`, garantissant une règle d'accès identique entre REST et websocket
  * rejet si non-membre : `if (!role) return socket.emit('error', { error: "Vous n'êtes pas membre de ce cookbook" });`
  * jonction effective de la room : `socket.join(roomName(cookbookId));` — aucune vérification de rôle particulier au-delà de l'appartenance : tout membre, quel que soit son rôle (`creator`, `editor`, `reader`, `commenter`), peut rejoindre la discussion

### Événement `message:send`

* **Paramètres**

  * `cookbookId` : identifiant UUID du cookbook cible (string, requis)
  * `text` : contenu du message (string, requis, non vide après `trim()`)

* **Retour**

  * Succès : diffusion à toute la room de l'événement `message:new`, payload = message complet tel que renvoyé par `createMessage` (`{ id, userId, text, createdAt, editedAt, user: { id, name, email, avatar } }`)
  * Échec silencieux : aucun envoi si `text` est vide ou absent (retour anticipé sans notification)
  * Échec permission : événement `error` émis uniquement vers l'émetteur, payload `{ error: "Vous n'êtes pas membre de ce cookbook" }`

* **Lignes importantes**

  * rejet des messages vides : `if (!text || !text.trim()) return;` — aucune vérification côté serveur autre que la non-vacuité, aucune limite de longueur imposée dans ce fichier
  * revérification de l'appartenance à chaque envoi : `const role = await getMemberRole(cookbookId, socket.userId);` — la permission n'est pas mise en cache depuis `cookbook:join`, elle est recontrôlée à chaque message pour tenir compte d'une éventuelle exclusion du cookbook survenue entre-temps
  * persistance du message : `const message = await createMessage(cookbookId, socket.userId, text.trim());` — délègue à `utils/messages.js`, qui insère la ligne puis relit immédiatement le message joint à son auteur (`JOIN users`) pour renvoyer un objet directement affichable côté client
  * diffusion à tous les membres connectés à la room, y compris l'émetteur : `io.to(roomName(cookbookId)).emit('message:new', message);` — contrairement à un envoi qui exclurait l'émetteur (`socket.to(...)`), ce choix garantit que l'auteur voit son propre message apparaître via le même flux temps réel que les autres membres, sans traitement optimiste séparé côté client

### Événement `message:edit`

* **Paramètres**

  * `cookbookId` : identifiant UUID du cookbook cible (string, requis)
  * `messageId` : identifiant UUID du message à modifier (string, requis)
  * `text` : nouveau contenu du message (string, requis, non vide après `trim()`)

* **Retour**

  * Succès : diffusion à toute la room de l'événement `message:updated`, payload = message mis à jour renvoyé par `updateMessage` (inclut `editedAt` désormais renseigné)
  * Échec silencieux : aucun envoi si `text` est vide ou absent
  * Échec « message introuvable » : événement `error` vers l'émetteur seul, payload `{ error: 'Message introuvable' }`, déclenché si le message n'existe pas ou n'appartient pas au cookbook indiqué
  * Échec permission : événement `error` vers l'émetteur seul, payload `{ error: 'Vous ne pouvez modifier que vos propres messages' }`

* **Lignes importantes**

  * relecture du message existant : `const existing = await getMessage(messageId);` — requête minimale (`SELECT id, cookbook_id, user_id FROM messages WHERE id = $1`) suffisante pour les contrôles à suivre
  * double vérification d'intégrité : `if (!existing || existing.cookbook_id !== cookbookId) return socket.emit('error', { error: 'Message introuvable' });` — empêche un client de modifier un message en prétendant qu'il appartient à un autre cookbook que le sien réel
  * contrôle strict de propriété du message, sans dérogation pour les rôles `creator`/`editor` : `if (existing.user_id !== socket.userId) return socket.emit('error', { error: 'Vous ne pouvez modifier que vos propres messages' });` — seul l'auteur peut modifier son propre message, à la différence des règles d'accès aux recettes où `creator`/`editor` ont des droits élargis
  * application de la modification : `const message = await updateMessage(messageId, text.trim());` — met à jour `text` et positionne `edited_at = now()` côté SQL
  * diffusion à toute la room : `io.to(roomName(cookbookId)).emit('message:updated', message);`

### Événement `message:delete`

* **Paramètres**

  * `cookbookId` : identifiant UUID du cookbook cible (string, requis)
  * `messageId` : identifiant UUID du message à supprimer (string, requis)

* **Retour**

  * Succès : diffusion à toute la room de l'événement `message:deleted`, payload `{ id: messageId }`
  * Échec « message introuvable » : événement `error` vers l'émetteur seul, payload `{ error: 'Message introuvable' }`
  * Échec permission : événement `error` vers l'émetteur seul, payload `{ error: 'Vous ne pouvez supprimer que vos propres messages' }`

* **Lignes importantes**

  * mêmes contrôles d'intégrité et de propriété que pour `message:edit` : `const existing = await getMessage(messageId);` puis vérification `cookbook_id` et `user_id`
  * suppression effective : `await deleteMessage(messageId);` — suppression physique en base (`DELETE FROM messages WHERE id = $1`), aucune suppression logique (pas de colonne `deleted_at`)
  * diffusion d'un événement allégé ne contenant que l'identifiant : `io.to(roomName(cookbookId)).emit('message:deleted', { id: messageId });` — les clients connectés retirent le message de leur état local à partir de ce seul `id`, sans nécessiter le message complet

### Dépendances (`utils/messages.js`, `utils/cookbooks.js`)

* **`getMemberRole(cookbookId, userId)`** : requête `SELECT role FROM cookbook_members WHERE cookbook_id = $1 AND user_id = $2`, renvoie `null` si l'utilisateur n'est pas membre — fonction partagée avec le middleware HTTP `requireCookbookRole`
* **`createMessage` / `updateMessage` / `deleteMessage` / `getMessage`** : couche d'accès aux données de la table `messages`, chacune enveloppant ses résultats via `shapeMessageRow` pour renvoyer systématiquement un objet `{ id, userId, text, createdAt, editedAt, user }` prêt à être diffusé sans transformation supplémentaire côté socket

### Sécurité et gestion d'erreurs

* **Authentification à la connexion, pas par événement** : le token JWT n'est vérifié qu'une fois lors du handshake (`io.use`), les événements individuels ne portent aucun token et s'appuient sur `socket.userId` fixé à la connexion
* **Vérification d'appartenance systématique** : chaque action liée à un cookbook (`join`, `send`) revérifie l'appartenance en base plutôt que de faire confiance à un état mis en cache côté socket
* **Vérification de propriété stricte pour l'édition/suppression** : aucun rôle de cookbook ne permet de modifier ou supprimer le message d'un autre membre, contrairement aux droits sur les recettes
* **Erreurs ciblées vers l'émetteur uniquement** : tous les événements `error` sont émis via `socket.emit(...)` (et non `io.to(room).emit(...)`), afin qu'un refus de permission ne soit visible que par l'utilisateur concerné
