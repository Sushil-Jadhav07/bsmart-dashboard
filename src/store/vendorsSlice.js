import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://api.bebsmart.in'

const extractLogoUrl = (payload) => {
  return (
    payload?.logo_url ||
    payload?.logoUrl ||
    payload?.url ||
    payload?.fileUrl ||
    payload?.logo?.fileUrl ||
    payload?.logo?.url ||
    payload?.data?.logo_url ||
    payload?.data?.logoUrl ||
    payload?.data?.url ||
    payload?.data?.fileUrl ||
    payload?.data?.logo?.fileUrl ||
    payload?.data?.logo?.url ||
    ''
  )
}

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

export const fetchVendorProfiles = createAsyncThunk(
  'vendors/fetchVendorProfiles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profiles`, { headers })
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to load vendor profiles')
      }
      return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const fetchVendorProfileById = createAsyncThunk(
  'vendors/fetchVendorProfileById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      // Use the new endpoint for fetching vendor profile
      const res = await fetch(`${baseUrl}/api/vendors/profile/${id}`, { headers })
      const data = await res.json().catch(() => ({}))
      
      // Handle 404 gracefully - treat as empty profile
      if (res.status === 404) {
        return {}
      }
      
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to load vendor profile')
      }
      return data?.data || data || {}
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const patchVendorProfile = createAsyncThunk(
  'vendors/patchVendorProfile',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profile/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to update vendor profile')
      }
      return { id, data: data?.data || data || {} }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const submitVendorProfile = createAsyncThunk(
  'vendors/submitVendorProfile',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profile/${id}/submit`, {
        method: 'POST',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to submit vendor profile')
      }
      return { id, data: data?.data || data || {} }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const processVendorProfile = createAsyncThunk(
  'vendors/processVendorProfile',
  async ({ id, status, rejection_reason }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profile/${id}/admin-process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status, rejection_reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to process vendor profile')
      }
      return { id, status, data: data?.data || data || {} }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const uploadVendorProfileLogo = createAsyncThunk(
  'vendors/uploadVendorProfileLogo',
  async (file, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`${baseUrl}/api/vendors/profile/me/logo`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to upload logo')
      }

      const logoUrl = extractLogoUrl(data)
      return { logoUrl, data: data?.data || data || {} }
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

export const patchVendorProfileApproval = createAsyncThunk(
  'vendors/patchVendorProfileApproval',
  async ({ id, admin_user_id, validated }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profile/${id}/approval`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ admin_user_id, validated }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to update vendor approval')
      }
      return { id, validated, data: data?.data || data || {} }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

export const updateVendorProfileById = createAsyncThunk(
  'vendors/updateVendorProfileById',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/vendors/profile/me`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload || {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Failed to update vendor profile')
      }
      return { id, data: data?.data || data || {} }
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
    profiles: [],
    profilesByVendorId: {},
    currentProfile: null,
    currentProfileStatus: 'idle',
    currentProfileError: null,
    status: 'idle',
    error: null,
    updating: {},
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
      .addCase(fetchVendorProfiles.fulfilled, (state, action) => {
        state.profiles = action.payload || []
        const byVendorId = {}
        ;(action.payload || []).forEach((p) => {
          const key =
            p?.vendor_id ||
            p?.user_id ||
            p?.vendor?._id ||
            p?.vendor?.id ||
            p?._id ||
            p?.id
          if (key) byVendorId[key] = p
        })
        state.profilesByVendorId = byVendorId
      })
      .addCase(fetchVendorProfileById.pending, (state) => {
        state.currentProfileStatus = 'loading'
        state.currentProfileError = null
      })
      .addCase(fetchVendorProfileById.fulfilled, (state, action) => {
        const p = action.payload || {}
        state.currentProfileStatus = 'succeeded'
        state.currentProfile = p
        const key =
          p?.vendor_id ||
          p?.user_id ||
          p?.vendor?._id ||
          p?.vendor?.id ||
          p?._id ||
          p?.id
        if (key) state.profilesByVendorId[key] = p
      })
      .addCase(fetchVendorProfileById.rejected, (state, action) => {
        state.currentProfileStatus = 'failed'
        state.currentProfileError = action.payload || 'Failed to load vendor profile'
      })
      .addCase(patchVendorProfile.fulfilled, (state, action) => {
        const { id, data } = action.payload
        if (state.currentProfile && (state.currentProfile._id === id || state.currentProfile.id === id)) {
          state.currentProfile = { ...state.currentProfile, ...data }
        }
      })
      .addCase(submitVendorProfile.fulfilled, (state, action) => {
        const { id, data } = action.payload
        if (state.currentProfile && (state.currentProfile._id === id || state.currentProfile.id === id)) {
          state.currentProfile = { ...state.currentProfile, ...data, status: 'submitted' }
        }
      })
      .addCase(processVendorProfile.fulfilled, (state, action) => {
        const { id, status, data } = action.payload
        if (state.currentProfile && (state.currentProfile._id === id || state.currentProfile.id === id)) {
          state.currentProfile = { ...state.currentProfile, ...data, status }
        }
        // Update list item as well
        const idx = state.items.findIndex((v) => v._id === id || v.id === id)
        if (idx !== -1) {
          state.items[idx].validated = status === 'approved'
          state.items[idx].status = status
        }
      })
      .addCase(uploadVendorProfileLogo.fulfilled, (state, action) => {
        const logoUrl = action.payload?.logoUrl || ''
        if (!state.currentProfile) return
        state.currentProfile = {
          ...state.currentProfile,
          ...(action.payload?.data || {}),
          ...(logoUrl ? { logo_url: logoUrl } : {}),
        }
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
      .addCase(patchVendorProfileApproval.pending, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) state.updating[id] = true
      })
      .addCase(patchVendorProfileApproval.fulfilled, (state, action) => {
        const { id, validated, data } = action.payload
        const idx = state.items.findIndex((v) => v._id === id)
        if (idx !== -1) {
          state.items[idx].validated = validated
        }
        if (state.profilesByVendorId[id]) {
          state.profilesByVendorId[id] = { ...state.profilesByVendorId[id], ...data, validated }
        }
        if (
          state.currentProfile &&
          (state.currentProfile.vendor_id === id ||
            state.currentProfile.user_id === id ||
            state.currentProfile._id === id ||
            state.currentProfile.id === id)
        ) {
          state.currentProfile = { ...state.currentProfile, ...data, validated }
        }
        delete state.updating[id]
      })
      .addCase(patchVendorProfileApproval.rejected, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) delete state.updating[id]
        state.error = action.payload || 'Failed to update vendor approval'
      })
      .addCase(updateVendorProfileById.pending, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) state.updating[id] = true
      })
      .addCase(updateVendorProfileById.fulfilled, (state, action) => {
        const { id, data } = action.payload
        const idx = state.items.findIndex((v) => v._id === id)
        if (idx !== -1 && (data?.business_name || data?.company_name)) {
          state.items[idx].business_name = data.business_name || data.company_name
        }
        if (state.profilesByVendorId[id]) {
          state.profilesByVendorId[id] = { ...state.profilesByVendorId[id], ...data }
        }
        if (state.currentProfile) {
          state.currentProfile = { ...state.currentProfile, ...data }
        }
        delete state.updating[id]
      })
      .addCase(updateVendorProfileById.rejected, (state, action) => {
        const { id } = action.meta.arg || {}
        if (id) delete state.updating[id]
        state.error = action.payload || 'Failed to update vendor profile'
      })
      .addCase(deleteVendorById.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload)
      })
  },
})

export const { setVendorValidatedOptimistic } = slice.actions
export default slice.reducer
