import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const BASE = `${API_BASE_WITH_PATH}/faq/admin`

const authHeaders = (token) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export const fetchFAQs = createAsyncThunk(
  'faq/fetchAll',
  async ({ app_source, category, is_active } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const params = new URLSearchParams()
      if (app_source && app_source !== 'all') params.set('app_source', app_source)
      if (category && category !== 'all') params.set('category', category)
      if (is_active !== undefined && is_active !== 'all') params.set('is_active', is_active)
      const url = `${BASE}${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url, { headers: authHeaders(token) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch FAQs')
      return { items: Array.isArray(data?.data) ? data.data : [], total: data?.total ?? 0 }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const createFAQ = createAsyncThunk(
  'faq/create',
  async (body, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to create FAQ')
      return data?.data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const updateFAQ = createAsyncThunk(
  'faq/update',
  async ({ id, ...body }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to update FAQ')
      return data?.data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const toggleFAQ = createAsyncThunk(
  'faq/toggle',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    try {
      const res = await fetch(`${BASE}/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to toggle FAQ')
      return data?.data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const reorderFAQs = createAsyncThunk(
  'faq/reorder',
  async (faqs, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    try {
      const res = await fetch(`${BASE}/reorder`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ faqs }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to reorder FAQs')
      return faqs
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const deleteFAQ = createAsyncThunk(
  'faq/delete',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to delete FAQ')
      return id
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const faqSlice = createSlice({
  name: 'faq',
  initialState: {
    items: [],
    total: 0,
    status: 'idle',
    error: null,
    mutateStatus: 'idle',
    mutateError: null,
  },
  reducers: {
    clearMutateStatus(state) {
      state.mutateStatus = 'idle'
      state.mutateError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFAQs.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchFAQs.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchFAQs.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload })

      .addCase(createFAQ.pending, (state) => { state.mutateStatus = 'loading'; state.mutateError = null })
      .addCase(createFAQ.fulfilled, (state, action) => {
        state.mutateStatus = 'succeeded'
        if (action.payload) state.items.push(action.payload)
      })
      .addCase(createFAQ.rejected, (state, action) => { state.mutateStatus = 'failed'; state.mutateError = action.payload })

      .addCase(updateFAQ.pending, (state) => { state.mutateStatus = 'loading'; state.mutateError = null })
      .addCase(updateFAQ.fulfilled, (state, action) => {
        state.mutateStatus = 'succeeded'
        if (action.payload) {
          const idx = state.items.findIndex((f) => f._id === action.payload._id)
          if (idx !== -1) state.items[idx] = action.payload
        }
      })
      .addCase(updateFAQ.rejected, (state, action) => { state.mutateStatus = 'failed'; state.mutateError = action.payload })

      .addCase(toggleFAQ.fulfilled, (state, action) => {
        if (action.payload) {
          const idx = state.items.findIndex((f) => f._id === action.payload._id)
          if (idx !== -1) state.items[idx].is_active = action.payload.is_active
        }
      })

      .addCase(reorderFAQs.fulfilled, (state, action) => {
        const orderMap = {}
        action.payload.forEach(({ id, order }) => { orderMap[id] = order })
        state.items.forEach((f) => { if (orderMap[f._id] !== undefined) f.order = orderMap[f._id] })
        state.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      })

      .addCase(deleteFAQ.fulfilled, (state, action) => {
        state.items = state.items.filter((f) => f._id !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })
  },
})

export const { clearMutateStatus } = faqSlice.actions
export default faqSlice.reducer
