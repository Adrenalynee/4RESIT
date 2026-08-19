import { request } from './http'

export async function getMealTypes() {
  return request('/meal-types')
}
