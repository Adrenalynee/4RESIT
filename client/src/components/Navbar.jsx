import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  `relative block rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-white/25 text-stone-900 ring-1 ring-inset ring-white/70 shadow-[0_1px_6px_rgba(0,0,0,0.15)]'
      : 'text-stone-800 hover:bg-white/30'
  }`

const mobileLinkClass = ({ isActive }) =>
  `relative block rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'liquid-glass gold-glass gold-glass-light text-stone-900 dark:text-white'
      : 'text-stone-800 hover:bg-white/30 dark:text-stone-100'
  }`

const NAV_LINKS = [
  { to: '/recipes', label: 'Recettes' },
  { to: '/cookbooks', label: 'Cookbooks' },
  { to: '/planning', label: 'Planning' },
  { to: '/settings', label: 'Paramètres' },
]

export default function Navbar({ sticky = false, logoOnly = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    // Déclenché après le rendu qui suit logout() : évite que la redirection
    // automatique de ProtectedRoute vers /login n'écrase cette navigation.
    setTimeout(() => navigate('/', { replace: true }), 0)
  }

  return (
    <header
      className={`h-16 bg-transparent ${sticky ? 'relative z-40 sm:sticky sm:top-0' : 'relative'}`}
    >
      <NavLink
        to="/"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-shimmer font-logo text-2xl font-black tracking-widest sm:left-6 sm:text-3xl"
        onClick={() => setMenuOpen(false)}
      >
        SUPMEAL
      </NavLink>

      {!logoOnly && (
      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-3 pr-20 sm:pr-24">
        {user && (
          <>
            <nav className="hidden items-center gap-3 md:flex">
              <div className="liquid-glass gold-glass flex items-center gap-1 rounded-full p-1.5">
                {NAV_LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClass}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
              <div className="liquid-glass liquid-glass-opaque flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-2">
                <img src={user.avatar} alt={user.name} className="relative h-8 w-8 rounded-full object-cover" />
                <span className="relative text-sm font-medium text-stone-900 dark:text-stone-100">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="liquid-glass gold-glass relative cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100 active:brightness-90"
                >
                  <span className="relative text-black">Déconnexion</span>
                </button>
              </div>
            </nav>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-stone-800 dark:text-stone-100 md:hidden"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </>
        )}
      </div>
      )}

      {user && menuOpen && (
        <div className="absolute inset-x-4 top-16 z-50 md:hidden">
          <nav className="liquid-glass overflow-hidden rounded-2xl">
            <div className="relative bg-white/95 p-3 dark:bg-black/95">
              <div className="flex items-center gap-2 pb-3">
                <img src={user.avatar} alt={user.name} className="relative h-8 w-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{user.name}</span>
              </div>
              <div className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                    {({ isActive }) => (isActive ? <span className="relative">{link.label}</span> : link.label)}
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="liquid-glass gold-glass relative mt-1 block w-full cursor-pointer rounded-full px-3 py-1.5 text-left text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100 active:brightness-90"
                >
                  <span className="relative text-black">Déconnexion</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
