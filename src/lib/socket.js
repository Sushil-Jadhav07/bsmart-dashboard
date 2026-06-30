import { io } from 'socket.io-client'
import { API_BASE_URL } from './apiBase.js'

let socket = null

export const getSocket = (token) => {
  if (socket && socket.connected) return socket

  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => console.log('[socket] connected', socket.id))
  socket.on('disconnect', (reason) => console.log('[socket] disconnected', reason))
  socket.on('connect_error', (err) => console.warn('[socket] error', err.message))

  return socket
}

/**
 * Join a room — waits for connection if socket isn't ready yet.
 * Returns a cleanup function that leaves the room and removes listeners.
 */
export const joinSupportRoom = (token, queryId, { onReply, onStatusChange } = {}) => {
  const room = `support_query_${queryId}`
  const sock = getSocket(token)

  const doJoin = () => {
    sock.emit('join-room', room)
    console.log('[socket] joined', room)
  }

  // If already connected, join immediately; otherwise wait for connect
  if (sock.connected) {
    doJoin()
  } else {
    sock.once('connect', doJoin)
  }

  const handleReply = (data) => {
    if (data?.query_id !== queryId && data?.queryId !== queryId) return
    onReply?.(data?.reply)
  }

  const handleStatus = (data) => {
    if (data?.query_id !== queryId && data?.queryId !== queryId) return
    onStatusChange?.(data?.status)
  }

  if (onReply) sock.on('support_reply', handleReply)
  if (onStatusChange) sock.on('support_status_changed', handleStatus)

  // Return cleanup
  return () => {
    sock.emit('leave-room', room)
    sock.off('connect', doJoin)
    sock.off('support_reply', handleReply)
    sock.off('support_status_changed', handleStatus)
    console.log('[socket] left', room)
  }
}

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}
