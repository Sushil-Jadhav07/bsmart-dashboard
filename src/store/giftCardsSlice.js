import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const BASE = `${API_BASE_WITH_PATH}/gift-cards`;

const authHeader  = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader  = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchGiftCards = createAsyncThunk(
  'giftCards/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const qs = new URLSearchParams();
      if (params.card_status && params.card_status !== 'all') qs.set('card_status', params.card_status);
      if (params.category) qs.set('category', params.category);
      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      const res  = await fetch(url, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load gift cards');
      return Array.isArray(json.data) ? json.data : (json.data?.items ?? []);
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchGiftCardById = createAsyncThunk(
  'giftCards/fetchOne',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${id}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load gift card');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const createGiftCard = createAsyncThunk(
  'giftCards/create',
  async (body, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(BASE, { method: 'POST', headers: jsonHeader(token), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to create gift card');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const updateGiftCard = createAsyncThunk(
  'giftCards/update',
  async ({ id, ...body }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${id}`, { method: 'PUT', headers: jsonHeader(token), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update gift card');
      return json.data;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const deleteGiftCard = createAsyncThunk(
  'giftCards/delete',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res  = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to delete gift card');
      return id;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const uploadGiftCardMedia = createAsyncThunk(
  'giftCards/uploadMedia',
  async (file, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch(`${BASE}/upload`, { method: 'POST', headers: authHeader(token), body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to upload media');
      return json.media; // { url, type } from response body
    } catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const giftCardsSlice = createSlice({
  name: 'giftCards',
  initialState: {
    list:          [],
    listStatus:    'idle',
    listError:     null,
    current:       null,
    currentStatus: 'idle',
    currentError:  null,
    saveStatus:    'idle',
    saveError:     null,
    deleteStatus:  'idle',
    deleteError:   null,
    uploadStatus:  'idle',
    uploadError:   null,
  },
  reducers: {
    clearSaveStatus:   (s) => { s.saveStatus = 'idle'; s.saveError = null; },
    clearDeleteStatus: (s) => { s.deleteStatus = 'idle'; s.deleteError = null; },
    clearCurrent:      (s) => { s.current = null; s.currentStatus = 'idle'; s.currentError = null; },
    clearUploadStatus: (s) => { s.uploadStatus = 'idle'; s.uploadError = null; },
  },
  extraReducers: (builder) => {
    // fetchAll
    builder
      .addCase(fetchGiftCards.pending,   (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchGiftCards.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.list = a.payload; })
      .addCase(fetchGiftCards.rejected,  (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    // fetchOne
    builder
      .addCase(fetchGiftCardById.pending,   (s) => { s.currentStatus = 'loading'; s.currentError = null; s.current = null; })
      .addCase(fetchGiftCardById.fulfilled, (s, a) => { s.currentStatus = 'succeeded'; s.current = a.payload; })
      .addCase(fetchGiftCardById.rejected,  (s, a) => { s.currentStatus = 'failed'; s.currentError = a.payload; });

    // create
    builder
      .addCase(createGiftCard.pending,   (s) => { s.saveStatus = 'loading'; s.saveError = null; })
      .addCase(createGiftCard.fulfilled, (s, a) => { s.saveStatus = 'succeeded'; if (a.payload) s.list.unshift(a.payload); })
      .addCase(createGiftCard.rejected,  (s, a) => { s.saveStatus = 'failed'; s.saveError = a.payload; });

    // update
    builder
      .addCase(updateGiftCard.pending,   (s) => { s.saveStatus = 'loading'; s.saveError = null; })
      .addCase(updateGiftCard.fulfilled, (s, a) => {
        s.saveStatus = 'succeeded';
        if (a.payload) {
          const idx = s.list.findIndex((c) => c.id === a.payload.id || c._id === a.payload._id);
          if (idx !== -1) s.list[idx] = a.payload;
          s.current = a.payload;
        }
      })
      .addCase(updateGiftCard.rejected,  (s, a) => { s.saveStatus = 'failed'; s.saveError = a.payload; });

    // delete
    builder
      .addCase(deleteGiftCard.pending,   (s) => { s.deleteStatus = 'loading'; s.deleteError = null; })
      .addCase(deleteGiftCard.fulfilled, (s, a) => {
        s.deleteStatus = 'succeeded';
        s.list = s.list.filter((c) => c.id !== a.payload && c._id !== a.payload);
      })
      .addCase(deleteGiftCard.rejected,  (s, a) => { s.deleteStatus = 'failed'; s.deleteError = a.payload; });

    // upload
    builder
      .addCase(uploadGiftCardMedia.pending,   (s) => { s.uploadStatus = 'loading'; s.uploadError = null; })
      .addCase(uploadGiftCardMedia.fulfilled, (s) => { s.uploadStatus = 'succeeded'; })
      .addCase(uploadGiftCardMedia.rejected,  (s, a) => { s.uploadStatus = 'failed'; s.uploadError = a.payload; });
  },
});

export const { clearSaveStatus, clearDeleteStatus, clearCurrent, clearUploadStatus } = giftCardsSlice.actions;
export default giftCardsSlice.reducer;
