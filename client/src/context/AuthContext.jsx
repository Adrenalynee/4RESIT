import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../api/mockApi'

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

  async function login(email, password) {
    const loggedIn = await api.login(email, password)
    setUser(loggedIn)
    return loggedIn
  }

  async function loginWithOAuth(provider) {
    const loggedIn = await api.loginWithOAuth(provider)
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
    <AuthContext.Provider value={{ user, loading, login, loginWithOAuth, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
