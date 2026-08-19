import { request } from './http'

export async function getShoppingList(weekStart) {
  return request(`/planning/shopping-list?weekStart=${weekStart}`)
}
