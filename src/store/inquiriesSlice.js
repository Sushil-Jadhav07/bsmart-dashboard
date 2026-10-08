import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'
import { assignQuery, updateQueryStatus } from './customerQueriesSlice.js'

const BASE = `${API_BASE_WITH_PATH}/support-queries/admin`

const headers = (token) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export const fetchInquiries = createAsyncThunk(
  'inquiries/fetchAll',
  async ({ page = 1, limit = 20 } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const params = new URLSearchParams({ page, limit })
      const res = await fetch(`${BASE}/website?${params}`, { headers: headers(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch inquiries')
      const items =
        Array.isArray(data?.inquiries) ? data.inquiries :
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

// Every website inquiry (100 per page, up to 20 pages) so stats and tabs cover all of them.
export const fetchAllInquiries = createAsyncThunk(
  'inquiries/fetchEverything',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const items = []
      let total = 0
      for (let page = 1; page <= 20; page += 1) {
        const res = await fetch(`${BASE}/website?page=${page}&limit=100`, { headers: headers(token) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch inquiries')
        items.push(...(Array.isArray(data?.queries) ? data.queries : Array.isArray(data?.inquiries) ? data.inquiries : []))
        total = data?.total || items.length
        if (page >= (data?.total_pages || 1)) break
      }
      return { items, total, page: 1, totalPages: 1 }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// Public website form endpoint; also emails the customer an acknowledgement.
export const logInquiry = createAsyncThunk(
  'inquiries/log',
  async (body, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/support-queries/website`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to log inquiry')
      return data?.query
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchInquiryById = createAsyncThunk(
  'inquiries/fetchById',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${BASE}/website/${id}`, { headers: headers(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch inquiry')
      return data?.query || data?.data || data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const deleteInquiry = createAsyncThunk(
  'inquiries/delete',
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
        return rejectWithValue(data?.message || 'Failed to delete inquiry')
      }
      return id
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const slice = createSlice({
  name: 'inquiries',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    status: 'idle',
    error: null,
    current: null,
    currentStatus: 'idle',
  },
  reducers: {
    clearCurrent(state) { state.current = null; state.currentStatus = 'idle' },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInquiries.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchInquiries.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchInquiries.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch' })
      .addCase(fetchAllInquiries.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchAllInquiries.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.total = action.payload.total
        state.page = 1
        state.totalPages = 1
      })
      .addCase(fetchAllInquiries.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch' })
      .addCase(logInquiry.fulfilled, (state, action) => {
        if (action.payload?._id) { state.items.unshift(action.payload); state.total += 1 }
      })
      // Status and assignment go through the shared support-query admin routes.
      .addCase(updateQueryStatus.fulfilled, (state, action) => {
        const item = state.items.find((i) => (i._id || i.id) === action.payload.id)
        if (item) item.status = action.payload.status
      })
      .addCase(assignQuery.fulfilled, (state, action) => {
        const assigned = action.payload.data?.query
        const item = state.items.find((i) => (i._id || i.id) === action.payload.id)
        if (item && assigned) Object.assign(item, { assigned_to: assigned.assigned_to, assigned_by: assigned.assigned_by, assigned_at: assigned.assigned_at })
      })
      .addCase(fetchInquiryById.pending, (state) => { state.currentStatus = 'loading'; state.current = null })
      .addCase(fetchInquiryById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.current = action.payload })
      .addCase(fetchInquiryById.rejected, (state) => { state.currentStatus = 'failed' })
      .addCase(deleteInquiry.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => (i._id || i.id) !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current && (state.current._id || state.current.id) === action.payload) state.current = null
      })
  },
})

export const { clearCurrent } = slice.actions
export default slice.reducer
