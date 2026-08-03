import jwt from 'jsonwebtoken';
import { getMemberRole } from '../utils/cookbooks.js';
import { createMessage, updateMessage, deleteMessage, getMessage } from '../utils/messages.js';

function roomName(cookbookId) {
  return `cookbook:${cookbookId}`;
}

export function attachChat(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Non authentifié'));
    try {
      socket.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
      next();
    } catch {
      next(new Error('Session invalide'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('cookbook:join', async ({ cookbookId } = {}) => {
      const role = await getMemberRole(cookbookId, socket.userId);
      if (!role) return socket.emit('error', { error: "Vous n'êtes pas membre de ce cookbook" });
      socket.join(roomName(cookbookId));
    });

    socket.on('message:send', async ({ cookbookId, text } = {}) => {
      if (!text || !text.trim()) return;
      const role = await getMemberRole(cookbookId, socket.userId);
      if (!role) return socket.emit('error', { error: "Vous n'êtes pas membre de ce cookbook" });

      const message = await createMessage(cookbookId, socket.userId, text.trim());
      io.to(roomName(cookbookId)).emit('message:new', message);
    });

    socket.on('message:edit', async ({ cookbookId, messageId, text } = {}) => {
      if (!text || !text.trim()) return;
      const existing = await getMessage(messageId);
      if (!existing || existing.cookbook_id !== cookbookId) return socket.emit('error', { error: 'Message introuvable' });
      if (existing.user_id !== socket.userId) return socket.emit('error', { error: 'Vous ne pouvez modifier que vos propres messages' });

      const message = await updateMessage(messageId, text.trim());
      io.to(roomName(cookbookId)).emit('message:updated', message);
    });

    socket.on('message:delete', async ({ cookbookId, messageId } = {}) => {
      const existing = await getMessage(messageId);
      if (!existing || existing.cookbook_id !== cookbookId) return socket.emit('error', { error: 'Message introuvable' });
      if (existing.user_id !== socket.userId) return socket.emit('error', { error: 'Vous ne pouvez supprimer que vos propres messages' });

      await deleteMessage(messageId);
      io.to(roomName(cookbookId)).emit('message:deleted', { id: messageId });
    });
  });
}
