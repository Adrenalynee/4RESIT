export default function ErrorState({ message, onRetry }) {
  return (
    <div className="liquid-glass liquid-glass-opaque-soft mx-auto mt-8 max-w-md rounded-xl p-6 text-center">
      <p className="relative text-sm text-stone-800 dark:text-stone-100">
        {message || "Une erreur est survenue lors du chargement."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="liquid-glass gold-glass relative mt-3 rounded-full px-4 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-95 active:scale-100 dark:text-white"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
