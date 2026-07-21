import Carousel from './Carousel'
import RecipeCard from './RecipeCard'

export default function RecipeCarousel({ recipes, getTo, activeRecipeId, onActiveRecipeChange }) {
  return (
    <Carousel
      items={recipes}
      getKey={(recipe) => recipe.id}
      renderItem={(recipe) => <RecipeCard recipe={recipe} to={getTo ? getTo(recipe) : undefined} />}
      activeId={activeRecipeId}
      onActiveChange={onActiveRecipeChange}
      emptyMessage="Aucune recette dans ce cookbook."
      prevLabel="Recette précédente"
      nextLabel="Recette suivante"
    />
  )
}
