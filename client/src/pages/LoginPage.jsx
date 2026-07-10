import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'

const OAUTH_PROVIDERS = ['Google']

export default function LoginPage() {
  const [email, setEmail] = useState('camille@supmeal.fr')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, loginWithOAuth } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOAuth(provider) {
    setSubmitting(true)
    try {
      await loginWithOAuth(provider)
      navigate('/')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageBackground className="flex items-center justify-center px-4">
      <div className="liquid-glass w-full max-w-sm overflow-hidden rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="relative">
          <h1 className="text-shimmer font-logo text-center text-4xl font-black tracking-widest">SUPMEAL</h1>
          <p className="mt-1 text-center text-sm text-stone-700 dark:text-stone-300">
            Connectez-vous pour accéder à vos recettes
          </p>
          <p className="mt-3 rounded-md bg-black/5 px-3 py-2 text-center text-xs text-stone-600 dark:bg-white/10 dark:text-stone-300">
            Compte de démo : camille@supmeal.fr / password
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:bg-white/10 dark:text-stone-100 dark:placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:bg-white/10 dark:text-stone-100 dark:placeholder:text-stone-400"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="liquid-glass gold-glass relative w-full cursor-pointer rounded-full py-2 text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:brightness-95 active:brightness-90 disabled:opacity-50"
            >
              <span className="relative text-black">Se connecter</span>
            </button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
            <div className="h-px flex-1 bg-white/40" />
            ou continuer avec
            <div className="h-px flex-1 bg-white/40" />
          </div>

          <div className="space-y-2">
            {OAUTH_PROVIDERS.map((provider) => (
              <button
                key={provider}
                onClick={() => handleOAuth(provider)}
                disabled={submitting}
                className="w-full rounded-md border border-white/40 bg-white/20 py-2 text-sm font-medium text-stone-800 hover:bg-white/40 disabled:opacity-50 dark:text-stone-100 dark:hover:bg-white/20"
              >
                Continuer avec {provider}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-stone-700 dark:text-stone-300">
            <span>Pas encore de compte ?</span>
            <Link
              to="/register"
              className="liquid-glass gold-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:brightness-95 active:brightness-90"
            >
              <span className="relative text-black">Créer un compte</span>
            </Link>
          </div>
        </div>
      </div>
    </PageBackground>
  )
}
