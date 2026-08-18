import { request, getToken, setToken, clearToken } from './http'

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
  clearToken()
}

export async function getCurrentUser() {
  if (!getToken()) return null
  try {
    const { user } = await request('/auth/me')
    return user
  } catch {
    clearToken()
    return null
  }
}
