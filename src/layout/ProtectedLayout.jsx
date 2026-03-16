import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedLayout({ children }) {
  const token = useSelector((s) => s.auth.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedLayout
