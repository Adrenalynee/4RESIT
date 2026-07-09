import ThemeToggle from './components/ThemeToggle'
import LiquidGlassFilters from './components/LiquidGlassFilters'
import PageBackground from './components/PageBackground'

export default function App() {
  return (
    <div className="min-h-screen text-ink">
      <LiquidGlassFilters />
      <ThemeToggle className="fixed right-4 top-4 z-50" />
      <PageBackground>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <h1 className="font-logo text-3xl font-black tracking-widest">SUPMEAL</h1>
        </div>
      </PageBackground>
    </div>
  )
}
