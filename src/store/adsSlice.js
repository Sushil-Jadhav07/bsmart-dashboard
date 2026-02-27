import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://bsmart.asynk.store'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  current: null,
  currentStatus: 'idle',
  currentError: null,
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,
}

export const fetchAdCategories = createAsyncThunk('ads/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch(`${baseUrl}/api/ads/categories`, {
      headers: { 'Accept': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Failed to fetch ad categories')
    }
    const categories = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : data?.items || []
    return categories
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchAdsAdmin = createAsyncThunk(
  'ads/fetchAdmin',
  async ({ page = 1, limit = 10, status, category } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) {
      return rejectWithValue('No token')
    }
    try {
      const params = new URLSearchParams()
      if (page) params.set('page', String(page))
      if (limit) params.set('limit', String(limit))
      if (status && status !== 'all') params.set('status', status)
      if (category && category !== 'all') params.set('category', category)

      const res = await fetch(`${baseUrl}/api/ads${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to fetch ads')
      }
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.results)
              ? data.results
              : []
      return items
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchAdById = createAsyncThunk('ads/fetchById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/ads/${id}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Failed to fetch ad')
    }
    return data?.data || data
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const patchAdStatus = createAsyncThunk(
  'ads/patchStatus',
  async ({ id, status, rejection_reason }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) {
      return rejectWithValue('No token')
    }
    try {
      const body = { status }
      if (rejection_reason) body.rejection_reason = rejection_reason

      const res = await fetch(`${baseUrl}/api/admin/ads/${id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to update ad status')
      }
      return { id, status: body.status, updated: data?.data || data }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const deleteAdById = createAsyncThunk('ads/deleteById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/admin/ads/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete ad')
    }
    return id
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchAdComments = createAsyncThunk('ads/fetchComments', async (adId, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/ads/${adId}/comments`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Failed to fetch ad comments')
    }
    const items = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : []
    return { adId, items }
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const deleteAdComment = createAsyncThunk('ads/deleteComment', async (commentId, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/ads/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete comment')
    }
    return commentId
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

const slice = createSlice({
  name: 'ads',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdCategories.pending, (state) => {
        state.categoriesStatus = 'loading'
        state.categoriesError = null
      })
      .addCase(fetchAdCategories.fulfilled, (state, action) => {
        state.categoriesStatus = 'succeeded'
        state.categories = action.payload || []
      })
      .addCase(fetchAdCategories.rejected, (state, action) => {
        state.categoriesStatus = 'failed'
        state.categoriesError = action.payload || 'Failed to fetch ad categories'
      })
      .addCase(fetchAdsAdmin.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAdsAdmin.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload || []
      })
      .addCase(fetchAdsAdmin.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to fetch ads'
      })
      .addCase(fetchAdById.pending, (state) => {
        state.currentStatus = 'loading'
        state.currentError = null
        state.current = null
      })
      .addCase(fetchAdById.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded'
        state.current = action.payload || null
      })
      .addCase(fetchAdById.rejected, (state, action) => {
        state.currentStatus = 'failed'
        state.currentError = action.payload || 'Failed to fetch ad'
      })
      .addCase(patchAdStatus.fulfilled, (state, action) => {
        const { id, status, updated } = action.payload || {}
        if (state.current) {
          const cid = state.current._id || state.current.ad_id || state.current.id
          if (cid === id) {
            state.current = { ...state.current, ...(updated || {}), status }
          }
        }
        state.items = (state.items || []).map((a) => {
          const aid = a._id || a.ad_id || a.id
          if (aid !== id) return a
          return { ...a, ...(updated || {}), status }
        })
      })
      .addCase(deleteAdById.fulfilled, (state, action) => {
        const id = action.payload
        state.items = (state.items || []).filter((a) => {
          const aid = a._id || a.ad_id || a.id
          return aid !== id
        })
        if (state.current) {
          const cid = state.current._id || state.current.ad_id || state.current.id
          if (cid === id) state.current = null
        }
      })
  },
})

export default slice.reducer

