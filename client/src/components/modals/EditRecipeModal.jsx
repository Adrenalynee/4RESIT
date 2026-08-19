import Modal from '../Modal'
import NewRecipeForm from '../NewRecipeForm'
import { useRecipeTaxonomy } from '../../context/RecipeTaxonomyContext'
import { isValidUrl } from '../../utils/url'

export default function EditRecipeModal({ recipe, onClose, onSaved }) {
  const { mealTypes, cuisines, diets } = useRecipeTaxonomy()
  const mealTypeValues = mealTypes.map((o) => o.value)
  const cuisineValues = cuisines.map((o) => o.value)
  const dietValues = diets.map((o) => o.value)

  const initialData = {
    title: recipe.title,
    cookbookId: recipe.cookbookId || '',
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    image: recipe.image || '',
    source: isValidUrl(recipe.source) ? recipe.source : '',
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    mealTypes: recipe.tags.filter((t) => mealTypeValues.includes(t)),
    cuisines: recipe.tags.filter((t) => cuisineValues.includes(t)),
    diets: recipe.tags.filter((t) => dietValues.includes(t)),
    difficulty: recipe.difficulty || '',
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Modifier la recette</h2>
      <div className="mt-4">
        <NewRecipeForm editingRecipeId={recipe.id} initialData={initialData} onCreated={onSaved} />
      </div>
    </Modal>
  )
}
