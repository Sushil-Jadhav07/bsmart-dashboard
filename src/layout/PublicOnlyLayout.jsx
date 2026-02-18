import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function PublicOnlyLayout({ children }) {
  const token = useSelector((s) => s.auth.token)
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default PublicOnlyLayout
