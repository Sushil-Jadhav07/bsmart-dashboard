import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/gift-card-orders`;

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchGiftCardOrders = createAsyncThunk(
  'giftCardOrders/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const qs = new URLSearchParams();
      if (params.status && params.status !== 'all') qs.set('status', params.status);
      if (params.userId) qs.set('userId', params.userId);
      if (params.page) qs.set('page', params.page);
      if (params.limit) qs.set('limit', params.limit);
      const url = qs.toString() ? `${BASE}/admin/all?${qs}` : `${BASE}/admin/all`;
      const res = await fetch(url, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load gift card orders');
      return Array.isArray(json.data) ? json.data : (json.data?.items ?? []);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchGiftCardOrderById = createAsyncThunk(
  'giftCardOrders/fetchOne',
  async (orderId, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${orderId}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load gift card order');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const cancelGiftCardOrder = createAsyncThunk(
  'giftCardOrders/cancel',
  async (orderId, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${orderId}/cancel`, { method: 'PUT', headers: jsonHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to cancel gift card order');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const startProcessingGiftCardOrder = createAsyncThunk(
  'giftCardOrders/startProcessing',
  async (orderId, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${orderId}/processing`, { method: 'PATCH', headers: jsonHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to start processing');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const completeGiftCardOrder = createAsyncThunk(
  'giftCardOrders/complete',
  async ({ orderId, data }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${orderId}/complete`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to complete order');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const deleteGiftCardOrder = createAsyncThunk(
  'giftCardOrders/delete',
  async (orderId, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${orderId}`, { method: 'DELETE', headers: authHeader(token) });
      if (!res.ok) throw new Error('Failed to delete order');
      return orderId;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const giftCardOrdersSlice = createSlice({
  name: 'giftCardOrders',
  initialState: {
    list: [],
    listStatus: 'idle',
    listError: null,
    current: null,
    currentStatus: 'idle',
    currentError: null,
    cancelStatus: 'idle',
    cancelError: null,
    startProcessingStatus: 'idle',
    startProcessingError: null,
    completeStatus: 'idle',
    completeError: null,
    deleteStatus: 'idle',
    deleteError: null,
  },
  reducers: {
    clearCancelStatus: (s) => { s.cancelStatus = 'idle'; s.cancelError = null; },
    clearStartProcessingStatus: (s) => { s.startProcessingStatus = 'idle'; s.startProcessingError = null; },
    clearCompleteStatus: (s) => { s.completeStatus = 'idle'; s.completeError = null; },
    clearDeleteStatus: (s) => { s.deleteStatus = 'idle'; s.deleteError = null; },
    clearCurrent: (s) => { s.current = null; s.currentStatus = 'idle'; s.currentError = null; },
  },
  extraReducers: (builder) => {
    // fetchAll
    builder
      .addCase(fetchGiftCardOrders.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchGiftCardOrders.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.list = a.payload; })
      .addCase(fetchGiftCardOrders.rejected, (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    // fetchOne
    builder
      .addCase(fetchGiftCardOrderById.pending, (s) => { s.currentStatus = 'loading'; s.currentError = null; })
      .addCase(fetchGiftCardOrderById.fulfilled, (s, a) => { s.currentStatus = 'succeeded'; s.current = a.payload; })
      .addCase(fetchGiftCardOrderById.rejected, (s, a) => { s.currentStatus = 'failed'; s.currentError = a.payload; });

    // cancel
    builder
      .addCase(cancelGiftCardOrder.pending, (s) => { s.cancelStatus = 'loading'; s.cancelError = null; })
      .addCase(cancelGiftCardOrder.fulfilled, (s, a) => {
        s.cancelStatus = 'succeeded';
        if (a.payload) {
          s.current = a.payload;
          const idx = s.list.findIndex((o) => o.id === a.payload.id || o._id === a.payload._id);
          if (idx !== -1) s.list[idx] = a.payload;
        }
      })
      .addCase(cancelGiftCardOrder.rejected, (s, a) => { s.cancelStatus = 'failed'; s.cancelError = a.payload; });

    // start processing
    builder
      .addCase(startProcessingGiftCardOrder.pending, (s) => { s.startProcessingStatus = 'loading'; s.startProcessingError = null; })
      .addCase(startProcessingGiftCardOrder.fulfilled, (s, a) => {
        s.startProcessingStatus = 'succeeded';
        if (a.payload) {
          s.current = a.payload;
          const idx = s.list.findIndex((o) => o.id === a.payload.id || o._id === a.payload._id);
          if (idx !== -1) s.list[idx] = a.payload;
        }
      })
      .addCase(startProcessingGiftCardOrder.rejected, (s, a) => { s.startProcessingStatus = 'failed'; s.startProcessingError = a.payload; });

    // complete
    builder
      .addCase(completeGiftCardOrder.pending, (s) => { s.completeStatus = 'loading'; s.completeError = null; })
      .addCase(completeGiftCardOrder.fulfilled, (s, a) => {
        s.completeStatus = 'succeeded';
        if (a.payload) {
          s.current = a.payload;
          const idx = s.list.findIndex((o) => o.id === a.payload.id || o._id === a.payload._id);
          if (idx !== -1) s.list[idx] = a.payload;
        }
      })
      .addCase(completeGiftCardOrder.rejected, (s, a) => { s.completeStatus = 'failed'; s.completeError = a.payload; });

    // delete
    builder
      .addCase(deleteGiftCardOrder.pending, (s) => { s.deleteStatus = 'loading'; s.deleteError = null; })
      .addCase(deleteGiftCardOrder.fulfilled, (s, a) => {
        s.deleteStatus = 'succeeded';
        s.list = s.list.filter((o) => (o.id || o._id) !== a.payload);
      })
      .addCase(deleteGiftCardOrder.rejected, (s, a) => { s.deleteStatus = 'failed'; s.deleteError = a.payload; });
  },
});

export const {
  clearCancelStatus,
  clearStartProcessingStatus,
  clearCompleteStatus,
  clearDeleteStatus,
  clearCurrent,
} = giftCardOrdersSlice.actions;
export default giftCardOrdersSlice.reducer;
