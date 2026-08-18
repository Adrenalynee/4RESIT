import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(identifier, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
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
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Email ou pseudo</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
            <a
              href="/api/auth/google"
              className="block w-full rounded-md border border-white/40 bg-white/20 py-2 text-center text-sm font-medium text-stone-800 hover:bg-white/40 dark:text-stone-100 dark:hover:bg-white/20"
            >
              Continuer avec Google
            </a>
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
