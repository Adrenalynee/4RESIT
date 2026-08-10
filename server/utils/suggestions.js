export function suggestRecipes(recipes, preferences, limit = 8) {
  const diet = preferences?.diet?.trim().toLowerCase();
  const favoriteCuisine = preferences?.favoriteCuisine?.trim().toLowerCase();
  const allergies = (preferences?.allergies || []).map((a) => a.trim().toLowerCase()).filter(Boolean);

  return recipes
    .filter((r) => {
      const ingredientNames = (r.ingredients || []).map((i) => i.name.toLowerCase());
      return !allergies.some((a) => ingredientNames.some((name) => name.includes(a)));
    })
    .map((r) => {
      const tags = (r.tags || []).map((t) => t.toLowerCase());
      let score = 0;
      if (favoriteCuisine && tags.includes(favoriteCuisine)) score += 3;
      if (diet && tags.includes(diet)) score += 2;
      if (r.favorite) score += 1;
      return { recipe: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.recipe);
}
