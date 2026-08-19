import { getToken } from './http'

export async function uploadImage(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file, file.name || 'upload')
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'Une erreur est survenue')
  return data
}
