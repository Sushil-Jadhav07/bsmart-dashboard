import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Package, ShieldCheck, ShieldOff, ShoppingCart, Store, Users, Wrench } from 'lucide-react';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { Avatar, SuspendInfluencerModal, Toast, humanize } from '../components/MarketplaceShared.jsx';
import useInfluencerSuspension from '../hooks/useInfluencerSuspension.js';
import { fetchInfluencers } from '../store/marketplaceSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';

const toRow = (user) => {
  const profile = user.influencer_profile || {};
  return {
    id: String(user._id),
    storeName: profile.store_name || `${user.full_name || user.username || 'Unnamed'}'s Store`,
    username: user.username || '',
    fullName: user.full_name || '-',
    avatar: user.avatar_url || '',
    email: user.email || '-',
    businessType: profile.business_type || '',
    accountActive: user.is_active !== false,
    isSuspended: !!profile.is_suspended,
    suspensionReason: profile.suspension_reason || '',
    suspendedAt: profile.suspended_at || null,
    createdAt: user.createdAt,
  };
};

const MarketplaceInfluencers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((s) => s.marketplace.influencers);
  const [search, setSearch] = useState('');
  const [sellingFilter, setSellingFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const suspension = useInfluencerSuspension();

  useEffect(() => { dispatch(fetchInfluencers()); }, [dispatch]);

  const rows = useMemo(() => items.map(toRow), [items]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.storeName, row.username, row.fullName, row.email, row.businessType]
        .some((value) => String(value || '').toLowerCase().includes(query));
      const matchesSelling = sellingFilter === 'all' || (sellingFilter === 'suspended' ? row.isSuspended : !row.isSuspended);
      const matchesAccount = accountFilter === 'all' || (accountFilter === 'active' ? row.accountActive : !row.accountActive);
      return matchesSearch && matchesSelling && matchesAccount;
    });
  }, [rows, search, sellingFilter, accountFilter]);

  const suspendedCount = rows.filter((row) => row.isSuspended).length;

  const openSuspension = (row) => suspension.open({
    id: row.id,
    name: row.storeName,
    username: row.username,
    isSuspended: row.isSuspended,
    suspensionReason: row.suspensionReason,
  });

  return (
    <>
      <PremiumResourcePage
        eyebrow="Marketplace"
        title="Influencers"
        description="Every influencer storefront on the platform. Suspend selling privileges without banning the account — suspended influencers keep member access but can't create or edit listings."
        metrics={[
          { label: 'Total Influencers', value: formatNumber(rows.length), icon: Users, tone: 'magenta' },
          { label: 'Selling Active', value: formatNumber(rows.length - suspendedCount), icon: ShieldCheck, tone: 'emerald' },
          { label: 'Suspended', value: formatNumber(suspendedCount), icon: ShieldOff, tone: 'rose' },
          { label: 'Account Banned', value: formatNumber(rows.filter((row) => !row.accountActive).length), icon: Store, tone: 'violet' },
        ]}
        rows={filteredRows}
        columns={[
          {
            key: 'storeName',
            title: 'Store',
            render: (value, row) => (
              <button type="button" onClick={() => navigate(`/users/${row.id}`)} className="flex items-center gap-3 min-w-0 text-left group/cell">
                <Avatar src={row.avatar} name={value} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-950 group-hover/cell:text-primary transition-colors">{value}</p>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500">@{row.username}</p>
                </div>
              </button>
            ),
          },
          { key: 'fullName', title: 'Owner' },
          { key: 'email', title: 'Email' },
          {
            key: 'businessType',
            title: 'Business Type',
            render: (value) => (value ? <PremiumBadge tone="violet">{humanize(value)}</PremiumBadge> : <span className="text-neutral-400">-</span>),
          },
          {
            key: 'isSuspended',
            title: 'Selling',
            render: (value, row) => (
              <div className="max-w-[220px]">
                <PremiumBadge tone={value ? 'rose' : 'emerald'} dot>{value ? 'Suspended' : 'Active'}</PremiumBadge>
                {value && row.suspensionReason && (
                  <p className="mt-1 truncate text-[11px] text-neutral-500" title={row.suspensionReason}>{row.suspensionReason}</p>
                )}
              </div>
            ),
          },
          {
            key: 'accountActive',
            title: 'Account',
            render: (value) => <PremiumBadge tone={value ? 'emerald' : 'neutral'} dot>{value ? 'Active' : 'Banned'}</PremiumBadge>,
          },
          { key: 'createdAt', title: 'Joined', render: (value) => <span className="text-xs text-neutral-600">{formatDate(value)}</span> },
        ]}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search store, username, owner, or email..."
        filters={[
          {
            label: 'Selling',
            value: sellingFilter,
            onChange: setSellingFilter,
            options: [
              { value: 'all', label: 'All Selling States' },
              { value: 'active', label: 'Selling Active' },
              { value: 'suspended', label: 'Suspended' },
            ],
          },
          {
            label: 'Account',
            value: accountFilter,
            onChange: setAccountFilter,
            options: [
              { value: 'all', label: 'All Accounts' },
              { value: 'active', label: 'Active Accounts' },
              { value: 'banned', label: 'Banned Accounts' },
            ],
          },
        ]}
        actions={[
          { label: 'View profile', icon: Eye, onClick: (row) => navigate(`/users/${row.id}`) },
          { label: 'View products', icon: Package, onClick: (row) => navigate(`/marketplace/products?seller=${row.id}`) },
          { label: 'View services', icon: Wrench, onClick: (row) => navigate(`/marketplace/services?seller=${row.id}`) },
          { label: 'View orders', icon: ShoppingCart, onClick: (row) => navigate(`/marketplace/orders?seller=${row.id}`) },
          { label: 'Suspend selling', icon: ShieldOff, tone: 'rose', hidden: (row) => row.isSuspended, onClick: openSuspension },
          { label: 'Restore selling', icon: ShieldCheck, hidden: (row) => !row.isSuspended, onClick: openSuspension },
        ]}
        emptyMessage={status === 'loading' ? 'Loading influencers...' : error ? `Error: ${error}` : 'No influencers found'}
        rowKey={(row) => row.id}
      />

      <SuspendInfluencerModal
        influencer={suspension.target}
        onClose={suspension.close}
        onConfirm={suspension.confirm}
        loading={suspension.loading}
      />
      {suspension.toast && <Toast message={suspension.toast.message} tone={suspension.toast.tone} />}
    </>
  );
};

export default MarketplaceInfluencers;
