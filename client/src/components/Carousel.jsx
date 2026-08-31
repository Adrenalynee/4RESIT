import { useEffect, useState } from 'react'

const MAX_VISIBILITY = 3

export default function Carousel({
  items,
  getKey,
  renderItem,
  activeId,
  onActiveChange,
  emptyMessage,
  prevLabel = 'Précédent',
  nextLabel = 'Suivant',
}) {
  const [active, setActive] = useState(0)
  const [hasSynced, setHasSynced] = useState(false)

  useEffect(() => {
    if (hasSynced || items.length === 0) return
    const index = items.findIndex((item) => getKey(item) === activeId)
    if (index >= 0) setActive(index)
    setHasSynced(true)
  }, [items, activeId, hasSynced, getKey])

  function goTo(index) {
    setActive(index)
    onActiveChange?.(getKey(items[index]))
  }

  if (items.length === 0) {
    return <p className="text-white/80">{emptyMessage}</p>
  }

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden">
      <div className="recipe-carousel mx-auto h-96 w-72 sm:h-112 sm:w-88">
        {items.map((item, i) => (
          <div
            key={getKey(item)}
            className="recipe-carousel-card"
            style={{
              '--active': i === active ? 1 : 0,
              '--offset': (active - i) / 3,
              '--direction': Math.sign(active - i),
              '--abs-offset': Math.abs(active - i) / 3,
              pointerEvents: active === i ? 'auto' : 'none',
              opacity: Math.abs(active - i) >= MAX_VISIBILITY ? 0 : 1,
              display: Math.abs(active - i) > MAX_VISIBILITY ? 'none' : 'block',
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>

      {active > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label={prevLabel}
            className="liquid-glass gold-glass relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
          >
            <span className="relative">‹</span>
          </button>
        </div>
      )}

      {active < items.length - 1 && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label={nextLabel}
            className="liquid-glass gold-glass relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
          >
            <span className="relative">›</span>
          </button>
        </div>
      )}
    </div>
  )
}
