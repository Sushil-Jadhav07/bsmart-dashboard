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

const normalizeNotificationType = (type) => {
  const key = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases = {
    reply: 'comment_reply',
    new_reply: 'comment_reply',
    like_notification: 'like',
    comment_notification: 'comment',
    reply_notification: 'comment_reply',
  }
  return aliases[key] || key || 'admin'
}

const resolveNotificationObject = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  return payload?.notification || payload?.data?.notification || payload?.data || payload
}

const resolveNotificationMessage = (obj) => {
  if (!obj || typeof obj !== 'object') return ''
  const msg =
    obj.message ||
    obj.text ||
    obj.body ||
    obj.title ||
    obj.notification_message ||
    obj.notification_text ||
    ''
  if (typeof msg === 'string') return msg
  return ''
}

const normalizeNotificationPayload = (payload, fallbackType) => {
  const obj = resolveNotificationObject(payload)
  if (!obj || typeof obj !== 'object') return null
  const message = resolveNotificationMessage(obj)
  return {
    ...obj,
    message,
    _id: obj._id || obj.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: normalizeNotificationType(obj.type || fallbackType),
    isRead: obj.isRead ?? obj.read ?? false,
    createdAt: obj.createdAt || obj.updatedAt || obj.timestamp || new Date().toISOString(),
  }
}

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch')
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : []
      return (items || [])
        .map((n) => normalizeNotificationPayload(n, n?.type))
        .filter(Boolean)
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
      const incoming = action.payload
      if (!incoming?._id) return
      const existing = state.items.find((n) => n._id === incoming._id)
      if (existing) {
        Object.assign(existing, incoming)
        return
      }
      state.items.unshift(incoming)
      if (!incoming.isRead) {
        state.unreadCount += 1
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = Array.isArray(action.payload) ? action.payload : []
        state.unreadCount = state.items.filter(n => !n.isRead).length
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

  const token = getToken()
  _socket = io('https://api.bebsmart.in', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    withCredentials: true,
    auth: token ? { token } : undefined,
    query: token ? { token } : undefined,
  })

  _socket.on('connect', () => {
    console.log('[Socket] connected:', _socket.id)
    _socket.emit('register', userId)
  })

  const socketEvents = [
    'new_notification',
    'notification',
    'newNotification',
    'receive_notification',
    'like',
    'comment',
    'reply',
    'comment_reply',
  ]

  const handleSocketNotification = (fallbackType) => (payload) => {
    const normalized = normalizeNotificationPayload(payload, fallbackType)
    if (normalized?.message) {
      dispatch(addRealtimeNotification(normalized))
      return
    }
    dispatch(fetchNotifications())
    dispatch(fetchUnreadCount())
  }

  socketEvents.forEach((eventName) => {
    _socket.on(eventName, handleSocketNotification(eventName))
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
