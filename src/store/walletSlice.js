import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://api.bebsmart.in'

const initialState = {
  transactions: [],
  summary: null,
  total: 0,
  status: 'idle',
  error: null,
}

export const fetchAllWallets = createAsyncThunk(
  'wallet/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${baseUrl}/api/wallet`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch wallets')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    resetWallet: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllWallets.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAllWallets.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.transactions = action.payload.transactions || []
        state.summary = action.payload.summary || null
        state.total = action.payload.total || 0
      })
      .addCase(fetchAllWallets.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Unknown error'
      })
  },
})

export const { resetWallet } = walletSlice.actions
export default walletSlice.reducer