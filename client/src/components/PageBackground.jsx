import { useTheme } from '../context/ThemeContext'
import greymarble from '../assets/greymarble.jpg'
import blackmarble from '../assets/blackmarble.jpg'

export default function PageBackground({ children, className = '' }) {
  const { theme } = useTheme()
  const backgroundImage = theme === 'dark' ? blackmarble : greymarble

  return (
    <>
      <div
        className="moving-marble fixed inset-0 -z-10 bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-stone-900/30" />
      </div>
      <div className={`relative min-h-[calc(100vh-4rem)] ${className}`}>{children}</div>
    </>
  )
}
