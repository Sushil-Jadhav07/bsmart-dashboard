import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://api.bebsmart.in'

// GET /api/sales/officers — all users with role 'sales' (admin)
export const fetchSalesOfficers = createAsyncThunk(
  'sales/fetchOfficers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/sales/officers`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to load sales officers')
      return data?.sales_officers || []
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// GET /api/sales/users/{id}
// Returns sales profile merged with user info: _id, email, username, full_name, avatar_url, phone, location
export const fetchSalesOfficerById = createAsyncThunk(
  'sales/fetchOfficerById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/sales/users/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) return null
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to load officer')
      // data now contains both sales profile fields AND user fields (email, username etc.)
      return { ...data, _id: data.user_id || data._id, id }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// GET /api/sales/officers/{sales_user_id}/vendors — vendors assigned to an officer (admin)
export const fetchVendorsByOfficer = createAsyncThunk(
  'sales/fetchVendorsByOfficer',
  async (salesUserId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/sales/officers/${salesUserId}/vendors`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to load vendors')
      return { salesUserId, vendors: data?.vendors || [], total: data?.total_vendors || 0 }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// POST /api/auth/register with role:'sales' — create a new sales officer (admin)
export const createSalesOfficer = createAsyncThunk(
  'sales/createOfficer',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...payload, role: 'sales' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to create sales officer')
      return data?.user || data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// POST /api/sales/assign — assign a sales officer to a vendor (admin)
export const assignSalesOfficer = createAsyncThunk(
  'sales/assignOfficer',
  async ({ vendor_user_id, sales_user_id }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/sales/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ vendor_user_id, sales_user_id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to assign sales officer')
      return { vendor_user_id, sales_user_id, vendor: data?.vendor }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// DELETE /api/sales/assign/{vendor_user_id} — remove assignment (admin)
export const unassignSalesOfficer = createAsyncThunk(
  'sales/unassignOfficer',
  async (vendor_user_id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const res = await fetch(`${baseUrl}/api/sales/assign/${vendor_user_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to unassign')
      return { vendor_user_id }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const salesSlice = createSlice({
  name: 'sales',
  initialState: {
    officers: [],
    officersStatus: 'idle',
    officersError: null,
    officerById: {},        // user_id string → merged officer+user object
    officerByIdStatus: {}, // user_id string → 'loading'|'succeeded'|'failed'
    vendorsByOfficer: {},
    vendorsByOfficerStatus: {},
    assignStatus: 'idle',
    assignError: null,
    createStatus: 'idle',
    createError: null,
  },
  reducers: {
    clearAssignError(state) { state.assignError = null },
    clearCreateError(state) { state.createError = null },
    resetAssignStatus(state) { state.assignStatus = 'idle' },
  },
  extraReducers: (builder) => {
    builder
      // fetchSalesOfficers
      .addCase(fetchSalesOfficers.pending, (state) => {
        state.officersStatus = 'loading'
        state.officersError = null
      })
      .addCase(fetchSalesOfficers.fulfilled, (state, action) => {
        state.officersStatus = 'succeeded'
        state.officers = action.payload
        // Also populate officerById cache from the list
        action.payload.forEach((o) => {
          const key = String(o._id || o.id)
          if (key) state.officerById[key] = o
        })
      })
      .addCase(fetchSalesOfficers.rejected, (state, action) => {
        state.officersStatus = 'failed'
        state.officersError = action.payload
      })

      // fetchSalesOfficerById
      .addCase(fetchSalesOfficerById.pending, (state, action) => {
        state.officerByIdStatus[action.meta.arg] = 'loading'
      })
      .addCase(fetchSalesOfficerById.fulfilled, (state, action) => {
        const id = action.meta.arg
        state.officerByIdStatus[id] = 'succeeded'
        if (action.payload) {
          state.officerById[id] = action.payload
        }
      })
      .addCase(fetchSalesOfficerById.rejected, (state, action) => {
        state.officerByIdStatus[action.meta.arg] = 'failed'
      })

      // fetchVendorsByOfficer
      .addCase(fetchVendorsByOfficer.pending, (state, action) => {
        state.vendorsByOfficerStatus[action.meta.arg] = 'loading'
      })
      .addCase(fetchVendorsByOfficer.fulfilled, (state, action) => {
        const { salesUserId, vendors, total } = action.payload
        state.vendorsByOfficer[salesUserId] = { vendors, total }
        state.vendorsByOfficerStatus[salesUserId] = 'succeeded'
      })
      .addCase(fetchVendorsByOfficer.rejected, (state, action) => {
        state.vendorsByOfficerStatus[action.meta.arg] = 'failed'
      })

      // createSalesOfficer
      .addCase(createSalesOfficer.pending, (state) => {
        state.createStatus = 'loading'
        state.createError = null
      })
      .addCase(createSalesOfficer.fulfilled, (state, action) => {
        state.createStatus = 'succeeded'
        const u = action.payload
        if (u) {
          const officer = {
            _id: u._id || u.id,
            username: u.username,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            avatar_url: u.avatar_url,
            location: u.location,
            createdAt: u.createdAt,
          }
          state.officers.push(officer)
          state.officerById[String(officer._id)] = officer
        }
      })
      .addCase(createSalesOfficer.rejected, (state, action) => {
        state.createStatus = 'failed'
        state.createError = action.payload
      })

      // assignSalesOfficer
      .addCase(assignSalesOfficer.pending, (state) => {
        state.assignStatus = 'loading'
        state.assignError = null
      })
      .addCase(assignSalesOfficer.fulfilled, (state) => {
        state.assignStatus = 'succeeded'
      })
      .addCase(assignSalesOfficer.rejected, (state, action) => {
        state.assignStatus = 'idle'
        state.assignError = action.payload
      })
  },
})

export const { clearAssignError, clearCreateError, resetAssignStatus } = salesSlice.actions
export default salesSlice.reducer