import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { io } from 'socket.io-client'

const BASE_URL = 'https://api.bebsmart.in'

const getToken = () => {
  try {
    return JSON.parse(localStorage.getItem('auth_state'))?.token || null
  } catch {
    return null
  }
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
})

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { headers: authHeaders() })
      const data = await res.json().catch(() => [])
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch')
      return data
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/unread-count`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({ count: 0 }))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed')
      return data.count
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: authHeaders()
      })
      if (!res.ok) return rejectWithValue('Failed')
      return true
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const markOneRead = createAsyncThunk(
  'notifications/markOneRead',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: authHeaders()
      })
      if (!res.ok) return rejectWithValue('Failed')
      return id
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const deleteNotification = createAsyncThunk(
  'notifications/deleteOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!res.ok) return rejectWithValue('Failed')
      return id
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

// ─── Slice ─────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    status: 'idle',
    error: null
  },
  reducers: {
    // Called when a real-time socket notification arrives
    addRealtimeNotification(state, action) {
      state.items.unshift(action.payload)
      state.unreadCount += 1
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload
        state.unreadCount = action.payload.filter(n => !n.isRead).length
        state.status = 'succeeded'
      })
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.items = state.items.map(n => ({ ...n, isRead: true }))
        state.unreadCount = 0
      })
      .addCase(markOneRead.fulfilled, (state, action) => {
        const notif = state.items.find(n => n._id === action.payload)
        if (notif && !notif.isRead) {
          notif.isRead = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const target = state.items.find(n => n._id === action.payload)
        if (target && !target.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.items = state.items.filter(n => n._id !== action.payload)
      })
  }
})

export const { addRealtimeNotification } = notificationsSlice.actions
export default notificationsSlice.reducer

// ─── Socket singleton ──────────────────────────────────────────────────────

let _socket = null

export const connectSocket = (userId, dispatch) => {
  if (_socket) return _socket

  _socket = io('https://api.bebsmart.in', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
  })

  _socket.on('connect', () => {
    console.log('[Socket] connected:', _socket.id)
    _socket.emit('register', userId)
  })

  _socket.on('new_notification', (notif) => {
    dispatch(addRealtimeNotification(notif))
  })

  _socket.on('disconnect', () => {
    console.log('[Socket] disconnected')
  })

  return _socket
}

export const disconnectSocket = () => {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}
