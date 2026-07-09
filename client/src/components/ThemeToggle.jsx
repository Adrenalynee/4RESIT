import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = 'relative' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      className={`inline-flex h-8 w-14 shrink-0 items-center overflow-hidden rounded-full border border-white/25 bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-6px_10px_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-200 backdrop-contrast-110 transition-colors duration-300 hover:bg-white/15 ${className}`}
    >
      <span className="pointer-events-none absolute -left-3 -top-4 h-10 w-10 rounded-full bg-white/50 blur-md" />
      <span className="pointer-events-none absolute -bottom-4 -right-3 h-10 w-10 rounded-full bg-black/20 blur-md" />
      <span className="pointer-events-none absolute inset-x-1 top-px h-px bg-white/60" />

      <span
        className={`relative z-10 h-6 w-6 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark ? 'translate-x-6 bg-white' : 'translate-x-1 bg-black'
        }`}
      />
    </button>
  )
}
