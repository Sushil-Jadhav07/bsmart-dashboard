import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://bsmart.asynk.store'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  current: null,
  currentStatus: 'idle',
  currentError: null,
}

export const fetchUsers = createAsyncThunk('users/fetch', async (_, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch users')
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.items || []
    return items
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchUserById = createAsyncThunk('users/fetchById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${baseUrl}/api/users/${id}`, {
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
    const res = await fetch(`${baseUrl}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete user')
    }
    return id
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

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
        state.items = state.items.filter(item => {
          const u = item.user || item
          const uid = u._id || u.id
          return uid !== action.payload
        })
        if (state.current) {
          const cid = state.current._id || state.current.id
          if (cid === action.payload) state.current = null
        }
      })
  },
})

export default slice.reducer