import { useState } from 'react'
import { importRecipeFromUrl } from '../api/recipesApi'

export default function ImportRecipeUrlForm({ onBack, onImported }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const draft = await importRecipeFromUrl(url.trim())
      onImported(draft)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="relative text-sm text-stone-700 dark:text-stone-300">
        Collez un lien vers une recette Marmiton ou CuisineAZ. Les informations récupérées pourront être relues et
        corrigées avant la création.
      </p>
      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Lien de la recette</label>
        <input
          type="url"
          required
          placeholder="https://www.marmiton.org/recettes/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
        />
      </div>
      {error && <p className="relative text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="liquid-glass relative rounded-full px-4 py-2 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
        >
          <span className="relative">Retour</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="liquid-glass gold-glass relative flex-1 rounded-full py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100 disabled:opacity-50"
        >
          <span className="relative text-sm font-semibold text-stone-900 dark:text-white">
            {loading ? 'Récupération…' : 'Importer'}
          </span>
        </button>
      </div>
    </form>
  )
}
