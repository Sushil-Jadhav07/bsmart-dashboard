import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const baseUrl = 'https://bsmart.asynk.store'

const persisted = (() => {
  try {
    const raw = localStorage.getItem('auth_state')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

const initialState = {
  user: persisted?.user || null,
  token: persisted?.token || null,
  status: 'idle',
  error: null,
  adminCreateStatus: 'idle',
  adminCreateError: null,
}

function persist(state) {
  try {
    localStorage.setItem('auth_state', JSON.stringify({ user: state.user, token: state.token }))
  } catch {}
}

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Login failed')
    }
    const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || null
    const user = data?.user || data?.data?.user || { email }
    return { token, user }
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const register = createAsyncThunk('auth/register', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(data?.message || 'Register failed')
    }
    const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || null
    const user = data?.user || data?.data?.user || { name, email }
    return { token, user }
  } catch (e) {
    return rejectWithValue(e.message || 'Network error')
  }
})

export const registerAdmin = createAsyncThunk(
  'auth/registerAdmin',
  async ({ username, full_name, email, password, phone }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username,
          full_name,
          email,
          password,
          phone,
          role: 'admin',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return rejectWithValue(data?.message || 'Admin register failed')
      }
      const user = data?.user || data?.data?.user || { email, full_name, username, role: 'admin' }
      return { user }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.token = null
      state.status = 'idle'
      state.error = null
      persist(state)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.token = action.payload.token
        persist(state)
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Login failed'
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.token = action.payload.token
        persist(state)
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Register failed'
      })
      .addCase(registerAdmin.pending, (state) => {
        state.adminCreateStatus = 'loading'
        state.adminCreateError = null
      })
      .addCase(registerAdmin.fulfilled, (state) => {
        state.adminCreateStatus = 'succeeded'
      })
      .addCase(registerAdmin.rejected, (state, action) => {
        state.adminCreateStatus = 'failed'
        state.adminCreateError = action.payload || 'Admin register failed'
      })
  },
})

export const { logout } = slice.actions
export default slice.reducer
