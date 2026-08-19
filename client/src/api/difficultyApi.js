import { request } from './http'

export async function getDifficultyLevels() {
  return request('/difficulty-levels')
}
