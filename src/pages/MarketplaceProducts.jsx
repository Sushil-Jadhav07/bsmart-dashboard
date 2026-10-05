import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, FileEdit, Package, User } from 'lucide-react';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { SellerCell, Thumb, formatINR, humanize, listingStatusTone, sellerOf } from '../components/MarketplaceShared.jsx';
import useCatalogQuery from '../hooks/useCatalogQuery.js';
import { fetchAdminProducts } from '../store/marketplaceSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const MarketplaceProducts = () => {
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.products);
  const query = useCatalogQuery({ fetchThunk: fetchAdminProducts, items });

  const rows = useMemo(() => items.map((product) => {
    const seller = sellerOf(product);
    return {
      id: String(product._id),
      name: product.name || 'Untitled product',
      image: product.images?.[0]?.fileUrl || '',
      sku: product.seller_sku || '',
      brand: product.brand || '',
      seller: seller.storeName || seller.fullName || seller.username,
      sellerId: seller.id,
      category: product.category || '-',
      price: Number(product.selling_price) || 0,
      mrp: Number(product.mrp) || 0,
      stock: Number(product.stock_quantity) || 0,
      variantCount: product.variants?.length || 0,
      status: product.status || 'active',
      createdAt: product.createdAt,
      raw: product,
    };
  }), [items]);

  const count = (fn) => formatNumber(rows.filter(fn).length);

  return (
    <PremiumResourcePage
      eyebrow="Marketplace"
      title="All Products"
      description="Every influencer product listing across all sellers and statuses, including drafts and out-of-stock items."
      metrics={[
        { label: 'Matching Products', value: formatNumber(total), icon: Package, tone: 'magenta' },
        { label: 'Active', value: count((r) => r.status === 'active'), icon: CheckCircle2, tone: 'emerald' },
        { label: 'Draft / Inactive', value: count((r) => r.status === 'draft' || r.status === 'inactive'), icon: FileEdit, tone: 'violet' },
        { label: 'Out of Stock', value: count((r) => r.status === 'out_of_stock'), icon: AlertTriangle, tone: 'rose' },
      ]}
      rows={rows}
      columns={[
        {
          key: 'name',
          title: 'Product',
          render: (value, row) => (
            <button type="button" onClick={() => navigate(`/marketplace/products/${row.id}`)} className="flex items-center gap-3 min-w-0 text-left group/cell max-w-[280px]">
              <Thumb src={row.image} alt={value} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-950 group-hover/cell:text-primary transition-colors">{value}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">{[row.brand, row.sku && `SKU ${row.sku}`].filter(Boolean).join(' · ') || '-'}</p>
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
              {row.mrp > value && <p className="text-[11px] text-neutral-400 line-through">{formatINR(row.mrp)}</p>}
            </div>
          ),
        },
        {
          key: 'stock',
          title: 'Stock',
          render: (value, row) => (
            <div>
              <p className={`text-sm font-semibold ${value === 0 ? 'text-rose-600' : 'text-neutral-900'}`}>{formatNumber(value)}</p>
              {row.variantCount > 0 && <p className="text-[11px] text-neutral-400">{row.variantCount} variants</p>}
            </div>
          ),
        },
        { key: 'status', title: 'Status', render: (value) => <PremiumBadge tone={listingStatusTone(value)} dot>{humanize(value)}</PremiumBadge> },
        { key: 'createdAt', title: 'Listed', render: (value) => <span className="text-xs text-neutral-600">{formatDate(value)}</span> },
      ]}
      searchValue={query.search}
      onSearchChange={query.setSearch}
      searchPlaceholder="Search name, description, brand, category, or SKU..."
      filters={[
        { label: 'Seller', value: query.seller, onChange: query.setSeller, options: query.sellerOptions },
        { label: 'Status', value: query.status, onChange: query.setStatus, options: STATUS_OPTIONS },
        { label: 'Category', value: query.category, onChange: query.setCategory, options: query.categoryOptions },
      ]}
      actions={[
        { label: 'View details', icon: Eye, onClick: (row) => navigate(`/marketplace/products/${row.id}`) },
        { label: 'View seller', icon: User, hidden: (row) => !row.sellerId, onClick: (row) => navigate(`/users/${row.sellerId}`) },
      ]}
      emptyMessage={loadStatus === 'loading' ? 'Loading products...' : error ? `Error: ${error}` : 'No products found'}
      rowKey={(row) => row.id}
    />
  );
};

export default MarketplaceProducts;
