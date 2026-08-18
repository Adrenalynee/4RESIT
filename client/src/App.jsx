import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ThemeToggle from './components/ThemeToggle'
import LiquidGlassFilters from './components/LiquidGlassFilters'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import CookbooksPage from './pages/CookbooksPage'
import CookbookDetailPage from './pages/CookbookDetailPage'
import PlanningPage from './pages/PlanningPage'
import SettingsPage from './pages/SettingsPage'

const AUTH_ROUTES = ['/login', '/register', '/oauth/callback']

export default function App() {
  const location = useLocation()
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname)

  return (
    <div className="min-h-screen text-ink">
      <LiquidGlassFilters />
      <ThemeToggle className="fixed right-4 top-4 z-50" />
      <Navbar sticky logoOnly={isAuthRoute} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/recipes"
          element={
            <ProtectedRoute>
              <RecipesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes/:id"
          element={
            <ProtectedRoute>
              <RecipeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cookbooks"
          element={
            <ProtectedRoute>
              <CookbooksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cookbooks/:cookbookId"
          element={
            <ProtectedRoute>
              <CookbookDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cookbooks/:cookbookId/recipes/:id"
          element={
            <ProtectedRoute>
              <RecipeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planning"
          element={
            <ProtectedRoute>
              <PlanningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
