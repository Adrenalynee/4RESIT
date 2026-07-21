import Modal from '../Modal'
import NewCookbookForm from '../NewCookbookForm'

export default function NewCookbookModal({ onClose, onCreated }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Nouveau cookbook</h2>
      <div className="mt-4">
        <NewCookbookForm onCreated={onCreated} />
      </div>
    </Modal>
  )
}
