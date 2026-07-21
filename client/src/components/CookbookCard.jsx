import { Link } from 'react-router-dom'

export default function CookbookCard({ cookbook, to, onOpen }) {
  return (
    <Link
      to={to ?? `/cookbooks/${cookbook.id}`}
      onClick={() => onOpen?.(cookbook.id)}
      className="liquid-glass group relative flex h-full flex-col overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-[transform,box-shadow] hover:-translate-y-1 hover:scale-105 hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
    >
      <div className="relative flex h-full flex-col justify-between bg-(--recipe-card-bg-light) p-4 dark:bg-(--recipe-card-bg-dark)">
        <div>
          <h3 className="font-logo text-xl font-bold text-accent-dark">{cookbook.name}</h3>
          <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{cookbook.description}</p>
        </div>
        <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">
          {cookbook.members.length} membre(s) · {cookbook.recipeIds.length} recette(s)
        </p>
      </div>
    </Link>
  )
}
