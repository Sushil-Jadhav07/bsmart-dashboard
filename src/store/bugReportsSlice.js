import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/bug-reports`;

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

const extractList = (json) => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.bugReports)) return json.bugReports;
  if (Array.isArray(json?.reports)) return json.reports;
  return [];
};

const extractOne = (json) => json?.data || json?.bugReport || json?.report || json;

export const fetchBugReports = createAsyncThunk(
  'bugReports/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const qs = new URLSearchParams();
      if (params.status && params.status !== 'all') qs.set('status', params.status);
      if (params.category && params.category !== 'all') qs.set('category', params.category);
      if (params.priority && params.priority !== 'all') qs.set('priority', params.priority);
      if (params.assigned_to) qs.set('assigned_to', params.assigned_to);
      qs.set('page', params.page || 1);
      qs.set('limit', params.limit || 50);
      const res = await fetch(`${BASE}/admin/all?${qs}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load bug reports');
      return {
        items: extractList(json),
        total: json?.total ?? json?.data?.total ?? json?.count ?? 0,
        page: json?.page ?? json?.data?.page ?? params.page ?? 1,
        totalPages: json?.total_pages ?? json?.totalPages ?? json?.data?.totalPages ?? 1,
      };
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchBugReportById = createAsyncThunk(
  'bugReports/fetchOne',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${id}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load bug report');
      return extractOne(json);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const updateBugReport = createAsyncThunk(
  'bugReports/update',
  async ({ id, data }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/admin/${id}`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update bug report');
      return extractOne(json);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const deleteBugReport = createAsyncThunk(
  'bugReports/delete',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeader(token) });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Failed to delete bug report');
      }
      return id;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

const bugReportsSlice = createSlice({
  name: 'bugReports',
  initialState: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    listStatus: 'idle',
    listError: null,
    current: null,
    currentStatus: 'idle',
    currentError: null,
    updateStatus: 'idle',
    updateError: null,
    deleteStatus: 'idle',
    deleteError: null,
  },
  reducers: {
    clearCurrent: (s) => { s.current = null; s.currentStatus = 'idle'; s.currentError = null; },
    clearUpdateStatus: (s) => { s.updateStatus = 'idle'; s.updateError = null; },
    clearDeleteStatus: (s) => { s.deleteStatus = 'idle'; s.deleteError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBugReports.pending, (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchBugReports.fulfilled, (s, a) => {
        s.listStatus = 'succeeded';
        s.list = a.payload.items;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.totalPages = a.payload.totalPages;
      })
      .addCase(fetchBugReports.rejected, (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    builder
      .addCase(fetchBugReportById.pending, (s) => { s.currentStatus = 'loading'; s.currentError = null; })
      .addCase(fetchBugReportById.fulfilled, (s, a) => { s.currentStatus = 'succeeded'; s.current = a.payload; })
      .addCase(fetchBugReportById.rejected, (s, a) => { s.currentStatus = 'failed'; s.currentError = a.payload; });

    builder
      .addCase(updateBugReport.pending, (s) => { s.updateStatus = 'loading'; s.updateError = null; })
      .addCase(updateBugReport.fulfilled, (s, a) => {
        s.updateStatus = 'succeeded';
        if (a.payload) {
          s.current = a.payload;
          const idx = s.list.findIndex((r) => (r._id || r.id) === (a.payload._id || a.payload.id));
          if (idx !== -1) s.list[idx] = a.payload;
        }
      })
      .addCase(updateBugReport.rejected, (s, a) => { s.updateStatus = 'failed'; s.updateError = a.payload; });

    builder
      .addCase(deleteBugReport.pending, (s) => { s.deleteStatus = 'loading'; s.deleteError = null; })
      .addCase(deleteBugReport.fulfilled, (s, a) => {
        s.deleteStatus = 'succeeded';
        s.list = s.list.filter((r) => (r._id || r.id) !== a.payload);
        if (s.current && (s.current._id || s.current.id) === a.payload) s.current = null;
      })
      .addCase(deleteBugReport.rejected, (s, a) => { s.deleteStatus = 'failed'; s.deleteError = a.payload; });
  },
});

export const { clearCurrent, clearUpdateStatus, clearDeleteStatus } = bugReportsSlice.actions;
export default bugReportsSlice.reducer;
