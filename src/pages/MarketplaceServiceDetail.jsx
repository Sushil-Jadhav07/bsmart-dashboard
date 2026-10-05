import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Clock, EyeOff, Tag, Wrench } from 'lucide-react';
import { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import MarketplaceSellerPanel from '../components/MarketplaceSellerPanel.jsx';
import {
  DetailShell, Highlights, ImageGallery, InfoTile, MetaRow, SectionCard, formatINR, humanize, listingStatusTone,
} from '../components/MarketplaceShared.jsx';
import { fetchMarketplaceService } from '../store/marketplaceSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MarketplaceServiceDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { item: service, status, error } = useSelector((s) => s.marketplace.service);

  useEffect(() => {
    if (id) dispatch(fetchMarketplaceService(id));
  }, [dispatch, id]);

  const images = Array.isArray(service?.images) ? service.images : [];
  const highlights = Array.isArray(service?.key_highlights) ? service.key_highlights.filter(Boolean) : [];
  const subservices = Array.isArray(service?.subservices) ? service.subservices : [];
  const availability = service?.weekly_availability || {};
  const visible = service?.visible_to_customers !== false;

  return (
    <DetailShell
      backLabel="Back to All Services"
      backPath="/marketplace/services"
      status={status}
      error={error}
      loadingLabel="Loading service…"
    >
      {service && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <ImageGallery images={images} fallbackIcon={Wrench} />
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-neutral-900">{service.name}</h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-neutral-500">
                      <span className="inline-flex items-center gap-1.5"><Tag className="w-4 h-4" />{service.category || 'Uncategorized'}</span>
                      {service.provider && <span>Provider: <span className="text-neutral-700">{service.provider}</span></span>}
                      {service.duration && <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" />{service.duration}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <PremiumBadge tone={listingStatusTone(service.status)} dot>{humanize(service.status)}</PremiumBadge>
                    {!visible && <PremiumBadge tone="neutral"><EyeOff className="h-3 w-3" /> Hidden</PremiumBadge>}
                  </div>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <p className="text-2xl font-bold text-neutral-900">{formatINR(service.price)}</p>
                  {service.rate_type && <p className="text-sm text-neutral-500 mb-1">{humanize(service.rate_type)}</p>}
                </div>
              </div>
            </div>

            <SectionCard title="Description">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{service.short_description || 'No description provided.'}</p>
              {highlights.length > 0 && (
                <div className="mt-5 pt-5 border-t border-neutral-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Key Highlights</p>
                  <Highlights items={highlights} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Pricing & Delivery" bodyClassName="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Price">{formatINR(service.price)}</InfoTile>
              <InfoTile label="Rate Type">{humanize(service.rate_type)}</InfoTile>
              <InfoTile label="Duration">{service.duration || '-'}</InfoTile>
              <InfoTile label="Service Method">{humanize(service.service_method)}</InfoTile>
              <InfoTile label="Visible to Customers">{visible ? 'Yes' : 'No'}</InfoTile>
            </SectionCard>

            {subservices.length > 0 && (
              <SectionCard title="Sub-services" count={subservices.length} bodyClassName="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      {['Name', 'Hours', 'Price'].map((h) => (
                        <th key={h} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {subservices.map((sub, index) => (
                      <tr key={index}>
                        <td className="px-6 py-3 text-sm text-neutral-700">{sub.name || '-'}</td>
                        <td className="px-6 py-3 text-sm text-neutral-700">{sub.hours || '-'}</td>
                        <td className="px-6 py-3 text-sm text-neutral-700">{sub.price ? formatINR(sub.price) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}

            <SectionCard title="Weekly Availability" bodyClassName="divide-y divide-neutral-100">
              {WEEKDAYS.map((day) => {
                const slots = Array.isArray(availability[day]) ? availability[day] : [];
                return (
                  <div key={day} className="px-6 py-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-neutral-700 capitalize w-28">{day}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {slots.length ? slots.map((slot, index) => (
                        <span key={index} className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {slot.start} – {slot.end}
                        </span>
                      )) : (
                        <span className="text-xs text-neutral-400">Unavailable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6">
            <MarketplaceSellerPanel listing={service} listPath="/marketplace/services" listLabel="All services" />
            <SectionCard title="Listing Info" bodyClassName="px-6 py-5 space-y-2">
              <MetaRow label="Service ID" value={service._id} />
              <MetaRow label="Listed" value={formatDateTime(service.createdAt)} />
              <MetaRow label="Updated" value={formatDateTime(service.updatedAt)} />
              <MetaRow label="Images" value={images.length} />
            </SectionCard>
          </div>
        </div>
      )}
    </DetailShell>
  );
};

export default MarketplaceServiceDetail;
