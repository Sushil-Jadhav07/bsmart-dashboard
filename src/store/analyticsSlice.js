import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { analyticsMock } from '../data/admin/analytics.mock.js'

const initialState = { data: null, status: 'idle', error: null, range: '30d' }

export const fetchAnalytics = createAsyncThunk('analytics/fetch', async (range, { rejectWithValue }) => {
  try {
    return { range, data: analyticsMock }
  } catch {
    return rejectWithValue('Failed to load analytics')
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

