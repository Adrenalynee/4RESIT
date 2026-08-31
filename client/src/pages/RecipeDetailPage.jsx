import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/recipesApi'
import * as cookbooksApi from '../api/cookbooksApi'
import { useAuth } from '../context/AuthContext'
import { useRecipeTaxonomy } from '../context/RecipeTaxonomyContext'
import PageBackground from '../components/PageBackground'
import Icon from '../components/Icon'
import { toISODate } from '../utils/date'
import recipeIcon from '../assets/recipe.svg?raw'
import portionIcon from '../assets/portion.svg?raw'
import clockIcon from '../assets/clock.svg?raw'
import cookingIcon from '../assets/cooking.svg?raw'
import cookingIconUrl from '../assets/cooking.svg'
import hourglassIcon from '../assets/hourglass.svg?raw'
import trashIcon from '../assets/trash.svg?raw'
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal'
import EditRecipeModal from '../components/modals/EditRecipeModal'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { canComment, canEditRecipes, getMyRole } from '../utils/permissions'
import { isValidUrl } from '../utils/url'

const todayIso = toISODate(new Date())

export default function RecipeDetailPage() {
  const { id, cookbookId } = useParams()
  const { user } = useAuth()
  const { getLabel } = useRecipeTaxonomy()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [recipeError, setRecipeError] = useState('')
  const [myRole, setMyRole] = useState(null)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState(null)
  const [commentError, setCommentError] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditRecipe, setShowEditRecipe] = useState(false)

  function reload() {
    setRecipeError('')
    api
      .getRecipeById(id)
      .then((r) => {
        setRecipe(r)
        setPlanDate('')
      })
      .catch((err) => setRecipeError(err.message))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!cookbookId) {
      setMyRole(null)
      setRoleLoaded(true)
      return
    }
    setRoleLoaded(false)
    cookbooksApi.getCookbookById(cookbookId)
      .then((cb) => setMyRole(getMyRole(cb, user.id)))
      .catch(() => setMyRole(null))
      .finally(() => setRoleLoaded(true))
  }, [cookbookId, user.id])

  if (recipeError) {
    return <PageBackground><ErrorState message={recipeError} onRetry={reload} /></PageBackground>
  }

  if (!recipe || !roleLoaded) {
    return (
      <PageBackground>
        <div className="px-4 py-8">
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </PageBackground>
    )
  }

  if (cookbookId && !myRole) {
    return (
      <PageBackground>
        <ErrorState message="Vous n'êtes pas membre de ce cookbook." />
      </PageBackground>
    )
  }

  const canEdit = cookbookId ? canEditRecipes(myRole) : recipe.ownerId === user.id
  const canPostComment = cookbookId ? canComment(myRole) : true

  async function handleFavorite() {
    await api.toggleFavorite(id)
    reload()
  }

  async function handlePlan(e) {
    e.preventDefault()
    if (!planDate || planDate < todayIso) return
    await api.addPlannedDate(id, planDate)
    setPlanDate('')
    reload()
  }

  async function handleUnplan(date) {
    await api.removePlannedDate(id, date)
    reload()
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    await api.addComment(id, user.id, commentText.trim())
    setCommentText('')
    reload()
  }

  function handleStartEditComment(comment) {
    setCommentError('')
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  function handleCancelEditComment() {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  async function handleSaveEditComment(e) {
    e.preventDefault()
    if (!editingCommentText.trim()) return
    setCommentError('')
    try {
      await api.updateComment(id, editingCommentId, user.id, editingCommentText.trim())
      setEditingCommentId(null)
      setEditingCommentText('')
      reload()
    } catch (err) {
      setCommentError(err.message)
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentError('')
    try {
      await api.deleteComment(id, commentId, user.id)
      setConfirmDeleteCommentId(null)
      reload()
    } catch (err) {
      setCommentError(err.message)
    }
  }

  async function handleDelete() {
    await api.deleteRecipe(id)
    navigate(cookbookId ? `/cookbooks/${cookbookId}` : '/recipes')
  }

  const showComments = Boolean(cookbookId) && recipe.cookbookId === cookbookId

  return (
    <PageBackground>
      <div className="px-4 py-8">
        <div className="sm:sticky sm:top-20 sm:z-30 sm:inline-block">
          <Link
            to={cookbookId ? `/cookbooks/${cookbookId}` : '/recipes'}
            className="liquid-glass gold-glass gold-glass-light relative inline-block cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-stone-900 dark:text-white">Retour {cookbookId ? 'au cookbook' : 'aux recettes'}</span>
          </Link>
        </div>

        <div className={`mt-4 grid grid-cols-1 gap-4 ${showComments ? 'lg:grid-cols-[1fr_1.6fr_0.7fr]' : 'lg:grid-cols-2'}`}>
          <div className="flex h-full flex-col gap-4">
            {recipe.image ? (
              <div className="liquid-glass overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <img src={recipe.image} alt={recipe.title} className="relative aspect-video w-full object-cover" />
              </div>
            ) : (
              <div className="liquid-glass liquid-glass-opaque-soft flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <div
                  role="presentation"
                  aria-hidden="true"
                  className="icon-shimmer relative h-20 w-20"
                  style={{ WebkitMaskImage: `url("${cookingIconUrl}")`, maskImage: `url("${cookingIconUrl}")` }}
                />
              </div>
            )}

            <div className="liquid-glass flex-1 overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="relative h-full bg-white/60 p-4 dark:bg-black/50">
                <section>
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Ingrédients</h2>
                  <ul className="mt-2 divide-y divide-stone-900/10 dark:divide-white/10">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex gap-2 py-2 text-sm text-stone-700 dark:text-stone-300">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</span>
                        <span>{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>

          <div className="liquid-glass flex h-full flex-col overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <div className="relative flex-1 bg-white/60 p-4 dark:bg-black/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h1 className="font-logo text-3xl font-black text-accent-dark sm:text-4xl">{recipe.title}</h1>
                <div className="flex shrink-0 flex-nowrap items-center gap-2">
                  <button
                    onClick={handleFavorite}
                    className={`liquid-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition hover:scale-105 hover:brightness-125 active:scale-100 ${
                      recipe.favorite ? 'gold-glass text-stone-900 dark:text-white' : 'text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <span className="relative">{recipe.favorite ? 'Favori' : 'Ajouter aux favoris'}</span>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setShowEditRecipe(true)}
                      className="liquid-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                    >
                      <span className="relative">Modifier</span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      aria-label="Supprimer la recette"
                      className="liquid-glass relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-black transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-white"
                    >
                      <Icon svg={trashIcon} className="relative text-base" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-700 dark:text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Icon svg={recipeIcon} />
                  {isValidUrl(recipe.source) ? (
                    <a
                      href={recipe.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted hover:text-(--shimmer-2)"
                    >
                      Source
                    </a>
                  ) : (
                    recipe.source
                  )}
                </span>
                <span className="flex items-center gap-1.5"><Icon svg={portionIcon} /> {recipe.servings} portions</span>
                <span className="flex items-center gap-1.5"><Icon svg={clockIcon} /> {recipe.prepTime} min prépa</span>
                <span className="flex items-center gap-1.5"><Icon svg={cookingIcon} /> {recipe.cookTime} min cuisson</span>
                <span className="flex items-center gap-1.5"><Icon svg={hourglassIcon} /> {recipe.prepTime + recipe.cookTime} min total</span>
                {recipe.difficulty && <span>{getLabel(recipe.difficulty)}</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {recipe.tags.map((tag) => (
                  <span key={tag} className="liquid-glass gold-glass gold-glass-light relative rounded-full px-2 py-0.5 text-xs">
                    <span className="relative text-stone-900 dark:text-stone-100">{getLabel(tag)}</span>
                  </span>
                ))}
              </div>

              <section className="mt-6">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Étapes</h2>
                <div className="mt-2 divide-y divide-stone-900/10 dark:divide-white/10">
                  {recipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 py-3">
                      <span className="liquid-glass gold-glass flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                        <span className="relative text-xs font-bold text-stone-900">{i + 1}</span>
                      </span>
                      <p className="text-stone-700 dark:text-stone-300">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="liquid-glass mt-6 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Planification</h2>
                <form onSubmit={handlePlan} className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={planDate}
                    min={todayIso}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                  <button
                    type="submit"
                    className="liquid-glass gold-glass rounded-full px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
                  >
                    <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Ajouter</span>
                  </button>
                </form>
                {recipe.plannedDates?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.plannedDates.map((date) => (
                      <span key={date} className="liquid-glass relative flex items-center gap-2 rounded-full border border-(--shimmer-2) px-3 py-1 text-sm">
                        <span className="relative text-stone-900 dark:text-stone-100">{date}</span>
                        <button
                          type="button"
                          onClick={() => handleUnplan(date)}
                          aria-label="Retirer cette date"
                          className="relative text-stone-500 transition hover:text-red-500 dark:text-stone-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          {showComments && (
            <div className="liquid-glass flex h-full flex-col overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="relative flex h-full flex-col bg-white/60 p-4 dark:bg-black/50">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Commentaires</h2>
                <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
                  {recipe.comments.length === 0 && (
                    <p className="text-sm text-stone-700 dark:text-stone-300">Aucun commentaire pour l'instant.</p>
                  )}
                  {recipe.comments.map((c) => (
                    <div key={c.id} className="liquid-glass relative flex items-start justify-between gap-2 rounded-md p-2 text-sm">
                      <p className="relative">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{c.user?.name}</span>{' '}
                        <span className="text-stone-700 dark:text-stone-300">{c.text}</span>
                        {c.editedAt && <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">(modifié)</span>}
                      </p>
                      {c.userId === user.id && (
                        <div className="relative flex shrink-0 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleStartEditComment(c)}
                            aria-label="Modifier le commentaire"
                            className="text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCommentError('')
                              setConfirmDeleteCommentId(c.id)
                            }}
                            aria-label="Supprimer le commentaire"
                            className="text-stone-500 transition hover:text-red-500 dark:text-stone-400"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {canPostComment && (
                  <form onSubmit={handleComment} className="mt-3 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      className="flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                    />
                    <button
                      type="submit"
                      className="liquid-glass relative rounded-full px-3 py-2 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                    >
                      <span className="relative">Envoyer</span>
                    </button>
                  </form>
                )}

                {editingCommentId && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20 p-4"
                    onClick={handleCancelEditComment}
                  >
                    <form
                      onSubmit={handleSaveEditComment}
                      onClick={(e) => e.stopPropagation()}
                      className="liquid-glass liquid-glass-opaque w-full max-w-sm rounded-xl p-4"
                    >
                      <h3 className="relative font-semibold text-stone-900 dark:text-stone-100">Modifier le commentaire</h3>
                      <textarea
                        autoFocus
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelEditComment()}
                        className="relative mt-2 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none dark:border-white/15 dark:bg-black/40 dark:text-white"
                      />
                      {commentError && <p className="relative mt-1 text-xs text-red-500">{commentError}</p>}
                      <div className="relative mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEditComment}
                          className="liquid-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="liquid-glass gold-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-95 active:scale-100 dark:text-white"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {confirmDeleteCommentId && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20 p-4"
                    onClick={() => setConfirmDeleteCommentId(null)}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="liquid-glass liquid-glass-opaque w-full max-w-sm rounded-xl p-4 text-center"
                    >
                      <p className="relative text-sm text-stone-900 dark:text-stone-100">Supprimer ce commentaire ?</p>
                      {commentError && <p className="relative mt-1 text-xs text-red-500">{commentError}</p>}
                      <div className="relative mt-3 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCommentId(null)}
                          className="liquid-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(confirmDeleteCommentId)}
                          className="liquid-glass red-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-red-700 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-red-100"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          recipeName={recipe.title}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}

      {showEditRecipe && (
        <EditRecipeModal
          recipe={recipe}
          onClose={() => setShowEditRecipe(false)}
          onSaved={() => {
            setShowEditRecipe(false)
            reload()
          }}
        />
      )}
    </PageBackground>
  )
}
