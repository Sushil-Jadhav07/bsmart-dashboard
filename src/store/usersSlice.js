import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  current: null,
  currentStatus: 'idle',
  currentError: null,
  updateStatus: 'idle',
  updateError: null,
}

export const fetchUsers = createAsyncThunk('users/fetch', async (_, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/admin/users`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch users')
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.users || data?.items || []
    return items
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchUserById = createAsyncThunk('users/fetchById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/users/${id}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch user')
    return data?.data || data
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const deleteUserById = createAsyncThunk('users/deleteById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }

    const tryDelete = async (url) => {
      const res = await fetch(url, { method: 'DELETE', headers })
      if (res.ok) return { ok: true }
      const data = await res.json().catch(() => ({}))
      return { ok: false, status: res.status, message: data?.message }
    }

    const adminAttempt = await tryDelete(`${API_BASE_WITH_PATH}/admin/users/${id}`)
    if (adminAttempt.ok) return id

    const userAttempt = await tryDelete(`${API_BASE_WITH_PATH}/users/${id}`)
    if (userAttempt.ok) return id

    const adminMsg = adminAttempt.message || `HTTP ${adminAttempt.status || 'error'}`
    const userMsg = userAttempt.message || `HTTP ${userAttempt.status || 'error'}`
    return rejectWithValue(`Admin delete failed: ${adminMsg}. User delete failed: ${userMsg}.`)
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const toggleUserActive = createAsyncThunk('users/toggleActive', async ({ id, is_active }, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to update user status')
    return { id, is_active, data: data?.data || data?.user || data || {} }
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const updateUserById = createAsyncThunk('users/updateById', async (input, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const { id, payload, ...fields } = input || {}
    if (!id) return rejectWithValue('User id is required')
    const body = payload || fields
    const res = await fetch(`${API_BASE_WITH_PATH}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body || {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to update user')
    return { id, data: data?.data || data?.user || data || {} }
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

const userIdOf = (value) => {
  const user = value?.user || value || {}
  return String(user?._id || user?.id || user?.user_id || user?.uuid || '')
}

const mergeUserIntoEntry = (entry, patch) => {
  if (entry?.user) return { ...entry, user: { ...entry.user, ...patch } }
  return { ...entry, ...patch }
}

const slice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload || [] })
      .addCase(fetchUsers.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch users' })
      .addCase(fetchUserById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; state.current = null })
      .addCase(fetchUserById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.current = action.payload || null })
      .addCase(fetchUserById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload || 'Failed to fetch user' })
      .addCase(deleteUserById.fulfilled, (state, action) => {
        const deletedId = String(action.payload || '')
        state.items = state.items.filter(item => {
          const u = item.user || item
          const uid = String(u?._id || u?.id || u?.user_id || u?.uuid || '')
          return uid !== deletedId
        })
        if (state.current) {
          const cid = String(state.current._id || state.current.id || state.current.user_id || state.current.uuid || '')
          if (cid === deletedId) state.current = null
        }
      })
      .addCase(toggleUserActive.pending, (state, action) => {
        state.updateStatus = 'loading'
        state.updateError = null
        const { id, is_active } = action.meta.arg || {}
        state.items = state.items.map((item) => userIdOf(item) === String(id) ? mergeUserIntoEntry(item, { is_active }) : item)
        if (state.current && userIdOf(state.current) === String(id)) state.current = { ...state.current, is_active }
        if (state.currentUser && userIdOf(state.currentUser) === String(id)) state.currentUser = { ...state.currentUser, is_active }
      })
      .addCase(toggleUserActive.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded'
        const { id, is_active, data } = action.payload || {}
        const patch = { ...(data || {}), is_active }
        state.items = state.items.map((item) => userIdOf(item) === String(id) ? mergeUserIntoEntry(item, patch) : item)
        if (state.current && userIdOf(state.current) === String(id)) state.current = { ...state.current, ...patch }
        if (state.currentUser && userIdOf(state.currentUser) === String(id)) state.currentUser = { ...state.currentUser, ...patch }
      })
      .addCase(toggleUserActive.rejected, (state, action) => {
        state.updateStatus = 'failed'
        state.updateError = action.payload || 'Failed to update user status'
      })
      .addCase(updateUserById.pending, (state) => {
        state.updateStatus = 'loading'
        state.updateError = null
      })
      .addCase(updateUserById.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded'
        const { id, data } = action.payload || {}
        state.items = state.items.map((item) => userIdOf(item) === String(id) ? mergeUserIntoEntry(item, data || {}) : item)
        if (state.current && userIdOf(state.current) === String(id)) state.current = { ...state.current, ...(data || {}) }
        if (state.currentUser && userIdOf(state.currentUser) === String(id)) state.currentUser = { ...state.currentUser, ...(data || {}) }
      })
      .addCase(updateUserById.rejected, (state, action) => {
        state.updateStatus = 'failed'
        state.updateError = action.payload || 'Failed to update user'
      })
  },
})

export default slice.reducer
