import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ThemeToggle from './components/ThemeToggle'
import LiquidGlassFilters from './components/LiquidGlassFilters'
import PageBackground from './components/PageBackground'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <div className="min-h-screen text-ink">
      <LiquidGlassFilters />
      <ThemeToggle className="fixed right-4 top-4 z-50" />
      <Navbar sticky logoOnly />
      <Routes>
        <Route
          path="/"
          element={
            <PageBackground>
              <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <h1 className="font-logo text-3xl font-black tracking-widest">SUPMEAL</h1>
              </div>
            </PageBackground>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
