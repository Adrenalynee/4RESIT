import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCurrentUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  async function login(identifier, password) {
    const loggedIn = await api.login(identifier, password)
    setUser(loggedIn)
    return loggedIn
  }

  async function loginWithToken(token) {
    const loggedIn = await api.completeOAuthLogin(token)
    setUser(loggedIn)
    return loggedIn
  }

  async function register(name, email, password) {
    const created = await api.register(name, email, password)
    setUser(created)
    return created
  }

  function logout() {
    api.logout()
    sessionStorage.removeItem('cookbooks-active-id')
    setUser(null)
  }

  function refreshUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
