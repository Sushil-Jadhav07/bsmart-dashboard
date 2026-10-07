import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, ArrowLeft, CalendarClock, CalendarDays, Check, CheckCircle2, Clock, Copy, EyeOff, Globe, Images, Info, Layers, Loader2,
  MapPin, ShieldCheck, Store, Tag, User, Wrench,
} from 'lucide-react';
import MarketplaceSellerPanel from '../components/MarketplaceSellerPanel.jsx';
import { StatCard, inr } from '../components/MarketplaceKit.jsx';
import { humanize, sellerOf } from '../components/MarketplaceShared.jsx';
import { fetchMarketplaceService } from '../store/marketplaceSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const RATE_LABEL = { starting_from: 'Starting from', fixed: 'Fixed package', per_hour: 'Per hour', per_session: 'Per session' };
const METHOD_LABEL = { at_customer_location: 'At customer location', online: 'Online', at_my_location: "At creator's location" };
const METHOD_ICON = { at_customer_location: MapPin, online: Globe, at_my_location: Store };

const toMinutes = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};
const slotMinutes = (slot) => {
  const a = toMinutes(slot.start);
  const b = toMinutes(slot.end);
  return a !== null && b !== null && b > a ? b - a : 0;
};

const Card = ({ title, icon: Icon, aside, children, bodyClass = 'p-5' }) => (
  <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
    {title && (
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">{Icon && <Icon className="h-4 w-4 text-[#E8194E]" />}{title}</h2>
        {aside}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
    <span className="text-neutral-500">{label}</span>
    <span className="text-right font-semibold text-neutral-800">{children}</span>
  </div>
);

const Gallery = ({ images, category }) => {
  const [active, setActive] = useState(0);
  const urls = images.map((img) => toAbsoluteMediaUrl(img.fileUrl || img.fileName)).filter(Boolean);
  useEffect(() => { setActive(0); }, [images]);
  if (!urls.length) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 text-neutral-400">
        <Wrench className="h-10 w-10 text-[#8E35B5]/40" />
        <p className="text-[12px] font-medium">The creator hasn't uploaded portfolio images</p>
      </div>
    );
  }
  const others = urls.map((url, i) => ({ url, i })).filter((x) => x.i !== active).slice(0, 2);
  return (
    <div className={clsx('grid gap-3', others.length ? 'sm:grid-cols-[1.6fr_1fr]' : 'grid-cols-1')}>
      <div className="group relative h-72 overflow-hidden rounded-xl bg-[#EEF0FA] sm:h-[300px]">
        <img src={urls[active]} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <span className="rounded bg-[#E8194E] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">Asset {active + 1} of {urls.length}</span>
          {category && <p className="mt-1 text-[13px] font-bold text-white">{category}</p>}
        </div>
      </div>
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          {others.map(({ url, i }, idx) => (
            <button key={i} type="button" onClick={() => setActive(i)} className="group relative h-32 overflow-hidden rounded-xl bg-[#EEF0FA] sm:h-auto">
              <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              {idx === others.length - 1 && urls.length > 3 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[15px] font-bold text-white">+{urls.length - 3} more</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MarketplaceServiceDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { item: service, status, error } = useSelector((s) => s.marketplace.service);
  const influencers = useSelector((s) => s.marketplace.influencers.items);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (id) dispatch(fetchMarketplaceService(id)); }, [dispatch, id]);

  const isLoading = status === 'idle' || status === 'loading';
  const back = (name) => (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <Link to="/marketplace/services" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to Services</Link>
      <span className="text-neutral-300">/</span><span className="text-neutral-500">Marketplace</span>
      {name && <><span className="text-neutral-300">/</span><span className="font-semibold text-neutral-900">{name}</span></>}
    </nav>
  );

  if (isLoading || error || !service) {
    return (
      <div className="space-y-6">
        {back()}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {isLoading ? <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading service…</p></>
            : <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this service</p><p className="text-sm">{error || 'Not found'}</p></>}
        </div>
      </div>
    );
  }

  const seller = sellerOf(service);
  const sellerProfile = influencers.find((u) => String(u._id) === seller.id)?.influencer_profile;
  const sellerSuspended = !!sellerProfile?.is_suspended;
  const images = Array.isArray(service.images) ? service.images : [];
  const highlights = Array.isArray(service.key_highlights) ? service.key_highlights.filter(Boolean) : [];
  const packages = (Array.isArray(service.subservices) ? service.subservices : []).filter((s) => s?.name);
  const availability = service.weekly_availability || {};
  const days = WEEKDAYS.filter((d) => Array.isArray(availability[d]) && availability[d].length);
  const weeklyMinutes = WEEKDAYS.reduce((sum, d) => sum + (availability[d] || []).reduce((s, slot) => s + slotMinutes(slot), 0), 0);
  const visible = service.visible_to_customers !== false;
  const isLive = service.status === 'active' && visible && !sellerSuspended;
  const price = Number(service.price) || 0;
  const packagePrices = packages.map((p) => Number(p.price) || 0).filter(Boolean);
  const shortId = String(service._id).slice(-6).toUpperCase();
  const MethodIcon = METHOD_ICON[service.service_method] || Globe;

  const liveLabel = sellerSuspended ? { text: 'Seller suspended', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' }
    : service.status === 'draft' ? { text: 'Draft · not published', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' }
      : service.status === 'inactive' ? { text: 'Inactive · not bookable', cls: 'bg-[#E9EBFA] text-neutral-600', dot: 'bg-neutral-400' }
        : !visible ? { text: 'Hidden from customers', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
          : { text: 'Active & accepting bookings', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };

  const copyId = () => navigator.clipboard?.writeText(String(service._id)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});

  const tiers = [
    { name: 'Base offering', price, rate: RATE_LABEL[service.rate_type] || humanize(service.rate_type), time: service.duration || '—', scope: highlights.slice(0, 2).join(' + ') || service.short_description, base: true },
    ...packages.map((p) => ({ name: p.name, price: Number(p.price) || 0, rate: 'Add-on', time: p.hours ? `${p.hours} hr${p.hours === 1 ? '' : 's'}` : '—', scope: '' })),
  ];

  return (
    <div className="space-y-5 pb-10">
      {back(`SRV-${shortId} — ${service.name}`)}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">{service.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8E35B5]"><Tag className="h-3 w-3" />{service.category || 'Uncategorized'}</span>
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold', liveLabel.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', liveLabel.dot, isLive && 'animate-pulse')} />{liveLabel.text}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!seller.id} onClick={() => navigate(`/users/${seller.id}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><User className="h-4 w-4 text-[#8E35B5]" /> Creator Profile</button>
          <button type="button" disabled={!seller.id} onClick={() => navigate(`/marketplace/services?seller=${seller.id}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-50"><Layers className="h-4 w-4" /> All Services by Creator</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Base Price" value={inr(price)} icon={Tag} tone="pink" foot={<span className="font-semibold text-[#C81345]">{RATE_LABEL[service.rate_type] || humanize(service.rate_type)}</span>} />
        <StatCard label="Session Length" value={service.duration || '—'} icon={Clock} tone="violet" foot={<span className="inline-flex items-center gap-1"><MethodIcon className="h-3 w-3" />{METHOD_LABEL[service.service_method] || humanize(service.service_method)}</span>} />
        <StatCard label="Add-on Packages" value={formatNumber(packages.length)} icon={Layers} tone="purple" foot={packagePrices.length ? `${inr(Math.min(...packagePrices))} – ${inr(Math.max(...packagePrices))}` : 'Single offer, no add-ons'} />
        <StatCard label="Weekly Availability" value={`${days.length} / 7 days`} icon={CalendarDays} tone="emerald" foot={weeklyMinutes ? <span className="font-semibold text-emerald-600">{Math.round((weeklyMinutes / 60) * 10) / 10} bookable hrs / week</span> : <span className="text-rose-600">No time slots set</span>} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card title="Deliverable Portfolio & Spec Gallery" icon={Images} aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{images.length} asset{images.length === 1 ? '' : 's'} attached</span>}>
            <Gallery images={images} category={service.provider || service.category} />
            <div className="mt-5">
              <h3 className="text-[13.5px] font-bold text-neutral-900">Creative Scope & Description</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#8E35B5]/90">{service.short_description || 'No description provided.'}</p>
              {service.provider && <p className="mt-2 text-[12px] text-neutral-500">Delivered by <b className="text-neutral-800">{service.provider}</b></p>}
            </div>
            {highlights.length > 0 && (
              <div className="mt-4 rounded-xl bg-[#F1F3FC] p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-neutral-700">Included deliverables</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12.5px] font-medium text-neutral-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 fill-emerald-500 text-white" />{h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Pricing Tiers & Package Architecture" icon={Layers} bodyClass="pt-3" aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{tiers.length} tier{tiers.length === 1 ? '' : 's'}</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="bg-[#F7F8FD]">
                    {['Tier level', 'Price point', 'Model', 'Time', 'Status'].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {tiers.map((t, i) => {
                    const top = !t.base && packagePrices.length > 1 && t.price === Math.max(...packagePrices);
                    return (
                      <tr key={i} className={clsx('transition-colors hover:bg-[#FDF2F6]', top && 'bg-pink-50/40')}>
                        <td className="px-5 py-3">
                          <p className={clsx('flex flex-wrap items-center gap-1.5 text-[13px] font-bold', t.base ? 'text-neutral-900' : 'text-[#8E35B5]')}>
                            {t.name}
                            {t.base && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#8E35B5]">Core</span>}
                            {top && <span className="rounded bg-[#E8194E] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Premium</span>}
                          </p>
                          {t.scope && <p className="mt-0.5 max-w-[260px] truncate text-[11px] text-neutral-500" title={t.scope}>{t.scope}</p>}
                        </td>
                        <td className="px-5 py-3 text-[13.5px] font-extrabold text-neutral-900">{t.price ? inr(t.price) : '—'}</td>
                        <td className="px-5 py-3 text-[12px] text-neutral-600">{t.rate}</td>
                        <td className="px-5 py-3 text-[12.5px] font-semibold text-[#E8194E]">{t.time}</td>
                        <td className="px-5 py-3">
                          <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-[10.5px] font-bold', isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500')}>{isLive ? 'Active' : 'Not bookable'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Weekly Booking Calendar" icon={CalendarClock} aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Creator's local time</span>}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {WEEKDAYS.map((d) => {
                const slots = Array.isArray(availability[d]) ? availability[d] : [];
                return (
                  <div key={d} className={clsx('rounded-xl p-2.5 transition', slots.length ? 'bg-gradient-to-b from-pink-50 to-purple-50 ring-1 ring-pink-100 hover:-translate-y-0.5' : 'bg-neutral-50')}>
                    <p className={clsx('text-[10.5px] font-bold uppercase tracking-wide', slots.length ? 'text-[#C81345]' : 'text-neutral-400')}>{d.slice(0, 3)}</p>
                    <div className="mt-1.5 space-y-1">
                      {slots.length ? slots.map((s, i) => <p key={i} className="rounded-md bg-white px-1.5 py-0.5 text-center text-[10.5px] font-semibold text-neutral-800 shadow-sm">{s.start}–{s.end}</p>)
                        : <p className="text-[10.5px] text-neutral-400">Unavailable</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <MarketplaceSellerPanel listing={service} listLabel="Catalog" listHref={(sid) => `/marketplace/influencers/${sid}/products`} />

          <Card title="Moderation & Visibility" icon={ShieldCheck}>
            <div className="divide-y divide-neutral-100">
              <Row label="Service ID">
                <button type="button" onClick={copyId} className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F3FC] px-2 py-1 font-mono text-[11px] hover:bg-[#E9EBFA]">SRV-{shortId}{copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-neutral-500" />}</button>
              </Row>
              <Row label="Category">{service.category || '—'}</Row>
              <Row label="Listing status">{humanize(service.status)}</Row>
              <Row label="Visible to customers">{visible ? <span className="inline-flex items-center gap-1 text-emerald-600"><Globe className="h-3.5 w-3.5" />Public</span> : <span className="inline-flex items-center gap-1 text-amber-600"><EyeOff className="h-3.5 w-3.5" />Hidden</span>}</Row>
              <Row label="Delivery">{METHOD_LABEL[service.service_method] || humanize(service.service_method)}</Row>
              <Row label="Listed">{formatDateTime(service.createdAt)}</Row>
              <Row label="Updated">{formatDateTime(service.updatedAt)}</Row>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#F1F3FC] px-3 py-2.5 text-[11.5px] text-neutral-600">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#8E35B5]" />
              Only the creator can edit this listing. To stop new bookings, suspend their selling privileges above.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceServiceDetail;
