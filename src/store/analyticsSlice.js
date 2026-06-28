import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const initialState = { data: null, status: 'idle', error: null, range: '30d' }

export const fetchAnalytics = createAsyncThunk('analytics/fetch', async (range, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    const selectedRange = range || '30d'
    const res = await fetch(`${API_BASE_WITH_PATH}/reports/summary?range=${encodeURIComponent(selectedRange)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to load analytics')
    return { range: selectedRange, data: data?.data || {} }
  } catch (e) {
    return rejectWithValue(e.message || 'Failed to load analytics')
  }
})

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setRange(s, a) {
      s.range = a.payload
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAnalytics.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
      .addCase(fetchAnalytics.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.data = a.payload.data
        s.range = a.payload.range
      })
      .addCase(fetchAnalytics.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload || 'Failed'
      })
  },
})

export const { setRange } = slice.actions
export default slice.reducer

