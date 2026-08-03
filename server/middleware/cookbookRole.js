import { getMemberRole } from '../utils/cookbooks.js';

export function requireCookbookRole(...allowedRoles) {
  return async (req, res, next) => {
    const role = await getMemberRole(req.params.id, req.userId);
    if (!role) return res.status(403).json({ error: "Vous n'êtes pas membre de ce cookbook" });
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Permission refusée pour ce rôle' });
    }
    req.cookbookRole = role;
    next();
  };
}
