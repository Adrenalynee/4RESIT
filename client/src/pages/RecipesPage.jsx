import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import ErrorState from '../components/ErrorState'
import PageBackground from '../components/PageBackground'
import NewRecipeModal from '../components/modals/NewRecipeModal'

export default function RecipesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [cookbooks, setCookbooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewRecipe, setShowNewRecipe] = useState(false)

  const [query, setQuery] = useState('')
  const [cookbookId, setCookbookId] = useState('')
  const [tag, setTag] = useState('')
  const [ingredient, setIngredient] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [maxPrepTime, setMaxPrepTime] = useState('')
  const [maxCookTime, setMaxCookTime] = useState('')

  useEffect(() => {
    api.getCookbooks(user.id).then(setCookbooks)
  }, [user.id])

  function loadRecipes() {
    setLoading(true)
    setError('')
    api
      .getRecipes({
        accessibleTo: user.id,
        query: query || undefined,
        cookbookId: cookbookId || undefined,
        tags: tag ? [tag] : undefined,
        ingredient: ingredient || undefined,
        favoriteOnly: favoriteOnly || undefined,
        maxPrepTime: maxPrepTime ? Number(maxPrepTime) : undefined,
        maxCookTime: maxCookTime ? Number(maxCookTime) : undefined,
      })
      .then((results) => {
        setRecipes(results)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(loadRecipes, [query, cookbookId, tag, ingredient, favoriteOnly, maxPrepTime, maxCookTime])

  const allTags = useMemo(() => {
    return [...new Set(recipes.flatMap((r) => r.tags))].sort()
  }, [recipes])

  return (
    <PageBackground>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-shimmer font-logo text-4xl font-bold">Mes recettes</h1>
          <button
            onClick={() => setShowNewRecipe(true)}
            className="liquid-glass gold-glass rounded-full px-5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-sm font-semibold text-stone-900 dark:text-white">+ Nouvelle recette</span>
          </button>
        </div>

        <div className="liquid-glass mt-4 grid grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Recherche (titre, ingrédient, tag)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white lg:col-span-2"
          />
          <select
            value={cookbookId}
            onChange={(e) => setCookbookId(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
          >
            <option value="">Tous les cookbooks</option>
            {cookbooks.map((cb) => (
              <option key={cb.id} value={cb.id}>{cb.name}</option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
          >
            <option value="">Toutes les catégories</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            placeholder="Filtrer par ingrédient"
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
          />
          <select
            value={maxPrepTime}
            onChange={(e) => setMaxPrepTime(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
          >
            <option value="">Temps de préparation max</option>
            <option value="10">10 min ou moins</option>
            <option value="20">20 min ou moins</option>
            <option value="30">30 min ou moins</option>
            <option value="45">45 min ou moins</option>
            <option value="60">1 h ou moins</option>
          </select>
          <select
            value={maxCookTime}
            onChange={(e) => setMaxCookTime(e.target.value)}
            className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
          >
            <option value="">Temps de cuisson max</option>
            <option value="15">15 min ou moins</option>
            <option value="30">30 min ou moins</option>
            <option value="45">45 min ou moins</option>
            <option value="60">1 h ou moins</option>
            <option value="90">1 h 30 ou moins</option>
            <option value="120">2 h ou moins</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-white">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(e) => setFavoriteOnly(e.target.checked)}
            />
            Favoris uniquement
          </label>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadRecipes} />
        ) : recipes.length === 0 ? (
          <p className="mt-8 text-center text-white/80">Aucune recette ne correspond à ces critères.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>

      {showNewRecipe && (
        <NewRecipeModal
          onClose={() => setShowNewRecipe(false)}
          onCreated={(created) => {
            setShowNewRecipe(false)
            navigate(`/recipes/${created.id}`)
          }}
        />
      )}
    </PageBackground>
  )
}
