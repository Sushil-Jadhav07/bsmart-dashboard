import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const initialState = {
  payments: [],
  count: 0,
  skip: 0,
  limit: 100,
  hasMore: false,
  status: 'idle',
  error: null,
}

export const fetchRazorpayPayments = createAsyncThunk(
  'razorpay/fetchPayments',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, value)
      })
      const qs = query.toString()
      const res = await fetch(`${API_BASE_WITH_PATH}/razorpay/payments${qs ? `?${qs}` : ''}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch Razorpay payments')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const razorpaySlice = createSlice({
  name: 'razorpay',
  initialState,
  reducers: {
    resetRazorpay: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRazorpayPayments.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchRazorpayPayments.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.payments = action.payload.data || []
        state.count = action.payload.count ?? state.payments.length
        state.skip = action.payload.skip ?? 0
        state.limit = action.payload.limit ?? 100
        state.hasMore = !!action.payload.has_more
      })
      .addCase(fetchRazorpayPayments.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Unknown error' })
  },
})

export const { resetRazorpay } = razorpaySlice.actions
export default razorpaySlice.reducer
