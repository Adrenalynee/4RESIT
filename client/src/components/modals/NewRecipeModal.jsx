import Modal from '../Modal'
import NewRecipeForm from '../NewRecipeForm'

export default function NewRecipeModal({ onClose, onCreated, defaultCookbookId }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Nouvelle recette</h2>
      <div className="mt-4">
        <NewRecipeForm onCreated={onCreated} defaultCookbookId={defaultCookbookId} />
      </div>
    </Modal>
  )
}
