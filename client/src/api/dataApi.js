import { getToken, request } from './http'

export async function exportUserData(format = 'json') {
  const token = getToken()
  const res = await fetch(`/api/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || 'Une erreur est survenue')
  }
  return format === 'csv' ? res.text() : res.json()
}

export async function importUserData(format, content) {
  return request('/import', { method: 'POST', body: { format, content } })
}
