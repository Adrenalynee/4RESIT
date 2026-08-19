import { request } from './http'

export async function getRecipes(filters = {}) {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.cookbookId) params.set('cookbookId', filters.cookbookId)
  if (filters.ingredient) params.set('ingredient', filters.ingredient)
  if (filters.favoriteOnly) params.set('favoriteOnly', 'true')
  if (filters.maxPrepTime) params.set('maxPrepTime', String(filters.maxPrepTime))
  if (filters.maxCookTime) params.set('maxCookTime', String(filters.maxCookTime))
  for (const tag of filters.tags || []) params.append('tags', tag)
  const qs = params.toString()
  return request(`/recipes${qs ? `?${qs}` : ''}`)
}

export async function getRecipeById(id) {
  return request(`/recipes/${id}`)
}

export async function createRecipe(recipe) {
  return request('/recipes', { method: 'POST', body: recipe })
}

export async function importRecipeFromUrl(url) {
  return request('/recipes/import-url', { method: 'POST', body: { url } })
}

export async function updateRecipe(id, patch) {
  return request(`/recipes/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteRecipe(id) {
  return request(`/recipes/${id}`, { method: 'DELETE' })
}

export async function toggleFavorite(id) {
  return request(`/recipes/${id}/toggle-favorite`, { method: 'POST' })
}

export async function addPlannedDate(id, date) {
  return request(`/recipes/${id}/planned-dates`, { method: 'POST', body: { date } })
}

export async function removePlannedDate(id, date) {
  return request(`/recipes/${id}/planned-dates/${date}`, { method: 'DELETE' })
}

export async function addComment(recipeId, _userId, text) {
  return request(`/recipes/${recipeId}/comments`, { method: 'POST', body: { text } })
}

export async function updateComment(recipeId, commentId, _userId, text) {
  return request(`/recipes/${recipeId}/comments/${commentId}`, { method: 'PATCH', body: { text } })
}

export async function deleteComment(recipeId, commentId) {
  return request(`/recipes/${recipeId}/comments/${commentId}`, { method: 'DELETE' })
}

export async function getSuggestions(limit) {
  return request(`/recipes/suggestions${limit ? `?limit=${limit}` : ''}`)
}
