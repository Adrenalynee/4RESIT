import { request } from './http'

export async function getAllergens() {
  return request('/allergens')
}
