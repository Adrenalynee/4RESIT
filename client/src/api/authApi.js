const TOKEN_KEY = 'supmeal_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'Une erreur est survenue')
  return data
}

export async function login(email, password) {
  const { user, token } = await request('/auth/login', { method: 'POST', body: { email, password } })
  setToken(token)
  return user
}

export async function loginWithOAuth() {
  throw new Error("La connexion via un fournisseur externe n'est pas encore disponible.")
}

export async function register(name, email, password) {
  const { user, token } = await request('/auth/register', { method: 'POST', body: { name, email, password } })
  setToken(token)
  return user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function getCurrentUser() {
  if (!getToken()) return null
  try {
    const { user } = await request('/auth/me')
    return user
  } catch {
    logout()
    return null
  }
}