import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/content-reports`;

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

const extractOne = (json) => json?.data || json?.report || json;

export const fetchContentReports = createAsyncThunk(
  'contentReports/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const qs = new URLSearchParams();
      if (params.content_type && params.content_type !== 'all') qs.set('content_type', params.content_type);
      if (params.status && params.status !== 'all') qs.set('status', params.status);
      // Without an explicit page, walk every page (100 each, max 30) so reports
      // can be grouped by content and counted across the whole queue.
      const single = params.page !== undefined;
      qs.set('limit', params.limit || (single ? 20 : 100));
      const items = [];
      let total = 0;
      let totalPages = 1;
      for (let page = params.page || 1; page <= (single ? params.page : 30); page += 1) {
        qs.set('page', page);
        const res = await fetch(`${BASE}/admin?${qs}`, { headers: authHeader(token) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || 'Failed to load content reports');
        items.push(...(Array.isArray(json?.reports) ? json.reports : []));
        total = json?.total ?? items.length;
        totalPages = json?.total_pages ?? 1;
        if (page >= totalPages) break;
      }
      return { items, total, page: single ? params.page : 1, totalPages: single ? totalPages : 1 };
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const updateContentReport = createAsyncThunk(
  'contentReports/update',
  async ({ id, data }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${id}`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update content report');
      return extractOne(json);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const deleteContentReport = createAsyncThunk(
  'contentReports/delete',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeader(token) });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Failed to delete content report');
      }
      return id;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

const contentReportsSlice = createSlice({
  name: 'contentReports',
  initialState: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    listStatus: 'idle',
    listError: null,
    updateStatus: 'idle',
    updateError: null,
    deleteStatus: 'idle',
    deleteError: null,
  },
  reducers: {
    clearUpdateStatus: (s) => { s.updateStatus = 'idle'; s.updateError = null; },
    clearDeleteStatus: (s) => { s.deleteStatus = 'idle'; s.deleteError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContentReports.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchContentReports.fulfilled, (s, a) => {
        s.listStatus = 'succeeded';
        s.list = a.payload.items;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.totalPages = a.payload.totalPages;
      })
      .addCase(fetchContentReports.rejected, (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    builder
      .addCase(updateContentReport.pending, (s) => { s.updateStatus = 'loading'; s.updateError = null; })
      .addCase(updateContentReport.fulfilled, (s, a) => {
        s.updateStatus = 'succeeded';
        if (a.payload) {
          const idx = s.list.findIndex((r) => (r._id || r.id) === (a.payload._id || a.payload.id));
          // The update response isn't populated; keep the populated reporter/owner.
          if (idx !== -1) {
            const prev = s.list[idx];
            s.list[idx] = {
              ...prev,
              ...a.payload,
              reporter_id: typeof a.payload.reporter_id === 'object' ? a.payload.reporter_id : prev.reporter_id,
              owner_id: typeof a.payload.owner_id === 'object' ? a.payload.owner_id : prev.owner_id,
            };
          }
        }
      })
      .addCase(updateContentReport.rejected, (s, a) => { s.updateStatus = 'failed'; s.updateError = a.payload; });

    builder
      .addCase(deleteContentReport.pending, (s) => { s.deleteStatus = 'loading'; s.deleteError = null; })
      .addCase(deleteContentReport.fulfilled, (s, a) => {
        s.deleteStatus = 'succeeded';
        s.list = s.list.filter((r) => (r._id || r.id) !== a.payload);
      })
      .addCase(deleteContentReport.rejected, (s, a) => { s.deleteStatus = 'failed'; s.deleteError = a.payload; });
  },
});

export const { clearUpdateStatus, clearDeleteStatus } = contentReportsSlice.actions;
export default contentReportsSlice.reducer;
