import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://api.bebsmart.in'

const initialState = {
  transactions: [],
  summary: null,
  total: 0,
  status: 'idle',
  error: null,

  memberHistory: [],
  memberWallet: null,
  memberStatus: 'idle',
  memberError: null,

  vendorHistory: [],
  vendorWallet: null,
  vendorStatus: 'idle',
  vendorError: null,

  adHistory: [],
  adWallet: null,
  adStatus: 'idle',
  adError: null,
}

export const fetchAllWallets = createAsyncThunk(
  'wallet/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${baseUrl}/api/wallet`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch wallets')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchMemberWalletHistory = createAsyncThunk(
  'wallet/fetchMemberHistory',
  async (userId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${baseUrl}/api/wallet/member/${userId}/history`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch member wallet history')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchVendorWalletHistory = createAsyncThunk(
  'wallet/fetchVendorHistory',
  async (userId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${baseUrl}/api/wallet/vendor/${userId}/history`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch vendor wallet history')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchAdWalletHistory = createAsyncThunk(
  'wallet/fetchAdHistory',
  async (adId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${baseUrl}/api/wallet/ads/${adId}/history`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch ad wallet history')
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
    resetMemberHistory: (state) => {
      state.memberHistory = []; state.memberWallet = null; state.memberStatus = 'idle'; state.memberError = null
    },
    resetVendorHistory: (state) => {
      state.vendorHistory = []; state.vendorWallet = null; state.vendorStatus = 'idle'; state.vendorError = null
    },
    resetAdHistory: (state) => {
      state.adHistory = []; state.adWallet = null; state.adStatus = 'idle'; state.adError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllWallets.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(fetchAllWallets.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.transactions = action.payload.transactions || action.payload.data?.transactions || []
        state.summary = action.payload.summary || action.payload.data?.summary || null
        state.total = action.payload.total || action.payload.data?.total || 0
      })
      .addCase(fetchAllWallets.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Unknown error' })

      .addCase(fetchMemberWalletHistory.pending, (state) => { state.memberStatus = 'loading'; state.memberError = null })
      .addCase(fetchMemberWalletHistory.fulfilled, (state, action) => {
        state.memberStatus = 'succeeded'
        const payload = action.payload?.data || action.payload
        state.memberHistory = payload?.transactions || payload?.history || []
        state.memberWallet = payload?.wallet || null
      })
      .addCase(fetchMemberWalletHistory.rejected, (state, action) => { state.memberStatus = 'failed'; state.memberError = action.payload || 'Unknown error' })

      .addCase(fetchVendorWalletHistory.pending, (state) => { state.vendorStatus = 'loading'; state.vendorError = null })
      .addCase(fetchVendorWalletHistory.fulfilled, (state, action) => {
        state.vendorStatus = 'succeeded'
        const payload = action.payload?.data || action.payload
        state.vendorHistory = payload?.transactions || payload?.history || []
        state.vendorWallet = payload?.wallet || null
      })
      .addCase(fetchVendorWalletHistory.rejected, (state, action) => { state.vendorStatus = 'failed'; state.vendorError = action.payload || 'Unknown error' })

      .addCase(fetchAdWalletHistory.pending, (state) => { state.adStatus = 'loading'; state.adError = null })
      .addCase(fetchAdWalletHistory.fulfilled, (state, action) => {
        state.adStatus = 'succeeded'
        const payload = action.payload?.data || action.payload
        state.adHistory = payload?.transactions || payload?.history || []
        state.adWallet = payload?.wallet || null
      })
      .addCase(fetchAdWalletHistory.rejected, (state, action) => { state.adStatus = 'failed'; state.adError = action.payload || 'Unknown error' })
  },
})

export const { resetWallet, resetMemberHistory, resetVendorHistory, resetAdHistory } = walletSlice.actions
export default walletSlice.reducer