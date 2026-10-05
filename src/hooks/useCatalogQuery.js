import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchInfluencers } from '../store/marketplaceSlice.js';

// Filter state for the admin catalog pages. Every filter is sent to the server;
// `seller` is mirrored in the URL so the Influencers page can deep-link to it.
export default function useCatalogQuery({ fetchThunk, items }) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const influencersStatus = useSelector((s) => s.marketplace.influencers.status);
  const influencers = useSelector((s) => s.marketplace.influencers.items);

  const seller = searchParams.get('seller') || 'all';
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [knownCategories, setKnownCategories] = useState([]);

  useEffect(() => {
    if (influencersStatus === 'idle') dispatch(fetchInfluencers());
  }, [dispatch, influencersStatus]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // Abort the previous request so a slow, stale response can't overwrite a newer one.
    const request = dispatch(fetchThunk({ seller, status, category, q: debouncedSearch }));
    return () => request.abort();
  }, [dispatch, fetchThunk, seller, status, category, debouncedSearch]);

  // Categories come from the listings themselves; keep every one seen so the
  // option list doesn't collapse to a single entry once a category is selected.
  useEffect(() => {
    const found = items.map((item) => item?.category).filter(Boolean);
    setKnownCategories((prev) => {
      const merged = Array.from(new Set([...prev, ...found])).sort((a, b) => a.localeCompare(b));
      return merged.length === prev.length ? prev : merged;
    });
  }, [items]);

  const setSeller = (value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete('seller');
    else next.set('seller', value);
    setSearchParams(next, { replace: true });
  };

  const sellerOptions = useMemo(() => {
    const options = influencers
      .map((u) => ({
        value: String(u._id),
        label: `${u.influencer_profile?.store_name || u.full_name || u.username}${u.influencer_profile?.is_suspended ? ' (suspended)' : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (seller !== 'all' && !options.some((o) => o.value === seller)) {
      options.unshift({ value: seller, label: 'Selected seller' });
    }
    return [{ value: 'all', label: 'All Sellers' }, ...options];
  }, [influencers, seller]);

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
