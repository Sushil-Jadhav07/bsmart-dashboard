import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { startPage } from '../utils/consolePrefs.js'

function PublicOnlyLayout({ children }) {
  const token = useSelector((s) => s.auth.token)
  if (token) {
    return <Navigate to={startPage()} replace />
  }
  return children
}

export default PublicOnlyLayout
