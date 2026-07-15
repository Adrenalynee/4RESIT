import { Link } from 'react-router-dom'
import cookingIconUrl from '../assets/cooking.svg'

export default function RecipeCard({ recipe, to, rank }) {
  return (
    <Link
      to={to ?? `/recipes/${recipe.id}`}
      className="liquid-glass group relative flex h-full flex-col overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-[transform,box-shadow] hover:-translate-y-1 hover:scale-105 hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
    >
      {rank && (
        <div className="absolute left-2 top-2 z-10 h-7 w-7">
          <span className="gold-glass liquid-glass flex h-full w-full items-center justify-center rounded-full">
            <span className="relative text-xs font-bold text-stone-900">#{rank}</span>
          </span>
        </div>
      )}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100/20">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="relative h-full w-full object-cover"
          />
        ) : (
          <div className="liquid-glass liquid-glass-opaque-soft flex h-full w-full items-center justify-center">
            <div
              role="presentation"
              aria-hidden="true"
              className="icon-shimmer relative h-12 w-12"
              style={{ WebkitMaskImage: `url(${cookingIconUrl})`, maskImage: `url(${cookingIconUrl})` }}
            />
          </div>
        )}
        {recipe.favorite && (
          <div className="absolute right-2 top-2">
            <span className="liquid-glass gold-glass relative rounded-full px-2 py-1 text-xs">
              <span className="relative text-stone-900 dark:text-white">Favori</span>
            </span>
          </div>
        )}
      </div>
      <div className="relative flex-1 bg-(--recipe-card-bg-light) p-3 dark:bg-(--recipe-card-bg-dark)">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100">{recipe.title}</h3>
        <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
          {recipe.prepTime + recipe.cookTime} min · {recipe.servings} portions
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {recipe.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="liquid-glass gold-glass gold-glass-light relative rounded-full px-2 py-0.5 text-xs">
              <span className="relative text-stone-900 dark:text-stone-100">{tag}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
