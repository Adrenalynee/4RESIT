import { request } from './http'

export async function getDiets() {
  return request('/diets')
}
