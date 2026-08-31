import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'
import { isPasswordStrong } from '../utils/passwordStrength'
import { isValidEmail } from '../utils/email'

export default function RegisterPage() {
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const emailValid = isValidEmail(email)
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword
  const canSubmit = emailValid && isPasswordStrong(password) && password === confirmPassword

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isPasswordStrong(password)) {
      setError('Le mot de passe ne respecte pas les critères de sécurité requis.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSubmitting(true)
    try {
      await register(pseudo, email, password)
      navigate('/recipes')
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
          <p className="mt-1 text-center text-sm text-stone-700 dark:text-stone-300">Créer un compte</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Pseudo</label>
              <input
                required
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:bg-white/10 dark:text-stone-100 dark:placeholder:text-stone-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className="mt-1 w-full rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:bg-white/10 dark:text-stone-100 dark:placeholder:text-stone-400"
              />
              {emailTouched && email.length > 0 && !emailValid && (
                <p className="mt-1 text-xs text-red-500">L'email n'est pas du bon format.</p>
              )}
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
              <PasswordStrengthMeter password={password} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/40 bg-white/40 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-(--shimmer-2) focus:outline-none focus:ring-2 focus:ring-(--shimmer-2)/40 dark:bg-white/10 dark:text-stone-100 dark:placeholder:text-stone-400"
              />
              {!passwordsMatch && (
                <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="liquid-glass gold-glass relative w-full cursor-pointer rounded-full py-2 text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative text-black">Créer mon compte</span>
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-stone-700 dark:text-stone-300">
            <span>Déjà inscrit ?</span>
            <Link
              to="/login"
              className="liquid-glass gold-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:brightness-95 active:brightness-90"
            >
              <span className="relative text-black">Se connecter</span>
            </Link>
          </div>
        </div>
      </div>
    </PageBackground>
  )
}
