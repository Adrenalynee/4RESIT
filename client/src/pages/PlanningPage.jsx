import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as recipesApi from '../api/recipesApi'
import * as planningApi from '../api/planningApi'
import PageBackground from '../components/PageBackground'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { toISODate } from '../utils/date'

const SAVE_DEBOUNCE_MS = 400

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, amount) {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedByWeek, setCheckedByWeek] = useState({})
  const saveTimers = useRef({})

  function reload() {
    setError('')
    return recipesApi
      .getRecipes()
      .then((all) => {
        setRecipes(all)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const todayIso = toISODate(new Date())
  const weekIso = toISODate(weekStart)
  const isPastWeek = toISODate(days[6]) < todayIso

  const [shoppingList, setShoppingList] = useState([])
  const [shoppingListError, setShoppingListError] = useState('')

  function reloadShoppingList() {
    setShoppingListError('')
    return planningApi.getShoppingList(weekIso).then(setShoppingList).catch((err) => setShoppingListError(err.message))
  }

  useEffect(() => {
    reloadShoppingList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekIso])

  useEffect(() => {
    if (isPastWeek || checkedByWeek[weekIso] !== undefined) return
    planningApi
      .getShoppingChecks(weekIso)
      .then((checked) => setCheckedByWeek((prev) => ({ ...prev, [weekIso]: checked })))
      .catch(() => setCheckedByWeek((prev) => ({ ...prev, [weekIso]: {} })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekIso, isPastWeek])

  useEffect(() => {
    const timers = saveTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  function recipesForDay(day) {
    const iso = toISODate(day)
    return recipes.filter((r) => r.plannedDates?.includes(iso))
  }

  function formatItemLabel(item, qty) {
    const qtyLabel = item.mixed || qty == null ? '' : `${qty}`
    return `${qtyLabel}${item.unit ? ` ${item.unit}` : ''} ${item.name}`.trim()
  }

  function availableRecipes(day) {
    const iso = toISODate(day)
    return recipes.filter((r) => !r.plannedDates?.includes(iso))
  }

  async function assignRecipe(day, recipeId) {
    if (!recipeId || toISODate(day) < todayIso) return
    await recipesApi.addPlannedDate(recipeId, toISODate(day))
    reload()
    reloadShoppingList()
  }

  async function unassignRecipe(recipeId, day) {
    await recipesApi.removePlannedDate(recipeId, toISODate(day))
    reload()
    reloadShoppingList()
  }

  function scheduleSave(week, checked) {
    clearTimeout(saveTimers.current[week])
    saveTimers.current[week] = setTimeout(() => {
      planningApi.saveShoppingChecks(week, checked).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  function toggleShoppingItem(item) {
    setCheckedByWeek((prev) => {
      const weekChecked = { ...(prev[weekIso] || {}) }
      const isMixed = item.mixed || item.qty == null
      const bought = weekChecked[item.key]
      const isFullyBought = isMixed ? bought === true : (bought || 0) >= item.qty
      if (isFullyBought) {
        delete weekChecked[item.key]
      } else {
        weekChecked[item.key] = isMixed ? true : item.qty
      }
      scheduleSave(weekIso, weekChecked)
      return { ...prev, [weekIso]: weekChecked }
    })
  }

  const checkedItems = checkedByWeek[weekIso] || {}

  const weekLabel = `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`

  return (
    <PageBackground>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-shimmer font-logo text-4xl font-bold">Planning</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="liquid-glass relative rounded-full px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
            >
              <span className="relative"> Précédente</span>
            </button>
            <span className="liquid-glass gold-glass relative rounded-full px-4 py-1.5 text-sm font-semibold">
              <span className="relative text-stone-900 dark:text-white">{weekLabel}</span>
            </span>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="liquid-glass relative rounded-full px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
            >
              <span className="relative">Suivante</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {days.map((day) => {
              const iso = toISODate(day)
              const isToday = iso === todayIso
              const isPastDay = iso < todayIso
              const dayRecipes = recipesForDay(day)
              return (
                <div
                  key={iso}
                  className={`liquid-glass flex flex-col overflow-hidden rounded-xl transition-transform ${
                    isToday ? 'gold-glass -translate-y-1 scale-105 shadow-[0_8px_28px_rgba(0,0,0,0.35)]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
                  }`}
                >
                  <div className={`relative flex-1 p-3 ${isToday ? 'bg-white/10' : 'bg-white/60 dark:bg-black/50'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? 'text-stone-900' : 'text-stone-900 dark:text-stone-100'}`}>
                      {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>

                    <div className="mt-3 space-y-2">
                      {dayRecipes.length === 0 && (
                        <p className={`text-xs ${isToday ? 'text-stone-600' : 'text-stone-500 dark:text-stone-400'}`}>Rien de prévu</p>
                      )}
                      {dayRecipes.map((recipe) => (
                        <div key={recipe.id} className="liquid-glass relative flex items-center gap-2 rounded-lg border border-(--shimmer-2) p-1.5">
                          <Link to={`/recipes/${recipe.id}`} className="relative min-w-0 flex-1 truncate text-xs font-semibold text-stone-900 hover:underline dark:text-stone-100">
                            {recipe.title}
                          </Link>
                          <button
                            onClick={() => unassignRecipe(recipe.id, day)}
                            aria-label="Retirer du planning"
                            className="relative shrink-0 text-xs text-stone-500 transition hover:text-red-500 dark:text-stone-400"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {!isPastDay && (
                      <div className="mt-3">
                        <select
                          value=""
                          onChange={(e) => assignRecipe(day, e.target.value)}
                          className="w-full rounded-md border border-white/40 bg-white/70 px-2 py-1 text-xs text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
                        >
                          <option value="">Ajouter une recette...</option>
                          {availableRecipes(day).map((r) => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <section className="liquid-glass mt-6 overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="relative bg-white/60 p-4 dark:bg-black/50">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Liste de courses de la semaine</h2>
            <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
              Se met à jour automatiquement à chaque recette ajoutée au planning de la semaine, en fusionnant les ingrédients identiques.
            </p>

            {isPastWeek ? (
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                Liste de courses indisponible pour une semaine déjà passée.
              </p>
            ) : shoppingListError ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{shoppingListError}</p>
            ) : shoppingList.length === 0 ? (
              <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">Aucune recette planifiée cette semaine.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {shoppingList.map((item) => {
                  const isMixed = item.mixed || item.qty == null
                  const bought = checkedItems[item.key]
                  const isFullyBought = isMixed ? bought === true : (bought || 0) >= item.qty
                  const remainder = !isMixed && bought > 0 && !isFullyBought ? item.qty - bought : null
                  return (
                    <li key={item.key}>
                      <label className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-stone-700 dark:text-stone-300">
                        <input
                          type="checkbox"
                          checked={isFullyBought}
                          onChange={() => toggleShoppingItem(item)}
                          className="h-4 w-4 rounded border-white/40 accent-(--shimmer-2)"
                        />
                        <span className={isFullyBought ? 'line-through opacity-50' : ''}>
                          {formatItemLabel(item, item.qty)}
                        </span>
                        {remainder != null && (
                          <span className="text-xs font-semibold text-(--shimmer-1) dark:text-(--shimmer-2)">
                            il manque {remainder}{item.unit ? ` ${item.unit}` : ''}
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PageBackground>
  )
}
