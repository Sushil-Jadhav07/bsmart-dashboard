import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '../store/authSlice.js'
import { disconnectSocket } from '../store/notificationsSlice.js'

function Logout() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    disconnectSocket()
    dispatch(logout())
    navigate('/login', { replace: true })
  }, [dispatch, navigate])

  return null
}

export default Logout
