import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth_user')
      if (saved) {
        setUser(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const login = (email) => {
    const nextUser = { email }
    setUser(nextUser)
    try {
      localStorage.setItem('auth_user', JSON.stringify(nextUser))
    } catch {}
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem('auth_user')
    } catch {}
  }

  const isAuthenticated = useMemo(() => !!user, [user])

  const value = useMemo(
    () => ({ user, isAuthenticated, login, logout }),
    [user, isAuthenticated]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export { AuthProvider, useAuth }
