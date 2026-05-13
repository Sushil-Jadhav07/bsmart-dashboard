import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const initialState = {
  items: [],
  currentTweet: null,
  status: 'idle',
  error: null,
  deleteStatus: 'idle',
}

export const fetchTweets = createAsyncThunk('tweets/fetchTweets', async (_, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/tweets/feed?page=1&limit=100`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch tweets')
    return Array.isArray(data?.tweets) ? data.tweets : Array.isArray(data?.data) ? data.data : []
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const fetchTweetById = createAsyncThunk('tweets/fetchTweetById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch tweet')
    return data?.data || data?.tweet || data || null
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const deleteTweetById = createAsyncThunk('tweets/deleteTweetById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) return rejectWithValue('No token')
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete tweet')
    }
    return id
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

const slice = createSlice({
  name: 'tweets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTweets.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTweets.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload || []
      })
      .addCase(fetchTweets.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to fetch tweets'
      })
      .addCase(fetchTweetById.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.currentTweet = null
      })
      .addCase(fetchTweetById.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.currentTweet = action.payload || null
      })
      .addCase(fetchTweetById.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to fetch tweet'
      })
      .addCase(deleteTweetById.pending, (state) => {
        state.deleteStatus = 'loading'
      })
      .addCase(deleteTweetById.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded'
        const deletedId = String(action.payload || '')
        state.items = state.items.filter((tweet) => String(tweet?._id || tweet?.id || '') !== deletedId)
        if (state.currentTweet && String(state.currentTweet?._id || state.currentTweet?.id || '') === deletedId) {
          state.currentTweet = null
        }
      })
      .addCase(deleteTweetById.rejected, (state, action) => {
        state.deleteStatus = 'failed'
        state.error = action.payload || 'Failed to delete tweet'
      })
  },
})

export default slice.reducer
