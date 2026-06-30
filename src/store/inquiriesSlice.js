import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

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
