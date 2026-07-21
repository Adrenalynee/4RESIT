import { useEffect, useState } from 'react'
import * as api from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import { canEditRecipes, getMyRole } from '../utils/permissions'
import { isValidUrl } from '../utils/url'

export default function NewRecipeForm({ onCreated, defaultCookbookId }) {
  const { user } = useAuth()
  const [cookbooks, setCookbooks] = useState([])

  const [title, setTitle] = useState('')
  const [cookbookId, setCookbookId] = useState(defaultCookbookId || '')
  const [prepTime, setPrepTime] = useState(15)
  const [cookTime, setCookTime] = useState(15)
  const [servings, setServings] = useState(user.preferences?.defaultServings || 2)
  const [tags, setTags] = useState('')
  const [image, setImage] = useState('')
  const [sourceType, setSourceType] = useState('personal')
  const [sourceUrl, setSourceUrl] = useState('')
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }])
  const [steps, setSteps] = useState([''])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCookbooks(user.id).then((all) => {
      setCookbooks(all.filter((cb) => canEditRecipes(getMyRole(cb, user.id))))
    })
  }, [user.id])

  function updateIngredient(index, field, value) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)))
  }

  function updateStep(index, value) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) {
      setImage('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Le titre est obligatoire')
      return
    }
    if (sourceType === 'url' && !isValidUrl(sourceUrl.trim())) {
      setError("L'URL de la source n'est pas valide (ex: https://exemple.com/recette)")
      return
    }
    const recipe = {
      title: title.trim(),
      ownerId: user.id,
      cookbookId: cookbookId || null,
      image: image || undefined,
      prepTime: Number(prepTime),
      cookTime: Number(cookTime),
      servings: Number(servings),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      source: sourceType === 'url' ? sourceUrl.trim() : 'Création utilisateur',
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.trim()),
    }
    const created = await api.createRecipe(recipe)
    onCreated(created)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Titre *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
        />
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">
          Cookbook{!defaultCookbookId && ' (optionnel)'}
        </label>
        <select
          value={cookbookId}
          onChange={(e) => setCookbookId(e.target.value)}
          disabled={Boolean(defaultCookbookId)}
          className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-stone-500 dark:border-white/15 dark:bg-black/40 dark:text-white dark:disabled:bg-black/20 dark:disabled:text-stone-400"
        >
          <option value="">Compte personnel</option>
          {cookbooks.map((cb) => (
            <option key={cb.id} value={cb.id}>{cb.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Préparation (min)</label>
          <input type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
        </div>
        <div>
          <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Cuisson (min)</label>
          <input type="number" min="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
        </div>
        <div>
          <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Portions</label>
          <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
        </div>
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Catégories / Tags (séparés par une virgule)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Italienne, Végétarien, Facile" className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Image (optionnel)</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            id="new-recipe-image-input"
            onChange={handleImageChange}
            className="sr-only"
          />
          <label
            htmlFor="new-recipe-image-input"
            className="liquid-glass gold-glass gold-glass-light relative inline-block cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-stone-900 dark:text-white">Choisir un fichier</span>
          </label>
          {image && <span className="text-xs text-stone-700 dark:text-stone-300">Image sélectionnée</span>}
        </div>
        {image && (
          <img src={image} alt="Aperçu" className="relative mt-2 h-32 w-full rounded-md object-cover" />
        )}
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Source</label>
        <div className="mt-1 flex gap-2">
          <label className="flex items-center gap-1.5 text-sm text-stone-800 dark:text-white">
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === 'personal'}
              onChange={() => setSourceType('personal')}
            />
            Création personnelle
          </label>
          <label className="flex items-center gap-1.5 text-sm text-stone-800 dark:text-white">
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === 'url'}
              onChange={() => setSourceType('url')}
            />
            Lien externe (URL)
          </label>
        </div>
        {sourceType === 'url' && (
          <input
            type="url"
            placeholder="https://exemple.com/recette"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
          />
        )}
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Ingrédients</label>
        <div className="mt-1 space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <input placeholder="Quantité" value={ing.quantity} onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} className="w-20 rounded-md border border-white/40 bg-white/70 px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
              <input placeholder="Unité" value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} className="w-24 rounded-md border border-white/40 bg-white/70 px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
              <input placeholder="Ingrédient" value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} className="min-w-32 flex-1 rounded-md border border-white/40 bg-white/70 px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }])}
          className="liquid-glass gold-glass gold-glass-light relative mt-2 cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
        >
          <span className="relative text-stone-900 dark:text-white">+ Ajouter un ingrédient</span>
        </button>
      </div>

      <div>
        <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Étapes</label>
        <div className="mt-1 space-y-2">
          {steps.map((step, i) => (
            <textarea
              key={i}
              value={step}
              onChange={(e) => updateStep(i, e.target.value)}
              placeholder={`Étape ${i + 1}`}
              className="w-full rounded-md border border-white/40 bg-white/70 px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
              rows={2}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSteps((prev) => [...prev, ''])}
          className="liquid-glass gold-glass gold-glass-light relative mt-2 cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
        >
          <span className="relative text-stone-900 dark:text-white">+ Ajouter une étape</span>
        </button>
      </div>

      {error && <p className="relative text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        className="liquid-glass gold-glass relative w-full rounded-full py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
      >
        <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Créer la recette</span>
      </button>
    </form>
  )
}
