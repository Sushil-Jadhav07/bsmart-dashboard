import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

const FILTER_KEYS = ['seller', 'buyer', 'status', 'payment_status', 'category', 'refund_failed'];

const buildQuery = (params = {}, page) => {
  const qs = new URLSearchParams();
  FILTER_KEYS.forEach((key) => {
    if (params[key] && params[key] !== 'all') qs.set(key, params[key]);
  });
  if (params.q && params.q.trim()) qs.set('q', params.q.trim());
  qs.set('page', page);
  qs.set('limit', PAGE_LIMIT);
  return qs;
};

// The admin list endpoints are paginated server-side; walk every page (up to
// MAX_PAGES) so the shared table component can sort and paginate client-side.
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

export const fetchAdminOrders = createAsyncThunk(
  'marketplace/fetchAdminOrders',
  async (params = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try { return await fetchAllPages('orders', 'orders', params, token); }
    catch (e) { return rejectWithValue(e.message); }
  }
);

// GET /orders/:id returns user_id as a bare id, so the buyer is looked up separately.
export const fetchMarketplaceOrder = createAsyncThunk(
  'marketplace/fetchOrder',
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/orders/${id}`, { headers: authHeader(token) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load order');
      const order = json?.order || null;
      const buyerId = order && typeof order.user_id === 'string' ? order.user_id : null;
      if (buyerId) {
        const userRes = await fetch(`${API_BASE_WITH_PATH}/users/${buyerId}`, { headers: authHeader(token) }).catch(() => null);
        const userJson = userRes?.ok ? await userRes.json().catch(() => null) : null;
        const buyer = userJson?.user || userJson?.data || userJson;
        if (buyer?._id) order.user_id = buyer;
      }
      return order;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'marketplace/updateOrderStatus',
  async ({ id, ...body }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/orders/${id}/status`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to update order status');
      return json?.order;
    } catch (e) { return rejectWithValue(e.message); }
  }
);

export const cancelOrder = createAsyncThunk(
  'marketplace/cancelOrder',
  async ({ id, reason }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('No token');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: jsonHeader(token),
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to cancel order');
      return json?.order;
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
  orders: listState(),
  order: detailState(),
  orderUpdating: {},
};

// Status/cancel responses return the order with user_id unpopulated; keep the
// already-populated buyer so the UI doesn't lose the name/avatar.
const mergeOrder = (existing, updated) => ({
  ...existing,
  ...updated,
  user_id: existing && typeof existing.user_id === 'object' ? existing.user_id : updated.user_id,
});

const applyOrderUpdate = (state, updated) => {
  if (!updated?._id) return;
  const id = String(updated._id);
  state.orders.items = state.orders.items.map((o) => (String(o._id) === id ? mergeOrder(o, updated) : o));
  if (state.order.item && String(state.order.item._id) === id) state.order.item = mergeOrder(state.order.item, updated);
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
    addListCases(builder, fetchAdminOrders, 'orders');
    addDetailCases(builder, fetchMarketplaceOrder, 'order');
    [updateOrderStatus, cancelOrder].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state, action) => { state.orderUpdating[action.meta.arg.id] = true; })
        .addCase(thunk.rejected, (state, action) => { delete state.orderUpdating[action.meta.arg.id]; })
        .addCase(thunk.fulfilled, (state, action) => {
          delete state.orderUpdating[action.meta.arg.id];
          applyOrderUpdate(state, action.payload);
        });
    });
  },
});

export default slice.reducer;
