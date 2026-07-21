import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import cookingIcon from '../assets/cooking.svg?raw'

export const CookbookCoverPage = forwardRef(function CookbookCoverPage({ label }, ref) {
  return (
    <div ref={ref} data-density="hard" className="overflow-hidden rounded-xl bg-book-paper">
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-shimmer font-logo text-5xl font-black">{label}</span>
      </div>
    </div>
  )
})

export const CookbookFlipPage = forwardRef(function CookbookFlipPage({ cookbook, onOpen }, ref) {
  return (
    <div ref={ref} data-density="soft" className="overflow-hidden rounded-xl bg-book-paper">
      <div className="relative flex h-full flex-col justify-between p-6">
        <Icon
          svg={cookingIcon}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-dark/20"
          role="presentation"
          aria-hidden="true"
          style={{ fontSize: '7rem' }}
        />
        <div className="relative">
          <h2 className="font-logo text-2xl font-bold text-accent-dark">{cookbook.name}</h2>
          <p className="mt-2 text-sm text-stone-700">{cookbook.description}</p>
        </div>
        <div className="relative">
          <p className="text-xs text-stone-600">
            {cookbook.members.length} membre(s) · {cookbook.recipeIds.length} recette(s)
          </p>
          <Link
            to={`/cookbooks/${cookbook.id}`}
            onClick={() => onOpen?.(cookbook.id)}
            className="liquid-glass gold-glass relative mt-3 inline-block cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-stone-900">Ouvrir</span>
          </Link>
        </div>
      </div>
    </div>
  )
})
