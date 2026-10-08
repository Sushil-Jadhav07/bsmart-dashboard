import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle2, Download, FilePenLine, Package, ShieldOff, Store, Users } from 'lucide-react';
import {
  Chip, Delta, GradientButton, OutlineButton, PageHeader, Pager, PRODUCT_STATUS, RefreshButton, SearchInput, Select, StatCard, StateRow, StatusPill, Th, inr,
} from '../components/MarketplaceKit.jsx';
import { sellerOf } from '../components/MarketplaceShared.jsx';
import useCatalogQuery from '../hooks/useCatalogQuery.js';
import { fetchAdminProducts } from '../store/marketplaceSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { prefRows } from '../utils/consolePrefs.js';

const STATUS_OPTIONS = [{ value: 'all', label: 'All Statuses' }, ...Object.entries(PRODUCT_STATUS).map(([value, s]) => ({ value, label: s.label }))];

const Thumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
        : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-neutral-300" /></div>}
    </div>
  );
};

const SellerAvatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
    : <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>;
};

const MarketplaceProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.products);
  const query = useCatalogQuery({ fetchThunk: fetchAdminProducts, items });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(10));

  const rows = useMemo(() => items.map((product) => {
    const seller = sellerOf(product);
    const price = Number(product.selling_price) || 0;
    const mrp = Number(product.mrp) || 0;
    const stock = Number(product.stock_quantity) || 0;
    const status = product.status || 'active';
    return {
      id: String(product._id),
      name: product.name || 'Untitled product',
      image: product.images?.[0]?.fileUrl ? toAbsoluteMediaUrl(product.images[0].fileUrl) : '',
      sku: product.seller_sku || '',
      brand: product.brand || '',
      sellerId: seller.id,
      sellerName: seller.storeName || seller.fullName || seller.username || 'Unknown seller',
      sellerUsername: seller.username,
      sellerAvatar: seller.avatar ? toAbsoluteMediaUrl(seller.avatar) : '',
      sellerSuspended: seller.isSuspended,
      category: product.category || '',
      price,
      mrp,
      stock,
      variantCount: product.variants?.length || 0,
      status,
      outOfStock: status === 'out_of_stock' || (product.track_inventory !== false && stock === 0 && status === 'active'),
      createdAt: product.createdAt,
    };
  }), [items]);

  useEffect(() => { setPage(1); }, [query.seller, query.status, query.category, query.search]);

  const stats = useMemo(() => {
    const added30 = rows.filter((r) => new Date(r.createdAt).getTime() > Date.now() - 30 * DAY_MS).length;
    const base = rows.length - added30;
    const out = rows.filter((r) => r.outOfStock);
    return {
      growth: base > 0 ? (added30 / base) * 100 : null,
      active: rows.filter((r) => r.status === 'active').length,
      unpublished: rows.filter((r) => r.status === 'draft' || r.status === 'inactive').length,
      out: out.length,
      outSellers: new Set(out.map((r) => r.sellerId)).size,
    };
  }, [rows]);
  const pct = (n) => (rows.length ? `${((n / rows.length) * 100).toFixed(1)}%` : '0%');

  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => downloadCsv(`marketplace-products-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Product ID', 'Name', 'Brand', 'SKU', 'Seller', 'Seller username', 'Category', 'Selling price (INR)', 'MRP (INR)', 'Stock', 'Variants', 'Status', 'Listed'],
    ...rows.map((r) => [r.id, r.name, r.brand, r.sku, r.sellerName, r.sellerUsername, r.category, r.price, r.mrp, r.stock, r.variantCount, PRODUCT_STATUS[r.status]?.label || r.status, r.createdAt ? new Date(r.createdAt).toISOString() : '']),
  ]);

  const refresh = () => dispatch(fetchAdminProducts({ seller: query.seller, status: query.status, category: query.category, q: query.search }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Marketplace" section="Catalog Governance" title="All Products" description="Every influencer product listing across all sellers and statuses, including drafts and out-of-stock items.">
        <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export CSV</OutlineButton>
        <GradientButton icon={Users} onClick={() => navigate('/marketplace/influencers')}>Sellers</GradientButton>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Matching Products" value={formatNumber(total)} icon={Package} tone="pink" foot={<><Delta value={stats.growth} /> vs last 30d</>} />
        <StatCard label="Active" value={formatNumber(stats.active)} icon={CheckCircle2} tone="purple" foot={<><Chip tone="lavender">{pct(stats.active)}</Chip> live on storefronts</>} />
        <StatCard label="Draft / Inactive" value={formatNumber(stats.unpublished)} icon={FilePenLine} tone="violet" foot={<><Chip tone="purple">{pct(stats.unpublished)}</Chip> not visible to buyers</>} />
        <StatCard label="Out of Stock" value={formatNumber(stats.out)} icon={AlertTriangle} tone="rose" valueClass="text-[#E8194E]" foot={<>{stats.out > 0 && <Chip tone="rose">Needs restock</Chip>} across {formatNumber(stats.outSellers)} seller{stats.outSellers === 1 ? '' : 's'}</>} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchInput value={query.search} onChange={query.setSearch} placeholder="Search name, description, brand, category, or SKU…" />
          <Select value={query.seller} onChange={query.setSeller} options={query.sellerOptions} className="min-w-[200px]" />
          <Select value={query.status} onChange={query.setStatus} options={STATUS_OPTIONS} />
          <Select value={query.category} onChange={query.setCategory} options={query.categoryOptions} />
          <RefreshButton onClick={refresh} spinning={loadStatus === 'loading'} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead>
              <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                {['Product', 'Seller', 'Category', 'Price', 'Stock', 'Status', 'Listed'].map((h) => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loadStatus === 'loading' && !rows.length ? <StateRow colSpan={7} loading message="Loading products…" />
                : !visible.length ? <StateRow colSpan={7} icon={Package} message={error ? `Error: ${error}` : 'No products found'} />
                  : visible.map((r) => {
                    const st = PRODUCT_STATUS[r.status] || PRODUCT_STATUS.inactive;
                    return (
                      <tr key={r.id} onClick={() => navigate(`/marketplace/products/${r.id}`)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Thumb src={r.image} />
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.name}</p>
                              <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-neutral-500">{[r.brand, r.sku && `SKU ${r.sku}`].filter(Boolean).join(' · ') || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); if (r.sellerId) navigate(`/marketplace/influencers/${r.sellerId}/products`); }} className="flex min-w-0 items-center gap-2 text-left">
                            <SellerAvatar src={r.sellerAvatar} name={r.sellerName} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5">
                                <span className={clsx('max-w-[140px] truncate text-[12.5px] font-semibold hover:text-[#C81345]', r.sellerSuspended ? 'text-neutral-500 line-through' : 'text-neutral-900')}>{r.sellerName}</span>
                                {r.sellerSuspended && <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 px-1 py-0.5 text-[9.5px] font-bold text-rose-700"><ShieldOff className="h-2.5 w-2.5" />Suspended</span>}
                              </p>
                              {r.sellerUsername && <p className="max-w-[160px] truncate text-[10.5px] text-neutral-500">@{r.sellerUsername}</p>}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">{r.category ? <span className="inline-flex max-w-[110px] rounded-lg bg-[#E9EBFA] px-2 py-1 text-[11px] font-semibold leading-tight text-neutral-800">{r.category}</span> : <span className="text-neutral-400">—</span>}</td>
                        <td className="px-4 py-3">
                          <p className="text-[13.5px] font-extrabold text-neutral-900">{inr(r.price)}</p>
                          {r.mrp > r.price && <p className="text-[11px] text-neutral-400 line-through">{inr(r.mrp)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className={clsx('text-[13.5px] font-extrabold', r.outOfStock ? 'text-rose-600' : 'text-neutral-900')}>{formatNumber(r.stock)}</p>
                          <p className={clsx('text-[10.5px]', r.outOfStock ? 'font-semibold text-rose-500' : 'text-neutral-500')}>{r.outOfStock ? 'Out of stock' : r.variantCount ? `${r.variantCount} variant${r.variantCount === 1 ? '' : 's'}` : 'No variants'}</p>
                        </td>
                        <td className="px-4 py-3"><StatusPill cls={st.cls} dot={st.dot}>{st.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[12px] text-neutral-600">{formatDate(r.createdAt)}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={rows.length} noun="listings"
          extra={total > rows.length && <span className="text-amber-700">· newest {formatNumber(rows.length)} loaded, narrow filters for older</span>} />
      </div>

      {query.seller !== 'all' && (
        <p className="flex items-center gap-1.5 text-[12px] text-neutral-500"><Store className="h-3.5 w-3.5" /> Filtered to one seller. <button type="button" onClick={() => navigate(`/marketplace/influencers/${query.seller}/products`)} className="font-bold text-[#C81345] hover:underline">Open their catalog dashboard</button></p>
      )}
    </div>
  );
};

export default MarketplaceProducts;
