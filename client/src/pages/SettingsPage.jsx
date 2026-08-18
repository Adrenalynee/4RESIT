import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/usersApi'
import { getAllergens } from '../api/allergensApi'
import { getDiets } from '../api/dietsApi'
import { getCuisines } from '../api/cuisinesApi'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'
import ImportExportModal from '../components/modals/ImportExportModal'
import ConfirmDeleteAccountModal from '../components/modals/ConfirmDeleteAccountModal'
import CropAvatarModal from '../components/modals/CropAvatarModal'

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user.name || '')
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || '')
  const [diets, setDiets] = useState(user.preferences?.diets || [])
  const [dietOptions, setDietOptions] = useState([])
  const [allergens, setAllergens] = useState([])
  const [allergies, setAllergies] = useState(user.preferences?.allergies || [])
  const [cuisineOptions, setCuisineOptions] = useState([])
  const [favoriteCuisines, setFavoriteCuisines] = useState(user.preferences?.favoriteCuisines || [])
  const [defaultServings, setDefaultServings] = useState(user.preferences?.defaultServings || 2)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showImportExport, setShowImportExport] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)

  useEffect(() => {
    getAllergens().then(setAllergens)
    getDiets().then(setDietOptions)
    getCuisines().then(setCuisineOptions)
  }, [])

  function toggleAllergy(value) {
    setAllergies((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]))
  }

  function toggleDiet(value) {
    setDiets((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]))
  }

  function toggleCuisine(value) {
    setFavoriteCuisines((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]))
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.readAsDataURL(file)
  }

  function handleCropConfirm(croppedDataUrl) {
    setAvatarPreview(croppedDataUrl)
    setCropSrc(null)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    const profile = { name: name.trim(), avatar: avatarPreview }
    await api.updateUserProfile(user.id, profile)
    refreshUser(profile)
  }

  async function handleSavePreferences(e) {
    e.preventDefault()
    const preferences = {
      diets,
      allergies,
      favoriteCuisines,
      defaultServings: Number(defaultServings),
    }
    await api.updateUserPreferences(user.id, preferences)
    refreshUser({ preferences })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')
    if (!currentPassword || !newPassword) return
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      await api.changePassword(user.id, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  async function handleDeleteAccount(password) {
    await api.deleteAccount(user.id, password)
    logout()
    navigate('/login')
  }

  return (
    <PageBackground>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-shimmer font-logo text-4xl font-bold">Paramètres</h1>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          <div className="flex flex-col gap-6">
            <section className="liquid-glass liquid-glass-opaque-soft rounded-xl p-4">
              <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Profil</h2>
              <form onSubmit={handleSaveProfile} className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={avatarPreview} alt={name} className="relative h-16 w-16 rounded-full object-cover" />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-input"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="avatar-input"
                      className="liquid-glass gold-glass gold-glass-light relative inline-block cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
                    >
                      <span className="relative text-stone-900 dark:text-white">Changer l'avatar</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Pseudo</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
                </div>
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Email</label>
                  <input value={user.email} disabled className="mt-1 w-full cursor-not-allowed rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-500 dark:border-white/15 dark:bg-black/20 dark:text-stone-400" />
                </div>
                <button
                  type="submit"
                  className="liquid-glass gold-glass rounded-full px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
                >
                  <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Enregistrer</span>
                </button>
              </form>
            </section>

            <section className="liquid-glass liquid-glass-opaque-soft rounded-xl p-4">
              <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Sécurité</h2>
              <form onSubmit={handleChangePassword} className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="min-w-40 flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                  />
                  <input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="min-w-40 flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                  />
                  <input
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="min-w-40 flex-1 rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white"
                  />
                  <button
                    type="submit"
                    className="liquid-glass gold-glass relative rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
                  >
                    <span className="relative text-stone-900 dark:text-white">Modifier</span>
                  </button>
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              </form>
              <p className="relative mt-3 text-sm text-stone-700 dark:text-stone-300">
                OAuth2 (Google, Microsoft, GitHub) : géré depuis l'écran de connexion pour cette maquette frontend.
              </p>
            </section>

            <section className="liquid-glass liquid-glass-opaque-soft flex flex-1 flex-col rounded-xl p-4">
              <h2 className="relative font-semibold text-red-700 dark:text-red-400">Supprimer votre compte</h2>
              <p className="relative mt-1 text-sm text-stone-700 dark:text-stone-300">
                Suppression définitive de votre compte, de vos cookbooks personnels et de vos recettes.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteAccount(true)}
                className="liquid-glass red-glass relative mt-3 cursor-pointer self-start rounded-full px-4 py-2 text-sm font-semibold text-red-700 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-red-100"
              >
                <span className="relative">Supprimer mon compte</span>
              </button>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="liquid-glass liquid-glass-opaque-soft rounded-xl p-4">
              <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Préférences culinaires</h2>
              <form onSubmit={handleSavePreferences} className="mt-3 space-y-3">
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Régime alimentaire</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {dietOptions.map((option) => {
                      const selected = diets.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleDiet(option.value)}
                          className={`liquid-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition hover:scale-105 hover:brightness-125 active:scale-100 ${
                            selected ? 'gold-glass text-stone-900 dark:text-white' : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <span className="relative">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Allergies</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {allergens.map((allergen) => {
                      const selected = allergies.includes(allergen.value)
                      return (
                        <button
                          key={allergen.value}
                          type="button"
                          onClick={() => toggleAllergy(allergen.value)}
                          className={`liquid-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition hover:scale-105 hover:brightness-125 active:scale-100 ${
                            selected ? 'gold-glass text-stone-900 dark:text-white' : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <span className="relative">{allergen.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Cuisine préférée</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {cuisineOptions.map((option) => {
                      const selected = favoriteCuisines.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleCuisine(option.value)}
                          className={`liquid-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition hover:scale-105 hover:brightness-125 active:scale-100 ${
                            selected ? 'gold-glass text-stone-900 dark:text-white' : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <span className="relative">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="relative block text-sm font-medium text-stone-900 dark:text-stone-100">Portions par défaut</label>
                  <input type="number" min="1" value={defaultServings} onChange={(e) => setDefaultServings(e.target.value)} className="mt-1 w-full rounded-md border border-white/40 bg-white/70 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white" />
                </div>
                <button
                  type="submit"
                  className="liquid-glass gold-glass rounded-full px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
                >
                  <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Enregistrer</span>
                </button>
              </form>
            </section>

            <section className="liquid-glass liquid-glass-opaque-soft flex flex-1 flex-col rounded-xl p-4">
              <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Import / Export</h2>
              <p className="relative mt-1 text-sm text-stone-700 dark:text-stone-300">Exporter ou importer vos recettes et cookbooks.</p>
              <button
                type="button"
                onClick={() => setShowImportExport(true)}
                className="liquid-glass gold-glass relative mt-3 cursor-pointer self-start rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
              >
                <span className="relative text-stone-900 dark:text-white">Gérer l'import / export</span>
              </button>
            </section>
          </div>
        </div>
      </div>

      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
      {showDeleteAccount && (
        <ConfirmDeleteAccountModal onClose={() => setShowDeleteAccount(false)} onConfirm={handleDeleteAccount} />
      )}
      {cropSrc && (
        <CropAvatarModal imageSrc={cropSrc} onClose={() => setCropSrc(null)} onConfirm={handleCropConfirm} />
      )}
    </PageBackground>
  )
}
