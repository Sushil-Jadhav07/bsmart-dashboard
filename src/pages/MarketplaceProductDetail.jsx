import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Package, Tag } from 'lucide-react';
import { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import MarketplaceSellerPanel from '../components/MarketplaceSellerPanel.jsx';
import {
  DetailShell, Highlights, ImageGallery, InfoTile, MetaRow, SectionCard, formatINR, humanize, listingStatusTone,
} from '../components/MarketplaceShared.jsx';
import { fetchMarketplaceProduct } from '../store/marketplaceSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';

const yesNo = (value) => (value ? 'Yes' : 'No');

const MarketplaceProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { item: product, status, error } = useSelector((s) => s.marketplace.product);

  useEffect(() => {
    if (id) dispatch(fetchMarketplaceProduct(id));
  }, [dispatch, id]);

  const images = Array.isArray(product?.images) ? product.images : [];
  const highlights = Array.isArray(product?.key_highlights) ? product.key_highlights.filter(Boolean) : [];
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const dims = product?.dimensions;
  const discount = product?.discount ?? (product?.mrp > 0 && product?.selling_price < product?.mrp
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : null);

  return (
    <DetailShell
      backLabel="Back to All Products"
      backPath="/marketplace/products"
      status={status}
      error={error}
      loadingLabel="Loading product…"
    >
      {product && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <ImageGallery images={images} fallbackIcon={Package} />
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-neutral-900">{product.name}</h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-neutral-500">
                      <span className="inline-flex items-center gap-1.5"><Tag className="w-4 h-4" />{product.category || 'Uncategorized'}</span>
                      {product.brand && <span>Brand: <span className="text-neutral-700">{product.brand}</span></span>}
                      {product.seller_sku && <span>SKU: <span className="text-neutral-700">{product.seller_sku}</span></span>}
                    </div>
                  </div>
                  <PremiumBadge tone={listingStatusTone(product.status)} dot className="flex-shrink-0">{humanize(product.status)}</PremiumBadge>
                </div>
                <div className="mt-5 flex items-end gap-3">
                  <p className="text-2xl font-bold text-neutral-900">{formatINR(product.selling_price)}</p>
                  {product.mrp > product.selling_price && <p className="text-sm text-neutral-400 line-through mb-1">{formatINR(product.mrp)}</p>}
                  {discount > 0 && <PremiumBadge tone="emerald" className="mb-1">{discount}% off</PremiumBadge>}
                </div>
              </div>
            </div>

            <SectionCard title="Description">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{product.short_description || 'No description provided.'}</p>
              {highlights.length > 0 && (
                <div className="mt-5 pt-5 border-t border-neutral-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Key Highlights</p>
                  <Highlights items={highlights} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Price & Inventory" bodyClassName="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="MRP">{formatINR(product.mrp)}</InfoTile>
              <InfoTile label="Selling Price">{formatINR(product.selling_price)}</InfoTile>
              <InfoTile label="Discount">{discount > 0 ? `${discount}%` : '-'}</InfoTile>
              <InfoTile label="Stock">
                <span className={product.stock_quantity === 0 ? 'text-rose-600 font-semibold' : ''}>{formatNumber(product.stock_quantity ?? 0)}</span>
              </InfoTile>
              <InfoTile label="Track Inventory">{yesNo(product.track_inventory)}</InfoTile>
              <InfoTile label="HSN / GST">{product.hsn_gst || '-'}</InfoTile>
            </SectionCard>

            {variants.length > 0 && (
              <SectionCard title="Variants" count={variants.length} bodyClassName="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      {['Color', 'Size', 'Price', 'Stock'].map((h) => (
                        <th key={h} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {variants.map((v, index) => (
                      <tr key={index}>
                        <td className="px-6 py-3 text-sm text-neutral-700">{v.color || '-'}</td>
                        <td className="px-6 py-3 text-sm text-neutral-700">{v.size || '-'}</td>
                        <td className="px-6 py-3 text-sm text-neutral-700">{v.price ? formatINR(v.price) : '-'}</td>
                        <td className={clsx('px-6 py-3 text-sm', v.stock_quantity === 0 ? 'text-rose-600 font-semibold' : 'text-neutral-700')}>{formatNumber(v.stock_quantity ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}

            <SectionCard title="Delivery & Returns" bodyClassName="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Package Weight">{product.package_weight != null ? `${product.package_weight} ${product.weight_unit || 'kg'}` : '-'}</InfoTile>
              <InfoTile label="Dimensions (L×W×H)">{dims ? `${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || 'cm'}` : '-'}</InfoTile>
              <InfoTile label="Dispatch Time">{product.dispatch_time || '-'}</InfoTile>
              <InfoTile label="Country of Origin">{product.country_of_origin || '-'}</InfoTile>
              <InfoTile label="Return Policy">{product.return_policy || '-'}</InfoTile>
              <InfoTile label="Warranty">{product.warranty || '-'}</InfoTile>
              <InfoTile label="Store Delivery Settings">{yesNo(product.use_store_delivery_settings)}</InfoTile>
              <InfoTile label="Store Return Policy">{yesNo(product.use_store_return_policy)}</InfoTile>
            </SectionCard>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6">
            <MarketplaceSellerPanel listing={product} listPath="/marketplace/products" listLabel="All products" />
            <SectionCard title="Listing Info" bodyClassName="px-6 py-5 space-y-2">
              <MetaRow label="Product ID" value={product._id} />
              <MetaRow label="Listed" value={formatDateTime(product.createdAt)} />
              <MetaRow label="Updated" value={formatDateTime(product.updatedAt)} />
              <MetaRow label="Images" value={images.length} />
            </SectionCard>
          </div>
        </div>
      )}
    </DetailShell>
  );
};

export default MarketplaceProductDetail;
