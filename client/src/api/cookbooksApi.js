import { request } from './http'

export async function getCookbooks() {
  return request('/cookbooks')
}

export async function getCookbookById(id) {
  return request(`/cookbooks/${id}`)
}

export async function createCookbook(_userId, { name, description }) {
  return request('/cookbooks', { method: 'POST', body: { name, description } })
}

export async function updateCookbook(cookbookId, patch) {
  return request(`/cookbooks/${cookbookId}`, { method: 'PATCH', body: patch })
}

export async function deleteCookbook(cookbookId) {
  return request(`/cookbooks/${cookbookId}`, { method: 'DELETE' })
}

export async function inviteMember(cookbookId, identifier, role = 'reader') {
  return request(`/cookbooks/${cookbookId}/members`, { method: 'POST', body: { identifier, role } })
}

export async function updateMemberRole(cookbookId, userId, role) {
  return request(`/cookbooks/${cookbookId}/members/${userId}`, { method: 'PATCH', body: { role } })
}

export async function removeMember(cookbookId, userId) {
  return request(`/cookbooks/${cookbookId}/members/${userId}`, { method: 'DELETE' })
}

export async function getMessages(cookbookId) {
  return request(`/cookbooks/${cookbookId}/messages`)
}
