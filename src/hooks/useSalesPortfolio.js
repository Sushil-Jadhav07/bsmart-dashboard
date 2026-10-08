import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { fetchVendors } from '../store/vendorsSlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { idOf } from '../utils/vendorProfile.js';

const PURCHASE_LIMIT = 100;
const MAX_PURCHASE_PAGES = 10;

// Officers, the vendors assigned to each, account status, and package
// purchases, combined for the Sales list and detail pages.
export default function useSalesPortfolio() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { officers, officersStatus, officersError } = useSelector((s) => s.sales);
  const { items: vendors, status: vendorsStatus } = useSelector((s) => s.vendors);
  const { items: users, status: usersStatus } = useSelector((s) => s.users);
  const [purchases, setPurchases] = useState({ status: 'idle', items: [] });

  const loadPurchases = useCallback(async () => {
    if (!token) return;
    setPurchases((p) => ({ ...p, status: 'loading' }));
    try {
      const all = [];
      for (let page = 1; page <= MAX_PURCHASE_PAGES; page += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/purchases?page=${page}&limit=${PURCHASE_LIMIT}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        all.push(...(json?.purchases || []));
        if (page >= (json?.total_pages || 1)) break;
      }
      setPurchases({ status: 'succeeded', items: all });
    } catch {
      setPurchases({ status: 'failed', items: [] });
    }
  }, [token]);

  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [dispatch, officersStatus]);
  useEffect(() => { if (vendorsStatus === 'idle') dispatch(fetchVendors()); }, [dispatch, vendorsStatus]);
  useEffect(() => { if (usersStatus === 'idle') dispatch(fetchUsers()); }, [dispatch, usersStatus]);
  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const reload = useCallback(() => {
    dispatch(fetchSalesOfficers());
    dispatch(fetchVendors());
    dispatch(fetchUsers());
    loadPurchases();
  }, [dispatch, loadPurchases]);

  const userById = useMemo(() => {
    const map = new Map();
    (users || []).forEach((u) => { const base = u?.user || u || {}; if (base._id) map.set(String(base._id), base); });
    return map;
  }, [users]);

  const vendorsByOfficer = useMemo(() => {
    const map = new Map();
    (vendors || []).forEach((v) => {
      const officerId = idOf(v.assigned_sales_officer);
      if (!officerId) return;
      map.set(officerId, [...(map.get(officerId) || []), v]);
    });
    return map;
  }, [vendors]);

  const purchasesByVendor = useMemo(() => {
    const map = new Map();
    purchases.items.forEach((p) => {
      const vid = idOf(p.vendor_id);
      if (vid) map.set(vid, [...(map.get(vid) || []), p]);
    });
    return map;
  }, [purchases.items]);

  return {
    officers: officers || [],
    officersStatus,
    officersError,
    vendors: vendors || [],
    vendorsStatus,
    userById,
    vendorsByOfficer,
    purchases,
    purchasesByVendor,
    reload,
  };
}

const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Package revenue from a set of vendors, all-time and this month.
export const portfolioRevenue = (vendorList, purchasesByVendor) => {
  const monthStart = startOfMonth();
  let total = 0;
  let month = 0;
  vendorList.forEach((v) => {
    (purchasesByVendor.get(String(v._id)) || []).forEach((p) => {
      const amount = Number(p.amount_paid) || 0;
      total += amount;
      if (new Date(p.purchased_at || p.createdAt).getTime() >= monthStart) month += amount;
    });
  });
  return { total, month };
};

export const inrCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
