import { DIETS } from './diets.js';
import { ALLERGENS } from './allergens.js';
import { CUISINES } from './cuisines.js';

const DIET_LABEL_BY_VALUE = new Map(DIETS.map((d) => [d.value, d.label.toLowerCase()]));
const ALLERGEN_LABEL_BY_VALUE = new Map(ALLERGENS.map((a) => [a.value, a.label.toLowerCase()]));
const CUISINE_LABEL_BY_VALUE = new Map(CUISINES.map((c) => [c.value, c.label.toLowerCase()]));

export function suggestRecipes(recipes, preferences, limit = 8) {
  const dietLabels = (preferences?.diets || []).map((d) => DIET_LABEL_BY_VALUE.get(d)).filter(Boolean);
  const allergenLabels = (preferences?.allergies || []).map((a) => ALLERGEN_LABEL_BY_VALUE.get(a)).filter(Boolean);
  const cuisineLabels = (preferences?.favoriteCuisines || []).map((c) => CUISINE_LABEL_BY_VALUE.get(c)).filter(Boolean);

  return recipes
    .filter((r) => {
      const ingredientNames = (r.ingredients || []).map((i) => i.name.toLowerCase());
      return !allergenLabels.some((label) => ingredientNames.some((name) => name.includes(label)));
    })
    .map((r) => {
      const tags = (r.tags || []).map((t) => t.toLowerCase());
      let score = 0;
      if (cuisineLabels.some((label) => tags.includes(label))) score += 3;
      if (dietLabels.some((label) => tags.includes(label))) score += 2;
      if (r.favorite) score += 1;
      return { recipe: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.recipe);
}
