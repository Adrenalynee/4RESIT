import { useState } from 'react'
import * as api from '../api/mockApi'
import { useAuth } from '../context/AuthContext'

export default function NewCookbookForm({ onCreated }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const created = await api.createCookbook(user.id, { name: name.trim(), description: description.trim() })
    onCreated(created)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        placeholder="Nom du cookbook"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
        rows={2}
      />
      <button
        type="submit"
        className="liquid-glass gold-glass relative w-full rounded-full py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
      >
        <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Créer</span>
      </button>
    </form>
  )
}
