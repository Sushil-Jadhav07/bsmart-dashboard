import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

const buildQuery = (params = {}, page) => {
  const qs = new URLSearchParams();
  if (params.seller && params.seller !== 'all') qs.set('seller', params.seller);
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.category && params.category !== 'all') qs.set('category', params.category);
  if (params.q && params.q.trim()) qs.set('q', params.q.trim());
  qs.set('page', page);
  qs.set('limit', PAGE_LIMIT);
  return qs;
};

// The admin catalog endpoints are paginated server-side; walk every page so the
// shared table component can sort and paginate the full filtered set client-side.
const fetchAllPages = async (endpoint, listKey, params, token) => {
  const items = [];
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await fetch(`${API_BASE_WITH_PATH}/${endpoint}/admin/all?${buildQuery(params, page)}`, {
      headers: authHeader(token),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Failed to load ${listKey}`);
    items.push(...(Array.isArray(json?.[listKey]) ? json[listKey] : []));
    total = json?.total ?? items.length;
    if (page >= (json?.totalPages || 1)) break;
  }
  return { items, total };
};

export const fetchInfluencers = createAsyncThunk(
  'marketplace/fetchInfluencers',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/admin/users?all=true&role=influencer`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load influencers');
      return Array.isArray(json?.data) ? json.data : [];
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const setInfluencerSuspension = createAsyncThunk(
  'marketplace/setInfluencerSuspension',
  async ({ id, suspended, reason }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try {
      const body = suspended ? { suspended: true, reason: reason || '' } : { suspended: false };
      const res = await fetch(`${API_BASE_WITH_PATH}/users/${id}/suspend-influencer`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update suspension');
      return {
        id: String(json?.id || id),
        is_suspended: !!json?.is_suspended,
        suspension_reason: json?.suspension_reason || '',
      };
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchAdminProducts = createAsyncThunk(
  'marketplace/fetchAdminProducts',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try { return await fetchAllPages('influencer-products', 'products', params, token); }
    catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchAdminServices = createAsyncThunk(
  'marketplace/fetchAdminServices',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try { return await fetchAllPages('influencer-services', 'services', params, token); }
    catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchMarketplaceProduct = createAsyncThunk(
  'marketplace/fetchProduct',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/influencer-products/${id}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load product');
      return json?.product || null;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const fetchMarketplaceService = createAsyncThunk(
  'marketplace/fetchService',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/influencer-services/${id}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load service');
      return json?.service || null;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

const listState = () => ({ items: [], total: 0, status: 'idle', error: null });
const detailState = () => ({ item: null, status: 'idle', error: null });

const initialState = {
  influencers: listState(),
  suspending: {},
  products: listState(),
  services: listState(),
  product: detailState(),
  service: detailState(),
};

// Products/services carry a populated `user_id`; keep its suspended flag in sync
// after a suspend/restore so badges update without a refetch.
const patchSellerSuspension = (items, id, isSuspended) => items.map((item) => {
  const seller = item?.user_id;
  if (!seller || typeof seller !== 'object' || String(seller._id) !== id) return item;
  return {
    ...item,
    user_id: { ...seller, influencer_profile: { ...(seller.influencer_profile || {}), is_suspended: isSuspended } },
  };
});

const addListCases = (builder, thunk, key) => {
  builder
    .addCase(thunk.pending, (state) => { state[key].status = 'loading'; state[key].error = null; })
    .addCase(thunk.fulfilled, (state, action) => {
      state[key].status = 'succeeded';
      state[key].items = action.payload.items;
      state[key].total = action.payload.total;
    })
    .addCase(thunk.rejected, (state, action) => {
      if (action.meta.aborted) return;
      state[key].status = 'failed';
      state[key].error = action.payload || 'Request failed';
    });
};

const addDetailCases = (builder, thunk, key) => {
  builder
    .addCase(thunk.pending, (state) => { state[key] = { item: null, status: 'loading', error: null }; })
    .addCase(thunk.fulfilled, (state, action) => { state[key].status = 'succeeded'; state[key].item = action.payload; })
    .addCase(thunk.rejected, (state, action) => { state[key].status = 'failed'; state[key].error = action.payload || 'Request failed'; });
};

const slice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInfluencers.pending, (state) => { state.influencers.status = 'loading'; state.influencers.error = null; })
      .addCase(fetchInfluencers.fulfilled, (state, action) => {
        state.influencers.status = 'succeeded';
        state.influencers.items = action.payload;
        state.influencers.total = action.payload.length;
      })
      .addCase(fetchInfluencers.rejected, (state, action) => {
        state.influencers.status = 'failed';
        state.influencers.error = action.payload || 'Failed to load influencers';
      })
      .addCase(setInfluencerSuspension.pending, (state, action) => { state.suspending[action.meta.arg.id] = true; })
      .addCase(setInfluencerSuspension.rejected, (state, action) => { delete state.suspending[action.meta.arg.id]; })
      .addCase(setInfluencerSuspension.fulfilled, (state, action) => {
        const { id, is_suspended, suspension_reason } = action.payload;
        delete state.suspending[action.meta.arg.id];
        state.influencers.items = state.influencers.items.map((user) => (String(user._id) === id
          ? {
            ...user,
            influencer_profile: {
              ...(user.influencer_profile || {}),
              is_suspended,
              suspension_reason,
              suspended_at: is_suspended ? new Date().toISOString() : null,
            },
          }
          : user));
        state.products.items = patchSellerSuspension(state.products.items, id, is_suspended);
        state.services.items = patchSellerSuspension(state.services.items, id, is_suspended);
      });
    addListCases(builder, fetchAdminProducts, 'products');
    addListCases(builder, fetchAdminServices, 'services');
    addDetailCases(builder, fetchMarketplaceProduct, 'product');
    addDetailCases(builder, fetchMarketplaceService, 'service');
  },
});

export default slice.reducer;
