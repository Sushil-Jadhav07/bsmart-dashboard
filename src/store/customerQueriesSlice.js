import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const BASE = `${API_BASE_WITH_PATH}/support-queries/admin`

const headers = (token) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export const fetchCustomerQueries = createAsyncThunk(
  'customerQueries/fetchAll',
  async ({ page = 1, limit = 20, status, app_source, category, assigned_to } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const params = new URLSearchParams({ page, limit })
      if (status && status !== 'all') params.set('status', status)
      if (app_source && app_source !== 'all') params.set('app_source', app_source)
      if (category && category !== 'all') params.set('category', category)
      if (assigned_to && assigned_to !== 'all') params.set('assigned_to', assigned_to)
      const res = await fetch(`${BASE}?${params}`, { headers: headers(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch queries')
      const items =
        Array.isArray(data?.queries) ? data.queries :
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data) ? data : []
      return {
        items,
        total: data?.total || 0,
        page: data?.page || page,
        totalPages: data?.total_pages || 1,
      }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchQueryById = createAsyncThunk(
  'customerQueries/fetchById',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/${id}`, { headers: headers(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch query')
      return data?.query || data?.data || data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const replyToQuery = createAsyncThunk(
  'customerQueries/reply',
  async ({ id, message }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/${id}/reply`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to send reply')
      return data?.data || data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const updateQueryStatus = createAsyncThunk(
  'customerQueries/updateStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to update status')
      return { id, status, data: data?.data || data }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const assignQuery = createAsyncThunk(
  'customerQueries/assign',
  async ({ id, assigned_to }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/${id}/assign`, {
        method: 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ assigned_to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to assign query')
      return { id, data: data?.data || data }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const deleteCustomerQuery = createAsyncThunk(
  'customerQueries/delete',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: headers(token),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return rejectWithValue(data?.message || 'Failed to delete query')
      }
      return id
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const slice = createSlice({
  name: 'customerQueries',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    status: 'idle',
    error: null,
    current: null,
    currentStatus: 'idle',
    replyStatus: 'idle',
    replyError: null,
    assignStatus: 'idle',
  },
  reducers: {
    clearCurrent(state) { state.current = null; state.currentStatus = 'idle'; state.replyStatus = 'idle'; state.replyError = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerQueries.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchCustomerQueries.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchCustomerQueries.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch' })

      .addCase(fetchQueryById.pending, (state) => { state.currentStatus = 'loading'; state.current = null })
      .addCase(fetchQueryById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.current = action.payload })
      .addCase(fetchQueryById.rejected, (state) => { state.currentStatus = 'failed' })

      .addCase(replyToQuery.pending, (state) => { state.replyStatus = 'loading'; state.replyError = null })
      .addCase(replyToQuery.fulfilled, (state, action) => {
        state.replyStatus = 'succeeded'
        // Only overwrite current if the payload is a proper query object (has _id/replies)
        const p = action.payload
        if (p && (p._id || p.id) && Array.isArray(p.replies)) state.current = p
      })
      .addCase(replyToQuery.rejected, (state, action) => { state.replyStatus = 'failed'; state.replyError = action.payload || 'Failed to send reply' })

      .addCase(updateQueryStatus.fulfilled, (state, action) => {
        const { id, status, data } = action.payload
        const item = state.items.find((i) => (i._id || i.id) === id)
        if (item) item.status = status
        if (state.current && (state.current._id || state.current.id) === id) {
          state.current = { ...state.current, ...data, status }
        }
      })

      .addCase(assignQuery.pending, (state) => { state.assignStatus = 'loading' })
      .addCase(assignQuery.fulfilled, (state, action) => {
        state.assignStatus = 'succeeded'
        const { id, data } = action.payload
        if (state.current && (state.current._id || state.current.id) === id) {
          state.current = { ...state.current, ...data }
        }
      })
      .addCase(assignQuery.rejected, (state) => { state.assignStatus = 'failed' })

      .addCase(deleteCustomerQuery.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => (i._id || i.id) !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current && (state.current._id || state.current.id) === action.payload) state.current = null
      })
  },
})

export const { clearCurrent } = slice.actions
export default slice.reducer
