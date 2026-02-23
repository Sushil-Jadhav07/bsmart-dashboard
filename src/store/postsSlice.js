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

export const fetchPosts = createAsyncThunk('posts/fetch', async (_, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/posts/feed`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Failed to fetch posts')
    }
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.items || []
    return items
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchPostById = createAsyncThunk('posts/fetchById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/posts/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Failed to fetch post')
    }
    return data?.data || data
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const deletePostById = createAsyncThunk('posts/deleteById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${baseUrl}/api/admin/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete post')
    }
    return id
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

const slice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload || []
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to fetch posts'
      })
      .addCase(fetchPostById.pending, (state) => {
        state.currentStatus = 'loading'
        state.currentError = null
        state.current = null
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded'
        state.current = action.payload || null
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.currentStatus = 'failed'
        state.currentError = action.payload || 'Failed to fetch post'
      })
      .addCase(deletePostById.fulfilled, (state, action) => {
        const id = action.payload
        state.items = state.items.filter((p) => {
          const pid = p.post_id || p._id || p.id || p.uuid || ''
          return pid !== id
        })
      })
  },
})

export default slice.reducer
