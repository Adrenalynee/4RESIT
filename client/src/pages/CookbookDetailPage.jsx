import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as cookbooksApi from '../api/cookbooksApi'
import * as recipesApi from '../api/recipesApi'
import { connectChatSocket } from '../api/socket'
import { useAuth } from '../context/AuthContext'
import RecipeCarousel from '../components/RecipeCarousel'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import PageBackground from '../components/PageBackground'
import NewRecipeModal from '../components/modals/NewRecipeModal'
import { ROLE_LABELS, canEditRecipes, canManageMembers, getMyRole } from '../utils/permissions'

export default function CookbookDetailPage() {
  const { cookbookId: id } = useParams()
  const { user } = useAuth()
  const [cookbook, setCookbook] = useState(null)
  const [cookbookError, setCookbookError] = useState('')
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState('')
  const [showNewRecipe, setShowNewRecipe] = useState(false)
  const [activeRecipeId, setActiveRecipeId] = useState(() => sessionStorage.getItem(`cookbook-${id}-active-recipe`))
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState(null)
  const [messageError, setMessageError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('reader')
  const [inviteError, setInviteError] = useState('')
  const [memberError, setMemberError] = useState('')
  const [socket, setSocket] = useState(null)

  function reload() {
    setCookbookError('')
    cookbooksApi.getCookbookById(id).then(setCookbook).catch((err) => setCookbookError(err.message))
    cookbooksApi.getMessages(id).then(setMessages)
  }

  useEffect(reload, [id])

  useEffect(() => {
    const s = connectChatSocket()
    s.emit('cookbook:join', { cookbookId: id })
    s.on('message:new', (msg) => setMessages((prev) => [...prev, msg]))
    s.on('message:updated', (msg) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m))))
    s.on('message:deleted', ({ id: msgId }) => setMessages((prev) => prev.filter((m) => m.id !== msgId)))
    s.on('error', (e) => setMessageError(e.error))
    setSocket(s)
    return () => s.disconnect()
  }, [id])

  function reloadRecipes() {
    recipesApi.getRecipes({ cookbookId: id, query: search || undefined }).then(setRecipes)
  }

  useEffect(reloadRecipes, [id, search])

  function handleActiveRecipeChange(recipeId) {
    setActiveRecipeId(recipeId)
    if (recipeId) sessionStorage.setItem(`cookbook-${id}-active-recipe`, recipeId)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError('')
    try {
      await cookbooksApi.inviteMember(id, inviteEmail.trim(), inviteRole)
      setInviteEmail('')
      reload()
    } catch (err) {
      setInviteError(err.message)
    }
  }

  async function handleRoleChange(memberId, role) {
    setMemberError('')
    try {
      await cookbooksApi.updateMemberRole(id, memberId, role)
      reload()
    } catch (err) {
      setMemberError(err.message)
    }
  }

  async function handleRemoveMember(memberId) {
    setMemberError('')
    try {
      await cookbooksApi.removeMember(id, memberId)
      reload()
    } catch (err) {
      setMemberError(err.message)
    }
  }

  function handleSendMessage(e) {
    e.preventDefault()
    if (!messageText.trim() || !socket) return
    socket.emit('message:send', { cookbookId: id, text: messageText.trim() })
    setMessageText('')
  }

  function handleStartEdit(message) {
    setMessageError('')
    setEditingMessageId(message.id)
    setEditingText(message.text)
  }

  function handleCancelEdit() {
    setEditingMessageId(null)
    setEditingText('')
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingText.trim() || !socket) return
    setMessageError('')
    socket.emit('message:edit', { cookbookId: id, messageId: editingMessageId, text: editingText.trim() })
    setEditingMessageId(null)
    setEditingText('')
  }

  function handleDeleteMessage(messageId) {
    setMessageError('')
    if (!socket) return
    socket.emit('message:delete', { cookbookId: id, messageId })
    setConfirmDeleteMessageId(null)
  }

  if (cookbookError) {
    return <PageBackground><ErrorState message={cookbookError} onRetry={reload} /></PageBackground>
  }

  if (!cookbook) {
    return (
      <PageBackground>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
          </div>
        </div>
      </PageBackground>
    )
  }

  const myRole = getMyRole(cookbook, user.id)
  const isCreator = canManageMembers(myRole)

  if (!myRole) {
    return (
      <PageBackground>
        <ErrorState message="Vous n'êtes pas membre de ce cookbook." />
        <div className="mt-4 text-center">
          <Link to="/cookbooks" className="text-sm text-white underline">Retour aux cookbooks</Link>
        </div>
      </PageBackground>
    )
  }

  return (
    <PageBackground>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="inline-block">
          <Link
            to="/cookbooks"
            className="liquid-glass gold-glass gold-glass-light relative inline-block cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-stone-900 dark:text-white">Retour aux cookbooks</span>
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-white">{cookbook.name}</h1>
        <p className="mt-1 text-sm text-white/80">{cookbook.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cookbook.members.map((m) => (
            <span key={m.userId} className="liquid-glass liquid-glass-opaque relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
              <span className="relative text-stone-900 dark:text-stone-100">{m.user?.name}</span>
              {isCreator && m.role !== 'creator' ? (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className="relative rounded-full border border-white/40 bg-white/70 px-1.5 py-0.5 text-xs text-stone-900 focus:border-(--shimmer-2) focus:outline-none dark:border-white/15 dark:bg-black/40 dark:text-white"
                  >
                    <option value="reader">Lecteur</option>
                    <option value="commenter">Commentateur</option>
                    <option value="editor">Éditeur</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.userId)}
                    aria-label={`Retirer ${m.user?.name}`}
                    className="relative text-stone-500 transition hover:text-red-500 dark:text-stone-400"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="relative text-stone-900 dark:text-stone-100">· {ROLE_LABELS[m.role] || m.role}</span>
              )}
            </span>
          ))}
        </div>
        {memberError && <p className="mt-1 text-xs text-red-400">{memberError}</p>}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans ce cookbook (titre, ingrédients, tags)..."
                className="w-full flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
              />
              {canEditRecipes(myRole) && (
                <button
                  onClick={() => setShowNewRecipe(true)}
                  className="liquid-glass gold-glass shrink-0 rounded-full px-5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
                >
                  <span className="relative text-sm font-semibold text-stone-900 dark:text-white">+ Nouvelle recette</span>
                </button>
              )}
            </div>
            <div className="mt-4">
              <RecipeCarousel
                recipes={recipes}
                getTo={(recipe) => `/cookbooks/${id}/recipes/${recipe.id}`}
                activeRecipeId={activeRecipeId}
                onActiveRecipeChange={handleActiveRecipeChange}
              />
            </div>
          </div>

          <div className="space-y-6">
            {isCreator && (
              <section className="liquid-glass rounded-xl p-4">
                <h2 className="font-semibold text-stone-900 dark:text-white">Inviter un membre</h2>
                <form onSubmit={handleInvite} className="mt-2 space-y-2">
                  <input
                    type="email"
                    placeholder="email@exemple.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white"
                  >
                    <option value="reader">Lecteur</option>
                    <option value="commenter">Commentateur</option>
                    <option value="editor">Éditeur</option>
                  </select>
                  {inviteError && <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>}
                  <button
                    type="submit"
                    className="liquid-glass gold-glass relative w-full rounded-full py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
                  >
                    <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Inviter</span>
                  </button>
                </form>
              </section>
            )}

            <section className="liquid-glass relative flex h-96 flex-col overflow-hidden rounded-xl p-4">
              <h2 className="font-semibold text-stone-900 dark:text-white">Messagerie</h2>
              <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="liquid-glass relative flex items-start justify-between gap-2 rounded-md bg-white/60 p-2 text-sm dark:bg-black/50">
                    <p className="relative">
                      <span className="font-semibold text-stone-900 dark:text-white">{m.user?.name}</span>{' '}
                      <span className="text-stone-700 dark:text-white">{m.text}</span>
                      {m.editedAt && <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">(modifié)</span>}
                    </p>
                    {m.userId === user.id && (
                      <div className="relative flex shrink-0 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          aria-label="Modifier le message"
                          className="text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageError('')
                            setConfirmDeleteMessageId(m.id)
                          }}
                          aria-label="Supprimer le message"
                          className="text-stone-500 transition hover:text-red-500 dark:text-stone-400"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && <p className="text-sm text-stone-700 dark:text-white">Aucun message pour l'instant.</p>}
              </div>
              <form onSubmit={handleSendMessage} className="mt-2 flex gap-2">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                />
                <button
                  type="submit"
                  className="liquid-glass relative rounded-full px-3 py-2 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                >
                  <span className="relative">Envoyer</span>
                </button>
              </form>

              {editingMessageId && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20 p-4"
                  onClick={handleCancelEdit}
                >
                  <form
                    onSubmit={handleSaveEdit}
                    onClick={(e) => e.stopPropagation()}
                    className="liquid-glass liquid-glass-opaque w-full max-w-sm rounded-xl p-4"
                  >
                    <h3 className="relative font-semibold text-stone-900 dark:text-stone-100">Modifier le message</h3>
                    <textarea
                      autoFocus
                      rows={3}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && handleCancelEdit()}
                      className="relative mt-2 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:border-(--shimmer-2) focus:outline-none dark:border-white/15 dark:bg-black/40 dark:text-white"
                    />
                    {messageError && <p className="relative mt-1 text-xs text-red-500">{messageError}</p>}
                    <div className="relative mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
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

              {confirmDeleteMessageId && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/20 p-4"
                  onClick={() => setConfirmDeleteMessageId(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="liquid-glass liquid-glass-opaque w-full max-w-sm rounded-xl p-4 text-center"
                  >
                    <p className="relative text-sm text-stone-900 dark:text-stone-100">Supprimer ce message ?</p>
                    {messageError && <p className="relative mt-1 text-xs text-red-500">{messageError}</p>}
                    <div className="relative mt-3 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMessageId(null)}
                        className="liquid-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(confirmDeleteMessageId)}
                        className="liquid-glass red-glass relative rounded-full px-4 py-1.5 text-sm font-semibold text-red-700 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-red-100"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {showNewRecipe && (
        <NewRecipeModal
          defaultCookbookId={id}
          onClose={() => setShowNewRecipe(false)}
          onCreated={() => {
            setShowNewRecipe(false)
            reloadRecipes()
          }}
        />
      )}
    </PageBackground>
  )
}
