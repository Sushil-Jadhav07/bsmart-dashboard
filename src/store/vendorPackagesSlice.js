import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const authHeaders = (token, json = false) => {
  const h = { Accept: 'application/json', Authorization: `Bearer ${token}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/vendor-packages/admin
 * Required: name, tier, ads_allowed_min, ads_allowed_max, base_price, coins_granted
 * Optional: discount_percent, final_price, validity_days, description, features
 * Response: { success, message, package }
 */
export const adminCreatePackage = createAsyncThunk(
  'vendorPackages/adminCreate',
  async (payload, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to create package')
      return data.package
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * GET /api/vendor-packages/admin/purchases?vendorId=&status=&page=&limit=
 * Response: { success, total, page, total_pages, purchases[] }
 */
export const adminFetchAllPurchases = createAsyncThunk(
  'vendorPackages/adminFetchAllPurchases',
  async ({ page = 1, limit = 20, vendorId, status } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const params = new URLSearchParams({ page, limit })
      if (vendorId) params.set('vendorId', vendorId)
      if (status)   params.set('status', status)
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/purchases?${params}`, {
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch purchases')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * PUT /api/vendor-packages/admin/:packageId
 * Response: { success, message, package }
 */
export const adminUpdatePackage = createAsyncThunk(
  'vendorPackages/adminUpdate',
  async ({ packageId, payload }, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/${packageId}`, {
        method: 'PUT',
        headers: authHeaders(token, true),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to update package')
      return data.package
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * DELETE /api/vendor-packages/admin/:packageId
 * Response: { success, message } — sets is_active false (soft delete)
 */
export const adminDeactivatePackage = createAsyncThunk(
  'vendorPackages/adminDeactivate',
  async (packageId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/${packageId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to deactivate package')
      return packageId
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// ─── Vendor (my) endpoints ────────────────────────────────────────────────────

/**
 * GET /api/vendor-packages/my/active
 * Response: { success, active_package: { purchase_id, package, amount_paid,
 *             coins_credited, purchased_at, expires_at, status } | null }
 */
export const fetchMyActivePackage = createAsyncThunk(
  'vendorPackages/fetchMyActive',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/my/active`, {
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch active package')
      return data.active_package // null or { purchase_id, package: {...}, amount_paid, ... }
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * POST /api/vendor-packages/my/coin-preview
 * Body: { budget_inr } — must be multiple of 5000 between 5000–100000
 * Response: { success, coin_breakdown: { paid_amount_inr, package_name, tier,
 *             base_coins, additional_coins, total_coins, conversion_note } }
 */
export const fetchMyCoinPreview = createAsyncThunk(
  'vendorPackages/fetchMyCoinPreview',
  async (budgetInr, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/my/coin-preview`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ budget_inr: budgetInr }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch coin preview')
      return data.coin_breakdown
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * GET /api/vendor-packages/my/history?page=&limit=
 * Response: { success, total, page, total_pages, purchases[] }
 */
export const fetchMyPackageHistory = createAsyncThunk(
  'vendorPackages/fetchMyHistory',
  async ({ page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(
        `${API_BASE_WITH_PATH}/vendor-packages/my/history?page=${page}&limit=${limit}`,
        { headers: authHeaders(token) }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch package history')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * GET /api/vendor-packages/my/transactions?page=&limit=
 * Response: { success, wallet_balance, total, page, total_pages, transactions[] }
 * Each tx: { _id, type, amount, direction('credit'|'debit'), description, status, ad, created_at }
 */
export const fetchMyTransactions = createAsyncThunk(
  'vendorPackages/fetchMyTransactions',
  async ({ page = 1, limit = 20 } = {}, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(
        `${API_BASE_WITH_PATH}/vendor-packages/my/transactions?page=${page}&limit=${limit}`,
        { headers: authHeaders(token) }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch transactions')
      return data
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// ─── Public / shared endpoints ────────────────────────────────────────────────

/**
 * GET /api/vendor-packages
 * Response: { success, packages[] } — sorted by final_price asc
 */
export const fetchAllPackages = createAsyncThunk(
  'vendorPackages/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages`, {
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch packages')
      return data.packages || []
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * GET /api/vendor-packages/:packageId/preview
 * Response: { success, preview: { package_name, tier, ads_allowed_min, ads_allowed_max,
 *             base_price, discount_percent, final_price, coins_granted, validity_days,
 *             description, features } }
 */
export const fetchPackagePreview = createAsyncThunk(
  'vendorPackages/fetchPreview',
  async (packageId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/${packageId}/preview`, {
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch package preview')
      return data.preview
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * POST /api/vendor-packages/:packageId/buy
 * Response: { success, message, purchase: { purchase_id, package_name, tier,
 *             ads_allowed_min, ads_allowed_max, base_price, discount_percent,
 *             amount_paid, coins_credited, expires_at, wallet_balance } }
 */
export const buyPackage = createAsyncThunk(
  'vendorPackages/buy',
  async (packageId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/${packageId}/buy`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to purchase package')
      return data.purchase
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

/**
 * GET /api/vendor-packages/:packageId
 * Response: { success, package }
 */
export const fetchPackageById = createAsyncThunk(
  'vendorPackages/fetchById',
  async (packageId, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('No token')
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/${packageId}`, {
        headers: authHeaders(token),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch package')
      return data.package
    } catch (e) {
      return rejectWithValue(e.message || 'Network error')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  // All active packages (GET /api/vendor-packages)
  packages: [],
  packagesStatus: 'idle',
  packagesError: null,

  // Admin: all purchases across vendors
  adminPurchases: [],
  adminPurchasesTotal: 0,
  adminPurchasesPage: 1,
  adminPurchasesStatus: 'idle',
  adminPurchasesError: null,

  // My active package (vendor only)
  myActivePackage: null, // { purchase_id, package: { name, tier, ... }, amount_paid, coins_credited, purchased_at, expires_at, status }
  myActiveStatus: 'idle',
  myActiveError: null,

  // My purchase history
  myHistory: [],
  myHistoryTotal: 0,
  myHistoryStatus: 'idle',
  myHistoryError: null,

  // My wallet transactions (vendor-scoped, enriched with direction)
  myTransactions: [],
  myTransactionsTotal: 0,
  myWalletBalance: 0,
  myTransactionsStatus: 'idle',
  myTransactionsError: null,

  // Coin preview result from /my/coin-preview
  coinPreview: null, // { paid_amount_inr, package_name, tier, base_coins, additional_coins, total_coins, conversion_note }
  coinPreviewStatus: 'idle',
  coinPreviewError: null,

  // Single package detail / preview
  selectedPackage: null,
  selectedPackageStatus: 'idle',
  selectedPackageError: null,

  // Mutation state (create / update / deactivate / buy)
  mutationStatus: 'idle',
  mutationError: null,
}

const vendorPackagesSlice = createSlice({
  name: 'vendorPackages',
  initialState,
  reducers: {
    resetMutation: (state) => {
      state.mutationStatus = 'idle'
      state.mutationError  = null
    },
    resetCoinPreview: (state) => {
      state.coinPreview       = null
      state.coinPreviewStatus = 'idle'
      state.coinPreviewError  = null
    },
    resetMyActive: (state) => {
      state.myActivePackage = null
      state.myActiveStatus  = 'idle'
      state.myActiveError   = null
    },
  },
  extraReducers: (builder) => {
    // fetchAllPackages
    builder
      .addCase(fetchAllPackages.pending,   (s) => { s.packagesStatus = 'loading'; s.packagesError = null })
      .addCase(fetchAllPackages.fulfilled, (s, a) => { s.packagesStatus = 'succeeded'; s.packages = a.payload })
      .addCase(fetchAllPackages.rejected,  (s, a) => { s.packagesStatus = 'failed';   s.packagesError = a.payload })

    // adminFetchAllPurchases
    builder
      .addCase(adminFetchAllPurchases.pending,   (s) => { s.adminPurchasesStatus = 'loading'; s.adminPurchasesError = null })
      .addCase(adminFetchAllPurchases.fulfilled, (s, a) => {
        s.adminPurchasesStatus = 'succeeded'
        s.adminPurchases       = a.payload.purchases || []
        s.adminPurchasesTotal  = a.payload.total     || 0
        s.adminPurchasesPage   = a.payload.page      || 1
      })
      .addCase(adminFetchAllPurchases.rejected,  (s, a) => { s.adminPurchasesStatus = 'failed'; s.adminPurchasesError = a.payload })

    // adminCreatePackage
    builder
      .addCase(adminCreatePackage.pending,   (s) => { s.mutationStatus = 'loading'; s.mutationError = null })
      .addCase(adminCreatePackage.fulfilled, (s, a) => {
        s.mutationStatus = 'succeeded'
        if (a.payload) s.packages.unshift(a.payload)
      })
      .addCase(adminCreatePackage.rejected,  (s, a) => { s.mutationStatus = 'failed'; s.mutationError = a.payload })

    // adminUpdatePackage
    builder
      .addCase(adminUpdatePackage.pending,   (s) => { s.mutationStatus = 'loading'; s.mutationError = null })
      .addCase(adminUpdatePackage.fulfilled, (s, a) => {
        s.mutationStatus = 'succeeded'
        const updated = a.payload
        if (updated) {
          const idx = s.packages.findIndex(p => (p._id || p.id) === (updated._id || updated.id))
          if (idx !== -1) s.packages[idx] = updated
        }
      })
      .addCase(adminUpdatePackage.rejected,  (s, a) => { s.mutationStatus = 'failed'; s.mutationError = a.payload })

    // adminDeactivatePackage
    builder
      .addCase(adminDeactivatePackage.pending,   (s) => { s.mutationStatus = 'loading'; s.mutationError = null })
      .addCase(adminDeactivatePackage.fulfilled, (s, a) => {
        s.mutationStatus = 'succeeded'
        const idx = s.packages.findIndex(p => (p._id || p.id) === a.payload)
        if (idx !== -1) s.packages[idx] = { ...s.packages[idx], is_active: false }
      })
      .addCase(adminDeactivatePackage.rejected,  (s, a) => { s.mutationStatus = 'failed'; s.mutationError = a.payload })

    // fetchMyActivePackage
    builder
      .addCase(fetchMyActivePackage.pending,   (s) => { s.myActiveStatus = 'loading'; s.myActiveError = null })
      .addCase(fetchMyActivePackage.fulfilled, (s, a) => { s.myActiveStatus = 'succeeded'; s.myActivePackage = a.payload })
      .addCase(fetchMyActivePackage.rejected,  (s, a) => { s.myActiveStatus = 'failed';   s.myActiveError = a.payload })

    // fetchMyCoinPreview
    builder
      .addCase(fetchMyCoinPreview.pending,   (s) => { s.coinPreviewStatus = 'loading'; s.coinPreviewError = null; s.coinPreview = null })
      .addCase(fetchMyCoinPreview.fulfilled, (s, a) => { s.coinPreviewStatus = 'succeeded'; s.coinPreview = a.payload })
      .addCase(fetchMyCoinPreview.rejected,  (s, a) => { s.coinPreviewStatus = 'failed';   s.coinPreviewError = a.payload })

    // fetchMyPackageHistory
    builder
      .addCase(fetchMyPackageHistory.pending,   (s) => { s.myHistoryStatus = 'loading'; s.myHistoryError = null })
      .addCase(fetchMyPackageHistory.fulfilled, (s, a) => {
        s.myHistoryStatus = 'succeeded'
        s.myHistory       = a.payload.purchases || []
        s.myHistoryTotal  = a.payload.total     || 0
      })
      .addCase(fetchMyPackageHistory.rejected,  (s, a) => { s.myHistoryStatus = 'failed'; s.myHistoryError = a.payload })

    // fetchMyTransactions
    builder
      .addCase(fetchMyTransactions.pending,   (s) => { s.myTransactionsStatus = 'loading'; s.myTransactionsError = null })
      .addCase(fetchMyTransactions.fulfilled, (s, a) => {
        s.myTransactionsStatus = 'succeeded'
        s.myTransactions       = a.payload.transactions   || []
        s.myTransactionsTotal  = a.payload.total          || 0
        s.myWalletBalance      = a.payload.wallet_balance ?? 0
      })
      .addCase(fetchMyTransactions.rejected,  (s, a) => { s.myTransactionsStatus = 'failed'; s.myTransactionsError = a.payload })

    // fetchPackagePreview / fetchPackageById
    builder
      .addCase(fetchPackagePreview.pending,   (s) => { s.selectedPackageStatus = 'loading'; s.selectedPackageError = null })
      .addCase(fetchPackagePreview.fulfilled, (s, a) => { s.selectedPackageStatus = 'succeeded'; s.selectedPackage = a.payload })
      .addCase(fetchPackagePreview.rejected,  (s, a) => { s.selectedPackageStatus = 'failed';   s.selectedPackageError = a.payload })
      .addCase(fetchPackageById.pending,      (s) => { s.selectedPackageStatus = 'loading'; s.selectedPackageError = null })
      .addCase(fetchPackageById.fulfilled,    (s, a) => { s.selectedPackageStatus = 'succeeded'; s.selectedPackage = a.payload })
      .addCase(fetchPackageById.rejected,     (s, a) => { s.selectedPackageStatus = 'failed';   s.selectedPackageError = a.payload })

    // buyPackage — after buying, reset myActive so page re-fetches
    builder
      .addCase(buyPackage.pending,   (s) => { s.mutationStatus = 'loading'; s.mutationError = null })
      .addCase(buyPackage.fulfilled, (s) => { s.mutationStatus = 'succeeded'; s.myActiveStatus = 'idle' })
      .addCase(buyPackage.rejected,  (s, a) => { s.mutationStatus = 'failed'; s.mutationError = a.payload })
  },
})

export const { resetMutation, resetCoinPreview, resetMyActive } = vendorPackagesSlice.actions
export default vendorPackagesSlice.reducer
