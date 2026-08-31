import { request } from './http'

export async function getShoppingList(weekStart) {
  return request(`/planning/shopping-list?weekStart=${weekStart}`)
}

export async function getShoppingChecks(weekStart) {
  return request(`/planning/shopping-checks?weekStart=${weekStart}`)
}

export async function saveShoppingChecks(weekStart, checked) {
  return request(`/planning/shopping-checks?weekStart=${weekStart}`, {
    method: 'PUT',
    body: { checked },
  })
}
