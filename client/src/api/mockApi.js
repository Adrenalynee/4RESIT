// Mock API for SupMeal application, dev front before backend is ready. Uses localStorage to persist data across sessions.

import { users as seedUsers, cookbooks as seedCookbooks, recipes as seedRecipes, messages as seedMessages } from '../mocks/data'

const DB_KEY = 'supmeal_db'
const SESSION_KEY = 'supmeal_session'
const LATENCY = 300

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

function loadDb() {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) return JSON.parse(raw)
  const initial = {
    users: seedUsers,
    cookbooks: seedCookbooks,
    recipes: seedRecipes,
    messages: seedMessages,
  }
  localStorage.setItem(DB_KEY, JSON.stringify(initial))
  return initial
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function sanitizeUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

// ---- Auth ----

export async function login(email, password) {
  const db = loadDb()
  const user = db.users.find((u) => u.email === email && u.password === password)
  if (!user) throw new Error('Email ou mot de passe incorrect')
  localStorage.setItem(SESSION_KEY, user.id)
  return delay(sanitizeUser(user))
}

export async function loginWithOAuth(provider) {
  // Simule une connexion OAuth2 réussie avec le premier utilisateur de seed.
  const db = loadDb()
  const user = db.users[0]
  localStorage.setItem(SESSION_KEY, user.id)
  return delay({ ...sanitizeUser(user), oauthProvider: provider })
}

export async function register(name, email, password) {
  const db = loadDb()
  if (db.users.some((u) => u.email === email)) {
    throw new Error('Un compte existe déjà avec cet email')
  }
  const newUser = {
    id: uid('u'),
    name,
    email,
    password,
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    preferences: {
      diet: '',
      allergies: [],
      favoriteCuisine: '',
      defaultServings: 2,
    },
  }
  db.users.push(newUser)
  saveDb(db)
  localStorage.setItem(SESSION_KEY, newUser.id)
  return delay(sanitizeUser(newUser))
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export async function getCurrentUser() {
  const db = loadDb()
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return delay(null)
  const user = db.users.find((u) => u.id === id)
  return delay(sanitizeUser(user))
}

export async function updateUserProfile(userId, profile) {
  const db = loadDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) throw new Error('Utilisateur introuvable')
  if (profile.name !== undefined) user.name = profile.name
  if (profile.avatar !== undefined) user.avatar = profile.avatar
  saveDb(db)
  return delay(sanitizeUser(user))
}

export async function updateUserPreferences(userId, preferences) {
  const db = loadDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) throw new Error('Utilisateur introuvable')
  user.preferences = { ...user.preferences, ...preferences }
  saveDb(db)
  return delay(sanitizeUser(user))
}

export async function changePassword(userId, currentPassword, newPassword) {
  const db = loadDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) throw new Error('Utilisateur introuvable')
  if (user.password !== currentPassword) throw new Error('Mot de passe actuel incorrect')
  user.password = newPassword
  saveDb(db)
  return delay(true)
}

export async function deleteAccount(userId, password) {
  const db = loadDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) throw new Error('Utilisateur introuvable')
  if (user.password !== password) throw new Error('Mot de passe incorrect')
  db.users = db.users.filter((u) => u.id !== userId)
  db.cookbooks.forEach((cb) => {
    cb.members = cb.members.filter((m) => m.userId !== userId)
  })
  db.recipes = db.recipes.filter((r) => r.ownerId !== userId)
  saveDb(db)
  return delay(true)
}

// ---- Cookbooks ----

export async function getCookbooks(userId) {
  const db = loadDb()
  const mine = db.cookbooks.filter((cb) => cb.members.some((m) => m.userId === userId))
  return delay(mine)
}

export async function getCookbookById(id) {
  const db = loadDb()
  const cookbook = db.cookbooks.find((cb) => cb.id === id)
  if (!cookbook) throw new Error('Cookbook introuvable')
  const members = cookbook.members.map((m) => ({
    ...m,
    user: sanitizeUser(db.users.find((u) => u.id === m.userId)),
  }))
  return delay({ ...cookbook, members })
}

export async function createCookbook(userId, { name, description }) {
  const db = loadDb()
  const cookbook = {
    id: uid('cb'),
    name,
    description,
    members: [{ userId, role: 'creator' }],
    recipeIds: [],
  }
  db.cookbooks.push(cookbook)
  saveDb(db)
  return delay(cookbook)
}

export async function inviteMember(cookbookId, email, role = 'reader') {
  const db = loadDb()
  const cookbook = db.cookbooks.find((cb) => cb.id === cookbookId)
  const user = db.users.find((u) => u.email === email)
  if (!cookbook) throw new Error('Cookbook introuvable')
  if (!user) throw new Error("Aucun utilisateur avec cet email")
  if (cookbook.members.some((m) => m.userId === user.id)) {
    throw new Error('Cet utilisateur est déjà membre')
  }
  cookbook.members.push({ userId: user.id, role })
  saveDb(db)
  return delay(cookbook)
}

export async function updateMemberRole(cookbookId, userId, role) {
  const db = loadDb()
  const cookbook = db.cookbooks.find((cb) => cb.id === cookbookId)
  if (!cookbook) throw new Error('Cookbook introuvable')
  const member = cookbook.members.find((m) => m.userId === userId)
  if (!member) throw new Error('Membre introuvable')
  if (member.role === 'creator') throw new Error('Le rôle du créateur ne peut pas être modifié')
  member.role = role
  saveDb(db)
  return delay(cookbook)
}

export async function removeMember(cookbookId, userId) {
  const db = loadDb()
  const cookbook = db.cookbooks.find((cb) => cb.id === cookbookId)
  if (!cookbook) throw new Error('Cookbook introuvable')
  const member = cookbook.members.find((m) => m.userId === userId)
  if (!member) throw new Error('Membre introuvable')
  if (member.role === 'creator') throw new Error('Le créateur ne peut pas être retiré du cookbook')
  cookbook.members = cookbook.members.filter((m) => m.userId !== userId)
  saveDb(db)
  return delay(cookbook)
}

// ---- Recipes ----

export async function getRecipes(filters = {}) {
  const db = loadDb()
  let results = [...db.recipes]

  if (filters.accessibleTo) {
    const myCookbookIds = db.cookbooks
      .filter((cb) => cb.members.some((m) => m.userId === filters.accessibleTo))
      .map((cb) => cb.id)
    results = results.filter((r) => r.ownerId === filters.accessibleTo || myCookbookIds.includes(r.cookbookId))
  }
  if (filters.cookbookId) {
    results = results.filter((r) => r.cookbookId === filters.cookbookId)
  }
  if (filters.favoriteOnly) {
    results = results.filter((r) => r.favorite)
  }
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((r) => filters.tags.every((t) => r.tags.includes(t)))
  }
  if (filters.ingredient) {
    const q = filters.ingredient.toLowerCase()
    results = results.filter((r) => r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
  }
  if (filters.maxPrepTime) {
    results = results.filter((r) => r.prepTime <= filters.maxPrepTime)
  }
  if (filters.maxCookTime) {
    results = results.filter((r) => r.cookTime <= filters.maxCookTime)
  }
  if (filters.query) {
    const q = filters.query.toLowerCase()
    results = results.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q)) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }

  return delay(results)
}

export async function getRecipeById(id) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new Error('Recette introuvable')
  const comments = recipe.comments.map((c) => ({
    ...c,
    user: sanitizeUser(db.users.find((u) => u.id === c.userId)),
  }))
  return delay({ ...recipe, comments })
}

export async function createRecipe(recipe) {
  const db = loadDb()
  const newRecipe = {
    id: uid('r'),
    favorite: false,
    plannedDates: [],
    comments: [],
    tags: [],
    ingredients: [],
    steps: [],
    ...recipe,
  }
  db.recipes.push(newRecipe)
  if (newRecipe.cookbookId) {
    const cookbook = db.cookbooks.find((cb) => cb.id === newRecipe.cookbookId)
    if (cookbook) cookbook.recipeIds.push(newRecipe.id)
  }
  saveDb(db)
  return delay(newRecipe)
}

export async function updateRecipe(id, patch) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new Error('Recette introuvable')
  Object.assign(recipe, patch)
  saveDb(db)
  return delay(recipe)
}

export async function deleteRecipe(id) {
  const db = loadDb()
  db.recipes = db.recipes.filter((r) => r.id !== id)
  db.cookbooks.forEach((cb) => {
    cb.recipeIds = cb.recipeIds.filter((rid) => rid !== id)
  })
  saveDb(db)
  return delay(true)
}

export async function toggleFavorite(id) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new Error('Recette introuvable')
  recipe.favorite = !recipe.favorite
  saveDb(db)
  return delay(recipe)
}

export async function addPlannedDate(id, date) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new Error('Recette introuvable')
  if (!recipe.plannedDates) recipe.plannedDates = []
  if (!recipe.plannedDates.includes(date)) {
    recipe.plannedDates.push(date)
    recipe.plannedDates.sort()
  }
  saveDb(db)
  return delay(recipe)
}

export async function removePlannedDate(id, date) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new Error('Recette introuvable')
  recipe.plannedDates = (recipe.plannedDates || []).filter((d) => d !== date)
  saveDb(db)
  return delay(recipe)
}

export async function addComment(recipeId, userId, text) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === recipeId)
  if (!recipe) throw new Error('Recette introuvable')
  const comment = { id: uid('c'), userId, text, createdAt: new Date().toISOString() }
  recipe.comments.push(comment)
  saveDb(db)
  return delay(comment)
}

export async function updateComment(recipeId, commentId, userId, text) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === recipeId)
  if (!recipe) throw new Error('Recette introuvable')
  const comment = recipe.comments.find((c) => c.id === commentId)
  if (!comment) throw new Error('Commentaire introuvable')
  if (comment.userId !== userId) throw new Error("Vous ne pouvez modifier que vos propres commentaires")
  comment.text = text
  comment.editedAt = new Date().toISOString()
  saveDb(db)
  return delay(comment)
}

export async function deleteComment(recipeId, commentId, userId) {
  const db = loadDb()
  const recipe = db.recipes.find((r) => r.id === recipeId)
  if (!recipe) throw new Error('Recette introuvable')
  const comment = recipe.comments.find((c) => c.id === commentId)
  if (!comment) throw new Error('Commentaire introuvable')
  if (comment.userId !== userId) throw new Error("Vous ne pouvez supprimer que vos propres commentaires")
  recipe.comments = recipe.comments.filter((c) => c.id !== commentId)
  saveDb(db)
  return delay(true)
}

// ---- Messagerie ----

export async function getMessages(cookbookId) {
  const db = loadDb()
  const list = db.messages[cookbookId] || []
  const withUsers = list.map((m) => ({ ...m, user: sanitizeUser(db.users.find((u) => u.id === m.userId)) }))
  return delay(withUsers)
}

export async function sendMessage(cookbookId, userId, text) {
  const db = loadDb()
  if (!db.messages[cookbookId]) db.messages[cookbookId] = []
  const message = { id: uid('m'), userId, text, createdAt: new Date().toISOString() }
  db.messages[cookbookId].push(message)
  saveDb(db)
  return delay(message)
}

export async function updateMessage(cookbookId, messageId, userId, text) {
  const db = loadDb()
  const message = (db.messages[cookbookId] || []).find((m) => m.id === messageId)
  if (!message) throw new Error('Message introuvable')
  if (message.userId !== userId) throw new Error("Vous ne pouvez modifier que vos propres messages")
  message.text = text
  message.editedAt = new Date().toISOString()
  saveDb(db)
  return delay(message)
}

export async function deleteMessage(cookbookId, messageId, userId) {
  const db = loadDb()
  const list = db.messages[cookbookId] || []
  const message = list.find((m) => m.id === messageId)
  if (!message) throw new Error('Message introuvable')
  if (message.userId !== userId) throw new Error("Vous ne pouvez supprimer que vos propres messages")
  db.messages[cookbookId] = list.filter((m) => m.id !== messageId)
  saveDb(db)
  return delay(true)
}

// ---- Import / Export ----

export async function exportUserData(userId) {
  const db = loadDb()
  const cookbooks = db.cookbooks.filter((cb) => cb.members.some((m) => m.userId === userId))
  const recipes = db.recipes.filter(
    (r) => r.ownerId === userId || cookbooks.some((cb) => cb.id === r.cookbookId),
  )
  const payload = { exportedAt: new Date().toISOString(), cookbooks, recipes }
  return delay(payload)
}

export async function importUserData(userId, payload) {
  const db = loadDb()
  const idMap = {}

  ;(payload.cookbooks || []).forEach((cb) => {
    const newId = uid('cb')
    idMap[cb.id] = newId
    db.cookbooks.push({ ...cb, id: newId, members: [{ userId, role: 'creator' }], recipeIds: [] })
  })

  ;(payload.recipes || []).forEach((r) => {
    const newId = uid('r')
    const newCookbookId = idMap[r.cookbookId] || null
    const newRecipe = { ...r, id: newId, ownerId: userId, cookbookId: newCookbookId, comments: [] }
    db.recipes.push(newRecipe)
    if (newCookbookId) {
      const cookbook = db.cookbooks.find((cb) => cb.id === newCookbookId)
      if (cookbook) cookbook.recipeIds.push(newId)
    }
  })

  saveDb(db)
  return delay(true)
}
