import { request } from './http'

export async function getCuisines() {
  return request('/cuisines')
}
