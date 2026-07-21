import { useState } from 'react'
import Modal from '../Modal'

export default function ConfirmDeleteAccountModal({ onClose, onConfirm }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setError('')
    if (!password) {
      setError('Veuillez saisir votre mot de passe.')
      return
    }
    setDeleting(true)
    try {
      await onConfirm(password)
      onClose()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Supprimer votre compte</h2>
      <p className="relative mt-2 text-sm text-stone-700 dark:text-stone-300">
        Voulez-vous vraiment supprimer votre compte ? Vos cookbooks et recettes personnelles seront définitivement perdus. Cette action est irréversible.
      </p>
      <input
        type="password"
        placeholder="Confirmez avec votre mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="relative mt-4 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
      />
      {error && <p className="relative mt-2 text-sm text-red-500">{error}</p>}
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
          <span className="relative">Supprimer mon compte</span>
        </button>
      </div>
    </Modal>
  )
}
