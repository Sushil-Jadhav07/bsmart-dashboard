import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

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
    const res = await fetch(`${API_BASE_WITH_PATH}/posts/feed`, {
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
    const normalized = items.filter((item) => {
      const itemType = String(item?.item_type || '').toLowerCase()
      if (itemType === 'post' || itemType === 'reel') return true
      // Legacy compatibility: keep only payloads that explicitly carry post_id.
      return !!item?.post_id
    })
    return normalized
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
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const res = await fetch(`${API_BASE_WITH_PATH}/posts/${id}`, {
      headers,
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      return data?.data || data
    }

    // Some rows are reels; their dedicated endpoint is /posts/reels/:id.
    if (res.status === 404) {
      const reelRes = await fetch(`${API_BASE_WITH_PATH}/posts/reels/${id}`, {
        headers,
      })
      const reelData = await reelRes.json().catch(() => ({}))
      if (reelRes.ok) {
        return reelData?.data || reelData
      }
      return rejectWithValue(reelData?.message || 'Failed to fetch post')
    }

    return rejectWithValue(data?.message || 'Failed to fetch post')
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
    const res = await fetch(`${API_BASE_WITH_PATH}/admin/posts/${id}`, {
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

export const deleteCommentById = createAsyncThunk('posts/deleteCommentById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/admin/comments/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete comment')
    }
    return id
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const deleteReplyById = createAsyncThunk('posts/deleteReplyById', async (id, { getState, rejectWithValue }) => {
  const token = getState().auth.token
  if (!token) {
    return rejectWithValue('No token')
  }
  try {
    const res = await fetch(`${API_BASE_WITH_PATH}/admin/replies/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return rejectWithValue(data?.message || 'Failed to delete reply')
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
      .addCase(deleteCommentById.fulfilled, (state, action) => {
        if (state.current && state.current.comments) {
          state.current.comments = state.current.comments.filter((c) => {
            const cid = c.comment_id || c._id || c.id
            return cid !== action.payload
          })
        }
      })
      .addCase(deleteReplyById.fulfilled, (state, action) => {
        if (state.current && state.current.comments) {
          state.current.comments = state.current.comments.map((c) => {
            if (c.replies && Array.isArray(c.replies)) {
              return {
                ...c,
                replies: c.replies.filter((r) => {
                  const rid = r.reply_id || r._id || r.id
                  return rid !== action.payload
                }),
              }
            }
            return c
          })
        }
      })
  },
})

export default slice.reducer
