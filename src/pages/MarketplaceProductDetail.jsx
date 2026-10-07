import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, Check, CheckCircle2, ChevronLeft, Copy, Globe, EyeOff, Images, Loader2, Package, Tag, Truck, X } from 'lucide-react';
import MarketplaceSellerPanel from '../components/MarketplaceSellerPanel.jsx';
import { PRODUCT_STATUS, inr } from '../components/MarketplaceKit.jsx';
import { fetchAdminOrders, fetchMarketplaceProduct } from '../store/marketplaceSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const LOW_STOCK = 5;
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || '') : ref ? String(ref) : '');
const isCssColor = (c) => !!c && typeof CSS !== 'undefined' && CSS.supports?.('color', c);

const Card = ({ title, aside, children, className }) => (
  <section className={clsx('rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
    {title && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-bold text-neutral-900">{title}</h2>
        {aside}
      </div>
    )}
    {children}
  </section>
);

const Tile = ({ label, children }) => (
  <div className="min-w-0 rounded-xl bg-[#F1F3FC] px-3.5 py-3 transition hover:bg-[#E9EBFA]">
    <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
    <div className="mt-1 break-words text-[13.5px] font-bold text-neutral-900">{children ?? '—'}</div>
  </div>
);

const YesNo = ({ value }) => (value
  ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3.5 w-3.5" />Yes</span>
  : <span className="inline-flex items-center gap-1 text-neutral-500"><X className="h-3.5 w-3.5" />No</span>);

const InfoRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
    <span className="text-neutral-500">{label}</span>
    <span className="text-right font-semibold text-neutral-800">{children}</span>
  </div>
);

const Gallery = ({ images, status }) => {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState({});
  useEffect(() => { setActive(0); }, [images]);
  const urls = images.map((img) => toAbsoluteMediaUrl(img.fileUrl || img.fileName));
  const current = urls[active];
  const st = PRODUCT_STATUS[status] || PRODUCT_STATUS.inactive;
  return (
    <div className="bg-[#EEF0FA]">
      <div className="relative flex h-80 items-center justify-center overflow-hidden sm:h-[360px]">
        {current && !failed[active] ? <img src={current} alt="" onError={() => setFailed((f) => ({ ...f, [active]: true }))} className="h-full w-full object-contain transition-transform duration-500 hover:scale-105" />
          : <Package className="h-14 w-14 text-neutral-300" />}
        <span className={clsx('absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow-sm', st.cls.split(' ').find((c) => c.startsWith('text-')))}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
        </span>
      </div>
      {urls.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto bg-white px-5 py-4">
          {urls.map((url, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} className={clsx('h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition', i === active ? 'border-[#E8194E] shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]' : 'border-transparent opacity-70 hover:opacity-100')}>
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MarketplaceProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { item: product, status, error } = useSelector((s) => s.marketplace.product);
  const orders = useSelector((s) => s.marketplace.orders);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (id) dispatch(fetchMarketplaceProduct(id)); }, [dispatch, id]);

  const sellerId = idOf(product?.user_id);
  useEffect(() => { if (sellerId) dispatch(fetchAdminOrders({ seller: sellerId })); }, [dispatch, sellerId]);

  // This product's line items on paid, non-cancelled orders.
  const sales = useMemo(() => {
    let units = 0;
    let revenue = 0;
    const orderIds = new Set();
    (orders.items || []).forEach((o) => {
      if (o.payment_status !== 'paid' || o.order_status === 'cancelled') return;
      (o.items || []).forEach((item) => {
        if (idOf(item.product_id) !== String(id)) return;
        units += Number(item.quantity) || 0;
        revenue += Number(item.subtotal) || 0;
        orderIds.add(String(o._id));
      });
    });
    return { units, revenue, orders: orderIds.size };
  }, [orders.items, id]);

  const isLoading = status === 'idle' || status === 'loading';
  const back = (
    <button type="button" onClick={() => navigate('/marketplace/products')} className="group inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-700 hover:text-[#C81345]">
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to All Products
    </button>
  );

  if (isLoading || error || !product) {
    return (
      <div className="space-y-6">
        {back}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {isLoading ? <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading product…</p></>
            : <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this product</p><p className="text-sm">{error || 'Not found'}</p></>}
        </div>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const highlights = Array.isArray(product.key_highlights) ? product.key_highlights.filter(Boolean) : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const dims = product.dimensions;
  const mrp = Number(product.mrp) || 0;
  const price = Number(product.selling_price) || 0;
  const stock = Number(product.stock_quantity) || 0;
  const discount = product.discount ?? (mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const st = PRODUCT_STATUS[product.status] || PRODUCT_STATUS.inactive;
  const isLive = product.status === 'active';
  const variantStock = variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);

  const copyId = () => {
    navigator.clipboard?.writeText(String(product._id)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">
          Product status:
          <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] normal-case tracking-normal', isLive ? 'bg-pink-50 text-[#C81345]' : st.cls)}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', isLive ? 'animate-pulse bg-[#E8194E]' : st.dot)} />{isLive ? 'Live on Marketplace' : st.label}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Gallery images={images} status={product.status} />
            <div className="border-t border-neutral-100 px-5 py-5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-neutral-500">
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8E35B5]"><Tag className="h-3 w-3" />{product.category || 'Uncategorized'}</span>
                {product.brand && <><span className="text-neutral-300">·</span><span>Brand: <b className="font-semibold text-neutral-700">{product.brand}</b></span></>}
                {product.seller_sku && <><span className="text-neutral-300">·</span><span className="font-mono">SKU: {product.seller_sku}</span></>}
              </div>
              <h1 className="mt-2 font-display text-[22px] font-bold tracking-tight text-neutral-900">{product.name}</h1>
              <div className="mt-3 flex items-end gap-2.5">
                <p className="font-display text-[26px] font-extrabold leading-none text-neutral-900">{inr(price)}</p>
                {mrp > price && <p className="text-[14px] text-neutral-400 line-through">{inr(mrp)}</p>}
                {discount > 0 && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">{discount}% off</span>}
              </div>
            </div>
          </section>

          <Card title="Description" aside={product.brand && <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{product.brand}</span>}>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-neutral-700">{product.short_description || 'No description provided.'}</p>
            {highlights.length > 0 && (
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-neutral-700">Key Highlights</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-[#F1F3FC] px-3 py-2.5 text-[12.5px] font-medium text-neutral-800 transition hover:bg-[#E9EBFA]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 fill-emerald-500 text-white" />{h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Price & Inventory" aside={<span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Updated {formatDateTime(product.updatedAt)}</span>}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Tile label="MRP">{inr(mrp)}</Tile>
              <Tile label="Selling price">{inr(price)}</Tile>
              <Tile label="Discount">{discount > 0 ? <>{discount}% <span className="text-[11.5px] font-medium text-neutral-500">({inr(mrp - price)} off)</span></> : '—'}</Tile>
              <Tile label="Stock">
                <span className="inline-flex items-center gap-1.5">
                  <span className={clsx('h-2 w-2 rounded-full', stock === 0 ? 'bg-rose-500' : stock <= LOW_STOCK ? 'bg-amber-500' : 'bg-emerald-500')} />
                  {formatNumber(stock)} units <span className="text-[11.5px] font-medium text-neutral-500">({stock === 0 ? 'out of stock' : stock <= LOW_STOCK ? 'low' : 'in stock'})</span>
                </span>
              </Tile>
              <Tile label="Track inventory">{product.track_inventory !== false ? 'Yes' : 'No'}</Tile>
              <Tile label="HSN / GST">{product.hsn_gst || '—'}</Tile>
            </div>
          </Card>

          {variants.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">Variants <span className="rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{variants.length} available</span></h2>
                <p className="text-[11.5px] text-neutral-500">{formatNumber(variantStock)} units across variants</p>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                    {['Color', 'Size', 'Price', 'Stock'].map((h, i) => <th key={h} className={clsx('px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700', i === 3 && 'text-right')}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {variants.map((v, i) => {
                    const vs = Number(v.stock_quantity) || 0;
                    return (
                      <tr key={i} className="transition-colors hover:bg-[#FDF2F6]">
                        <td className="px-5 py-3 text-[13px] font-medium text-neutral-800">
                          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: isCssColor(v.color) ? v.color : '#CBD0E6' }} />{v.color || '—'}</span>
                        </td>
                        <td className="px-5 py-3">{v.size ? <span className="inline-flex min-w-[32px] justify-center rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[11.5px] font-bold text-neutral-800">{v.size}</span> : <span className="text-neutral-400">—</span>}</td>
                        <td className="px-5 py-3 text-[13px] text-neutral-700">{v.price ? inr(v.price) : inr(price)}</td>
                        <td className={clsx('px-5 py-3 text-right text-[13px] font-bold', vs === 0 ? 'text-rose-600' : vs <= LOW_STOCK ? 'text-[#E8194E]' : 'text-neutral-900')}>
                          {formatNumber(vs)}{vs === 0 ? ' (Out)' : vs <= LOW_STOCK ? ' (Low)' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <Card title="Delivery & Returns" aside={<Truck className="h-4 w-4 text-[#E8194E]" />}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Tile label="Package weight">{product.package_weight != null ? `${product.package_weight} ${product.weight_unit || 'kg'}` : '—'}</Tile>
              <Tile label="Dimensions (L×W×H)">{dims ? `${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || 'cm'}` : '—'}</Tile>
              <Tile label="Dispatch time">{product.dispatch_time || '—'}</Tile>
              <Tile label="Country of origin">{product.country_of_origin || '—'}</Tile>
              <Tile label="Return policy">{product.return_policy || '—'}</Tile>
              <Tile label="Warranty">{product.warranty || '—'}</Tile>
              <Tile label="Store delivery settings"><YesNo value={product.use_store_delivery_settings} /></Tile>
              <Tile label="Store return policy"><YesNo value={product.use_store_return_policy} /></Tile>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <MarketplaceSellerPanel listing={product} listLabel="All products" listHref={(sid) => `/marketplace/influencers/${sid}/products`} />

          <Card title="Listing Info">
            <div className="divide-y divide-neutral-100">
              <InfoRow label="Product ID">
                <button type="button" onClick={copyId} title="Copy ID" className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F3FC] px-2 py-1 font-mono text-[11px] text-neutral-800 hover:bg-[#E9EBFA]">
                  {String(product._id).slice(-10)}{copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-neutral-500" />}
                </button>
              </InfoRow>
              <InfoRow label="Listed">{formatDateTime(product.createdAt)}</InfoRow>
              <InfoRow label="Updated">{formatDateTime(product.updatedAt)}</InfoRow>
              <InfoRow label="Images"><span className="inline-flex items-center gap-1"><Images className="h-3.5 w-3.5 text-neutral-500" />{images.length} uploaded</span></InfoRow>
              <InfoRow label="Visibility">
                {isLive ? <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-[#8E35B5]"><Globe className="h-3 w-3" />Public Marketplace</span>
                  : <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600"><EyeOff className="h-3 w-3" />Hidden from buyers</span>}
              </InfoRow>
            </div>
          </Card>

          <Card title="Sales Performance" aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Paid orders</span>}>
            {orders.status === 'loading' && !orders.items.length ? <p className="text-[12.5px] text-neutral-400">Loading sales…</p> : (
              <div className="grid grid-cols-3 gap-2">
                <Tile label="Revenue">{inr(sales.revenue)}</Tile>
                <Tile label="Units">{formatNumber(sales.units)}</Tile>
                <Tile label="Orders">{formatNumber(sales.orders)}</Tile>
              </div>
            )}
            {sales.orders > 0 && (
              <button type="button" onClick={() => navigate(`/marketplace/orders?seller=${sellerId}`)} className="mt-3 text-[12px] font-bold text-[#C81345] hover:underline">View seller's orders →</button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceProductDetail;
