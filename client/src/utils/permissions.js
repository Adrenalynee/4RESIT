export const ROLE_LABELS = {
  creator: 'Créateur',
  editor: 'Éditeur',
  reader: 'Lecteur',
  commenter: 'Commentateur',
}

export function getMyRole(cookbook, userId) {
  return cookbook?.members?.find((m) => m.userId === userId)?.role
}

export function canManageMembers(role) {
  return role === 'creator'
}

export function canEditRecipes(role) {
  return role === 'creator' || role === 'editor'
}

export function canComment(role) {
  return role === 'creator' || role === 'editor' || role === 'commenter'
}
