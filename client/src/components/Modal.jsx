import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ children, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="liquid-glass relative w-full max-w-lg overflow-hidden rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4 z-10 h-8 w-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="liquid-glass relative flex h-full w-full items-center justify-center rounded-full text-stone-800 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
          >
            <span className="relative">✕</span>
          </button>
        </div>
        <div className="relative bg-white/85 p-6 dark:bg-black/50 sm:p-8">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
