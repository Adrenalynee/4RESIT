import { request, getToken, setToken, clearToken } from './http'

export async function login(identifier, password) {
  const { user, token } = await request('/auth/login', { method: 'POST', body: { identifier, password } })
  setToken(token)
  return user
}

export async function completeOAuthLogin(token) {
  setToken(token)
  return getCurrentUser()
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
