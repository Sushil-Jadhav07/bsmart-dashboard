import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/policies`;

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchPolicies = createAsyncThunk(
  'policies/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(BASE, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load policies');
      // API returns { success, data: { terms: {...}, privacy: {...}, refund: {...} } }
      return json.data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchPolicyByType = createAsyncThunk(
  'policies/fetchOne',
  async (type, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${type}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load policy');
      // API returns { success, data: { type, title, content, status, version, updatedAt, ... } }
      return json.data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const savePolicyContent = createAsyncThunk(
  'policies/save',
  async ({ type, content, status }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    const body = { content };
    if (status !== undefined) body.status = status;
    try {
      const res = await fetch(`${BASE}/${type}`, {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to save policy');
      // API returns { success, message, data: { ... updated doc ... } }
      return json.data;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const togglePolicyStatus = createAsyncThunk(
  'policies/toggleStatus',
  async ({ type, status }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${type}/status`, {
        method: 'PATCH',
        headers: authHeader(token),
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update status');
      // API returns { success, message, data: { type, status, updatedAt } }
      return { type, ...json.data };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

const policiesSlice = createSlice({
  name: 'policies',
  initialState: {
    items: {},           // { terms: {...}, privacy: {...}, refund: {...} }
    status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    saveStatus: 'idle',  // 'idle' | 'loading' | 'succeeded' | 'failed'
    saveError: null,
    toggleLoading: false,
  },
  reducers: {
    clearSaveStatus(state) {
      state.saveStatus = 'idle';
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchPolicies
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPolicies.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        state.items = payload ?? {};
      })
      .addCase(fetchPolicies.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      });

    // fetchPolicyByType
    builder
      .addCase(fetchPolicyByType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPolicyByType.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        if (payload?.type) state.items[payload.type] = payload;
      })
      .addCase(fetchPolicyByType.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      });

    // savePolicyContent
    builder
      .addCase(savePolicyContent.pending, (state) => {
        state.saveStatus = 'loading';
        state.saveError = null;
      })
      .addCase(savePolicyContent.fulfilled, (state, { payload }) => {
        state.saveStatus = 'succeeded';
        if (payload?.type) state.items[payload.type] = payload;
      })
      .addCase(savePolicyContent.rejected, (state, { payload }) => {
        state.saveStatus = 'failed';
        state.saveError = payload;
      });

    // togglePolicyStatus
    builder
      .addCase(togglePolicyStatus.pending, (state) => {
        state.toggleLoading = true;
      })
      .addCase(togglePolicyStatus.fulfilled, (state, { payload }) => {
        state.toggleLoading = false;
        if (payload?.type && state.items[payload.type]) {
          state.items[payload.type].status = payload.status;
          state.items[payload.type].updatedAt = payload.updatedAt;
        }
      })
      .addCase(togglePolicyStatus.rejected, (state) => {
        state.toggleLoading = false;
      });
  },
});

export const { clearSaveStatus } = policiesSlice.actions;
export default policiesSlice;
