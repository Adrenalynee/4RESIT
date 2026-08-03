import { getRecipeAccessInfo } from '../utils/recipes.js';

export function requireRecipeAccess(level = 'read') {
  return async (req, res, next) => {
    const info = await getRecipeAccessInfo(req.params.id, req.userId);
    if (!info.recipe) return res.status(404).json({ error: 'Recette introuvable' });

    const allowed = level === 'write' ? info.canWrite : level === 'comment' ? info.canComment : info.canRead;
    if (!allowed) return res.status(403).json({ error: 'Action non autorisée sur cette recette' });

    req.recipeAccess = info;
    next();
  };
}
