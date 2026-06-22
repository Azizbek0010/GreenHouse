import { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, loadToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const token = loadToken()
      const saved = localStorage.getItem('user')
      if (token && saved) setUser(JSON.parse(saved))
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (phone, password) => {
    const data = await api.post('/api/auth/login', { phone, password })
    setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData) => {
    const updated = { ...user, ...userData }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
