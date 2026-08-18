import { request } from './http'

export async function updateUserProfile(_userId, profile) {
  const { user } = await request('/users/me', { method: 'PATCH', body: profile })
  return user
}

export async function updateUserPreferences(_userId, preferences) {
  const { user } = await request('/users/me/preferences', { method: 'PATCH', body: preferences })
  return user
}

export async function changePassword(_userId, currentPassword, newPassword) {
  return request('/users/me/password', { method: 'PATCH', body: { currentPassword, newPassword } })
}

export async function deleteAccount(_userId, password) {
  return request('/users/me', { method: 'DELETE', body: { password } })
}
