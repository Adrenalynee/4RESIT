import { useState } from 'react'
import Modal from '../Modal'

export default function ConfirmDeleteModal({ recipeName, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    await onConfirm()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Supprimer la recette</h2>
      <p className="relative mt-2 text-sm text-stone-700 dark:text-stone-300">
        Voulez-vous vraiment supprimer{recipeName ? ` « ${recipeName} »` : ' cette recette'} ? Cette action est irréversible.
      </p>
      <div className="relative mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="liquid-glass relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
        >
          <span className="relative">Annuler</span>
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={handleConfirm}
          className="liquid-glass red-glass relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-red-700 transition hover:scale-105 hover:brightness-125 active:scale-100 disabled:cursor-default disabled:opacity-60 dark:text-red-100"
        >
          <span className="relative">Supprimer</span>
        </button>
      </div>
    </Modal>
  )
}
