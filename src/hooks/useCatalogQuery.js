import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchInfluencers } from '../store/marketplaceSlice.js';

// A filter value mirrored in the URL query string, so other pages can deep-link to it.
export function useUrlParam(key) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) || 'all';
  const setValue = (next) => {
    const params = new URLSearchParams(searchParams);
    if (!next || next === 'all') params.delete(key);
    else params.set(key, next);
    setSearchParams(params, { replace: true });
  };
  return [value, setValue];
}

export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Dispatches a list thunk whenever its params change, aborting the previous
// request so a slow, stale response can't overwrite a newer one.
export function useAbortableFetch(fetchThunk, params) {
  const dispatch = useDispatch();
  const key = JSON.stringify(params);
  useEffect(() => {
    const request = dispatch(fetchThunk(JSON.parse(key)));
    return () => request.abort();
  }, [dispatch, fetchThunk, key]);
}

// Dropdown options for every influencer, loading the list on first use.
export function useSellerOptions(selected) {
  const dispatch = useDispatch();
  const influencersStatus = useSelector((s) => s.marketplace.influencers.status);
  const influencers = useSelector((s) => s.marketplace.influencers.items);

  useEffect(() => {
    if (influencersStatus === 'idle') dispatch(fetchInfluencers());
  }, [dispatch, influencersStatus]);

  return useMemo(() => {
    const options = influencers
      .map((u) => ({
        value: String(u._id),
        label: `${u.influencer_profile?.store_name || u.full_name || u.username}${u.influencer_profile?.is_suspended ? ' (suspended)' : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (selected !== 'all' && !options.some((o) => o.value === selected)) {
      options.unshift({ value: selected, label: 'Selected seller' });
    }
    return [{ value: 'all', label: 'All Sellers' }, ...options];
  }, [influencers, selected]);
}

// Filter state for the admin catalog pages. Every filter is sent to the server.
export default function useCatalogQuery({ fetchThunk, items }) {
  const [seller, setSeller] = useUrlParam('seller');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [knownCategories, setKnownCategories] = useState([]);
  const sellerOptions = useSellerOptions(seller);

  useAbortableFetch(fetchThunk, { seller, status, category, q: debouncedSearch });

  // Categories come from the listings themselves; keep every one seen so the
  // option list doesn't collapse to a single entry once a category is selected.
  useEffect(() => {
    const found = items.map((item) => item?.category).filter(Boolean);
    setKnownCategories((prev) => {
      const merged = Array.from(new Set([...prev, ...found])).sort((a, b) => a.localeCompare(b));
      return merged.length === prev.length ? prev : merged;
    });
  }, [items]);

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: 'All Categories' }, ...knownCategories.map((c) => ({ value: c, label: c }))],
    [knownCategories],
  );

  return {
    seller, setSeller,
    status, setStatus,
    category, setCategory,
    search, setSearch,
    sellerOptions, categoryOptions,
  };
}
