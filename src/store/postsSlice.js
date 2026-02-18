import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://bsmart.asynk.store'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
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
  },
})

export default slice.reducer
