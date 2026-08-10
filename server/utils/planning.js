import { findRecipeIds, shapeRecipes } from './recipes.js';

function addDaysIso(iso, amount) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export async function getShoppingList(userId, weekStart) {
  const weekDates = new Set(Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)));

  const recipeIds = await findRecipeIds(userId, {});
  const recipes = await shapeRecipes(recipeIds);

  const merged = new Map();
  for (const recipe of recipes) {
    const occurrences = recipe.plannedDates.filter((d) => weekDates.has(d)).length;
    for (let i = 0; i < occurrences; i++) {
      for (const ing of recipe.ingredients) {
        const unit = (ing.unit || '').trim();
        const name = ing.name.trim();
        const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
        const qty = Number(ing.quantity);

        if (!merged.has(key)) {
          merged.set(key, { key, name, unit, qty: Number.isNaN(qty) ? null : qty, mixed: Number.isNaN(qty) });
        } else {
          const entry = merged.get(key);
          if (!Number.isNaN(qty) && entry.qty !== null) {
            entry.qty += qty;
          } else {
            entry.mixed = true;
          }
        }
      }
    }
  }
  return [...merged.values()];
}
