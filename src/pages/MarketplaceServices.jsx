import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, EyeOff, Eye, FileEdit, User, Wrench } from 'lucide-react';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { SellerCell, Thumb, formatINR, humanize, listingStatusTone, sellerOf } from '../components/MarketplaceShared.jsx';
import useCatalogQuery from '../hooks/useCatalogQuery.js';
import { fetchAdminServices } from '../store/marketplaceSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
];

const MarketplaceServices = () => {
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.services);
  const query = useCatalogQuery({ fetchThunk: fetchAdminServices, items });

  const rows = useMemo(() => items.map((service) => {
    const seller = sellerOf(service);
    return {
      id: String(service._id),
      name: service.name || 'Untitled service',
      image: service.images?.[0]?.fileUrl || '',
      provider: service.provider || '',
      duration: service.duration || '',
      seller: seller.storeName || seller.fullName || seller.username,
      sellerId: seller.id,
      category: service.category || '-',
      price: Number(service.price) || 0,
      rateType: service.rate_type || '',
      method: service.service_method || '',
      visible: service.visible_to_customers !== false,
      status: service.status || 'active',
      createdAt: service.createdAt,
      raw: service,
    };
  }), [items]);

  const count = (fn) => formatNumber(rows.filter(fn).length);

  return (
    <PremiumResourcePage
      eyebrow="Marketplace"
      title="All Services"
      description="Every influencer service listing across all sellers and statuses, including drafts and hidden services."
      metrics={[
        { label: 'Matching Services', value: formatNumber(total), icon: Wrench, tone: 'magenta' },
        { label: 'Active', value: count((r) => r.status === 'active'), icon: CheckCircle2, tone: 'emerald' },
        { label: 'Draft / Inactive', value: count((r) => r.status !== 'active'), icon: FileEdit, tone: 'violet' },
        { label: 'Hidden', value: count((r) => !r.visible), icon: EyeOff, tone: 'rose' },
      ]}
      rows={rows}
      columns={[
        {
          key: 'name',
          title: 'Service',
          render: (value, row) => (
            <button type="button" onClick={() => navigate(`/marketplace/services/${row.id}`)} className="flex items-center gap-3 min-w-0 text-left group/cell max-w-[280px]">
              <Thumb src={row.image} alt={value} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-950 group-hover/cell:text-primary transition-colors">{value}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">{[row.provider, row.duration].filter(Boolean).join(' · ') || '-'}</p>
              </div>
            </button>
          ),
        },
        {
          key: 'seller',
          title: 'Seller',
          render: (_, row) => <SellerCell listing={row.raw} onClick={() => row.sellerId && query.setSeller(row.sellerId)} />,
        },
        { key: 'category', title: 'Category', render: (value) => <PremiumBadge tone="neutral">{value}</PremiumBadge> },
        {
          key: 'price',
          title: 'Price',
          render: (value, row) => (
            <div>
              <p className="text-sm font-semibold text-neutral-900">{formatINR(value)}</p>
              {row.rateType && <p className="text-[11px] text-neutral-400">{humanize(row.rateType)}</p>}
            </div>
          ),
        },
        { key: 'method', title: 'Method', render: (value) => <span className="text-xs text-neutral-600">{humanize(value)}</span> },
        {
          key: 'status',
          title: 'Status',
          render: (value, row) => (
            <div className="flex flex-col items-start gap-1">
              <PremiumBadge tone={listingStatusTone(value)} dot>{humanize(value)}</PremiumBadge>
              {!row.visible && <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400"><EyeOff className="h-3 w-3" /> Hidden</span>}
            </div>
          ),
        },
        { key: 'createdAt', title: 'Listed', render: (value) => <span className="text-xs text-neutral-600">{formatDate(value)}</span> },
      ]}
      searchValue={query.search}
      onSearchChange={query.setSearch}
      searchPlaceholder="Search name, description, category, or provider..."
      filters={[
        { label: 'Seller', value: query.seller, onChange: query.setSeller, options: query.sellerOptions },
        { label: 'Status', value: query.status, onChange: query.setStatus, options: STATUS_OPTIONS },
        { label: 'Category', value: query.category, onChange: query.setCategory, options: query.categoryOptions },
      ]}
      actions={[
        { label: 'View details', icon: Eye, onClick: (row) => navigate(`/marketplace/services/${row.id}`) },
        { label: 'View seller', icon: User, hidden: (row) => !row.sellerId, onClick: (row) => navigate(`/users/${row.sellerId}`) },
      ]}
      emptyMessage={loadStatus === 'loading' ? 'Loading services...' : error ? `Error: ${error}` : 'No services found'}
      rowKey={(row) => row.id}
    />
  );
};

export default MarketplaceServices;
