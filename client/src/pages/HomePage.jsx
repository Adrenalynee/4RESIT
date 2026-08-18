import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/recipesApi'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'
import RecipeCarousel from '../components/RecipeCarousel'

const PILLARS = [
  { title: 'Recettes', text: 'Cataloguez vos créations, avec ingrédients, étapes et notes personnelles.' },
  { title: 'Cookbooks', text: 'Partagez des carnets de recettes avec votre famille ou votre équipe.' },
  { title: 'Planification', text: 'Organisez vos repas de la semaine et retrouvez-les en un instant.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!user) return
    api.getSuggestions().then(setSuggestions)
  }, [user])

  return (
    <PageBackground className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.5em] text-white/70">Recettes & planification de repas</p>
        <h1 className="text-shimmer mt-4 font-logo text-6xl font-black tracking-widest sm:text-8xl">SUPMEAL</h1>
        <p className="mt-6 max-w-xl text-balance text-base text-white/85 sm:text-lg">
          L'outil SUPMEAL Pro pour cataloguer vos recettes, partager des cookbooks avec votre
          équipe et planifier vos repas de la semaine, le tout réuni au même endroit.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              to="/recipes"
              className="liquid-glass gold-glass rounded-full px-8 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 hover:shadow-[0_6px_22px_rgba(0,0,0,0.3)] active:scale-100"
            >
              <span className="relative text-sm font-semibold tracking-wide text-stone-900">Voir mes recettes</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="liquid-glass gold-glass rounded-full px-8 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 hover:shadow-[0_6px_22px_rgba(0,0,0,0.3)] active:scale-100"
              >
                <span className="relative text-sm font-semibold tracking-wide text-stone-900">Se connecter</span>
              </Link>
              <Link
                to="/register"
                className="liquid-glass rounded-full px-8 py-3 transition hover:scale-105 hover:brightness-125 active:scale-100"
              >
                <span className="relative text-sm font-semibold tracking-wide text-white">Créer un compte</span>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-5xl gap-6 px-4 sm:grid-cols-3">
        {PILLARS.map((item) => (
          <div key={item.title} className="liquid-glass rounded-2xl p-6 text-center">
            <h3 className="relative font-logo text-xl font-bold text-white">{item.title}</h3>
            <p className="relative mt-2 text-sm text-white/80">{item.text}</p>
          </div>
        ))}
      </section>

      {user && suggestions.length > 0 && (
        <section className="mx-auto mt-10 w-full max-w-5xl px-4">
          <h2 className="text-shimmer text-center font-logo text-2xl font-bold">Suggestions pour vous</h2>
          <div className="mt-4">
            <RecipeCarousel recipes={suggestions} />
          </div>
        </section>
      )}
    </PageBackground>
  )
}
