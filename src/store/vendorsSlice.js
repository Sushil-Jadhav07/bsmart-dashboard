import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://bsmart.asynk.store'

export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors`, { headers })
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to load vendors')
      }
      return Array.isArray(data) ? data : []
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/${id}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to load vendor')
      }
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const patchVendorValidation = createAsyncThunk(
  'vendors/patchVendorValidation',
  async ({ id, admin_user_id, validated }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/${id}/validation`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ admin_user_id, validated }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to update validation')
      }
      return { id, validated }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const deleteVendorById = createAsyncThunk(
  'vendors/deleteById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      if (!token) return rejectWithValue('No token')
      const res = await fetch(`${baseUrl}/api/admin/vendors/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return rejectWithValue(data?.message || 'Failed to delete vendor')
      }
      return id
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const slice = createSlice({
  name: 'vendors',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    updating: {},
    current: null,
    currentStatus: 'idle',
    currentError: null,
  },
  reducers: {
    setVendorValidatedOptimistic(state, action) {
      const { id, validated } = action.payload
      const idx = state.items.findIndex((v) => v._id === id)
      if (idx !== -1) {
        state.items[idx].validated = validated
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to load vendors'
      })
      .addCase(fetchVendorById.pending, (state) => {
        state.currentStatus = 'loading'
        state.currentError = null
        state.current = null
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.currentStatus = 'failed'
        state.currentError = action.payload || 'Failed to load vendor'
      })
      .addCase(patchVendorValidation.pending, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) state.updating[id] = true
      })
      .addCase(patchVendorValidation.fulfilled, (state, action) => {
        const { id, validated } = action.payload
        const idx = state.items.findIndex((v) => v._id === id)
        if (idx !== -1) {
          state.items[idx].validated = validated
        }
        delete state.updating[id]
      })
      .addCase(patchVendorValidation.rejected, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) delete state.updating[id]
        state.error = action.payload || 'Failed to update validation'
      })
      .addCase(deleteVendorById.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload)
      })
  },
})

export const { setVendorValidatedOptimistic } = slice.actions
export default slice.reducer
