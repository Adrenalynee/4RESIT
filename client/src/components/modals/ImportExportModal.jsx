import Modal from '../Modal'
import ImportExportForm from '../ImportExportForm'

export default function ImportExportModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Import / Export</h2>
      <div className="mt-4">
        <ImportExportForm />
      </div>
    </Modal>
  )
}
