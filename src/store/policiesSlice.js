import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/policies`;

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

// ── Thunks ──────────────────────────────────────────────────────────────────

/** GET /api/policies — all full policy docs keyed by type */
export const fetchPolicies = createAsyncThunk(
  'policies/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(BASE, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load policies');
      return json.data; // { terms: {...}, privacy: {...}, ... }
    } catch (e) {
      console.error('[policies] fetchAll error:', e.message);
      return rejectWithValue(e.message);
    }
  }
);

/** GET /api/policies/types — lightweight list for dropdowns */
export const fetchPolicyTypes = createAsyncThunk(
  'policies/fetchTypes',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/types`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load types');
      return json.data; // [{ type, title, status, version, updatedAt }]
    } catch (e) { return rejectWithValue(e.message); }
  }
);

/** GET /api/policies/:type — single policy (used by editor) */
export const fetchPolicyByType = createAsyncThunk(
  'policies/fetchOne',
  async (type, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${type}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load policy');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

/** POST /api/policies — create a new custom policy type */
export const createPolicy = createAsyncThunk(
  'policies/create',
  async ({ type, title, content = '', status = 'draft' }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(BASE, {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify({ type, title, content, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to create policy');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

/** PUT /api/policies/:type — save content, bumps version, archives history */
export const savePolicyContent = createAsyncThunk(
  'policies/save',
  async ({ type, content, status }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    const body  = { content };
    if (status !== undefined) body.status = status;
    try {
      const res  = await fetch(`${BASE}/${type}`, {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to save policy');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

/** PATCH /api/policies/:type/status — toggle draft/published only */
export const togglePolicyStatus = createAsyncThunk(
  'policies/toggleStatus',
  async ({ type, status }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${type}/status`, {
        method: 'PATCH',
        headers: authHeader(token),
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update status');
      return { type, ...json.data };
    } catch (e) { return rejectWithValue(e.message); }
  }
);

/** GET /api/policies/:type/history — last 20 versions, newest first */
export const fetchPolicyHistory = createAsyncThunk(
  'policies/fetchHistory',
  async (type, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${type}/history`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load history');
      return { type, entries: json.data || [] };
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const policiesSlice = createSlice({
  name: 'policies',
  initialState: {
    items: {},            // keyed by type: { terms: {...}, privacy: {...}, ... }
    listStatus: 'idle',   // GET /api/policies  (list page)
    listError: null,
    status: 'idle',       // GET /api/policies/:type  (editor page)
    error: null,
    saveStatus: 'idle',
    saveError: null,
    createStatus: 'idle',
    createError: null,
    toggleLoading: false,
    history: {},          // keyed by type: { terms: [...], cookies: [...] }
    historyStatus: 'idle',
    historyError: null,
  },
  reducers: {
    clearSaveStatus(state) {
      state.saveStatus = 'idle';
      state.saveError  = null;
    },
    clearCreateStatus(state) {
      state.createStatus = 'idle';
      state.createError  = null;
    },
    clearHistory(state, { payload: type }) {
      delete state.history[type];
      state.historyStatus = 'idle';
    },
  },
  extraReducers: (builder) => {

    // fetchPolicies — list page uses listStatus, never touches status
    builder
      .addCase(fetchPolicies.pending,   (state)            => { state.listStatus = 'loading'; state.listError = null; })
      .addCase(fetchPolicies.fulfilled, (state, { payload }) => { state.listStatus = 'succeeded'; state.items = payload ?? {}; })
      .addCase(fetchPolicies.rejected,  (state, { payload }) => { state.listStatus = 'failed'; state.listError = payload; });

    // fetchPolicyByType — editor page uses status, never touches listStatus
    builder
      .addCase(fetchPolicyByType.pending,   (state)            => { state.status = 'loading'; state.error = null; })
      .addCase(fetchPolicyByType.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        if (payload?.type) state.items[payload.type] = payload;
      })
      .addCase(fetchPolicyByType.rejected,  (state, { payload }) => { state.status = 'failed'; state.error = payload; });

    // createPolicy
    builder
      .addCase(createPolicy.pending,   (state)            => { state.createStatus = 'loading'; state.createError = null; })
      .addCase(createPolicy.fulfilled, (state, { payload }) => {
        state.createStatus = 'succeeded';
        if (payload?.type) state.items[payload.type] = payload;
      })
      .addCase(createPolicy.rejected,  (state, { payload }) => { state.createStatus = 'failed'; state.createError = payload; });

    // savePolicyContent
    builder
      .addCase(savePolicyContent.pending,   (state)            => { state.saveStatus = 'loading'; state.saveError = null; })
      .addCase(savePolicyContent.fulfilled, (state, { payload }) => {
        state.saveStatus = 'succeeded';
        if (payload?.type) {
          state.items[payload.type] = payload;
          delete state.history[payload.type]; // invalidate cached history
        }
      })
      .addCase(savePolicyContent.rejected,  (state, { payload }) => { state.saveStatus = 'failed'; state.saveError = payload; });

    // togglePolicyStatus
    builder
      .addCase(togglePolicyStatus.pending,   (state)            => { state.toggleLoading = true; })
      .addCase(togglePolicyStatus.fulfilled, (state, { payload }) => {
        state.toggleLoading = false;
        if (payload?.type && state.items[payload.type]) {
          state.items[payload.type].status    = payload.status;
          state.items[payload.type].updatedAt = payload.updatedAt;
        }
      })
      .addCase(togglePolicyStatus.rejected,  (state) => { state.toggleLoading = false; });

    // fetchPolicyHistory
    builder
      .addCase(fetchPolicyHistory.pending,   (state)                      => { state.historyStatus = 'loading'; state.historyError = null; })
      .addCase(fetchPolicyHistory.fulfilled, (state, { payload: { type, entries } }) => {
        state.historyStatus   = 'succeeded';
        state.history[type]   = entries;
      })
      .addCase(fetchPolicyHistory.rejected,  (state, { payload })          => { state.historyStatus = 'failed'; state.historyError = payload; });
  },
});

export const { clearSaveStatus, clearCreateStatus, clearHistory } = policiesSlice.actions;
export default policiesSlice.reducer;
