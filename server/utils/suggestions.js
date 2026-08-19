import { ALLERGENS } from './allergens.js';

const ALLERGEN_LABEL_BY_VALUE = new Map(ALLERGENS.map((a) => [a.value, a.label.toLowerCase()]));

export function suggestRecipes(recipes, preferences, limit = 8) {
  const dietValues = preferences?.diets || [];
  const allergenLabels = (preferences?.allergies || []).map((a) => ALLERGEN_LABEL_BY_VALUE.get(a)).filter(Boolean);
  const cuisineValues = preferences?.favoriteCuisines || [];

  return recipes
    .filter((r) => {
      const ingredientNames = (r.ingredients || []).map((i) => i.name.toLowerCase());
      return !allergenLabels.some((label) => ingredientNames.some((name) => name.includes(label)));
    })
    .map((r) => {
      const tags = r.tags || [];
      let score = 0;
      if (cuisineValues.some((value) => tags.includes(value))) score += 3;
      if (dietValues.some((value) => tags.includes(value))) score += 2;
      if (r.favorite) score += 1;
      return { recipe: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.recipe);
}
