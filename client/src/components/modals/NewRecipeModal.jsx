import { useState } from 'react'
import Modal from '../Modal'
import NewRecipeForm from '../NewRecipeForm'
import ImportRecipeUrlForm from '../ImportRecipeUrlForm'

export default function NewRecipeModal({ onClose, onCreated, defaultCookbookId }) {
  const [mode, setMode] = useState('choice')
  const [draft, setDraft] = useState(null)

  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Nouvelle recette</h2>
      <div className="mt-4">
        {mode === 'choice' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="liquid-glass gold-glass relative rounded-full py-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
            >
              <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Créer sa recette</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className="liquid-glass gold-glass gold-glass-light relative rounded-full py-3 transition hover:scale-105 hover:brightness-95 active:scale-100"
            >
              <span className="relative text-sm font-semibold text-stone-900 dark:text-white">
                Importer via un lien (CuisineAZ / Marmiton)
              </span>
            </button>
          </div>
        )}

        {mode === 'url' && (
          <ImportRecipeUrlForm
            onBack={() => setMode('choice')}
            onImported={(scraped) => {
              setDraft(scraped)
              setMode('manual')
            }}
          />
        )}

        {mode === 'manual' && (
          <NewRecipeForm
            onCreated={onCreated}
            defaultCookbookId={defaultCookbookId}
            initialData={draft}
            onBack={() => {
              setDraft(null)
              setMode('choice')
            }}
          />
        )}
      </div>
    </Modal>
  )
}
