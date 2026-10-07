import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { CalendarDays, CheckCircle2, Download, EyeOff, IndianRupee, Layers, ShieldOff, Users, Wrench } from 'lucide-react';
import {
  Chip, Delta, GradientButton, OutlineButton, PageHeader, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th, inr,
} from '../components/MarketplaceKit.jsx';
import { humanize, sellerOf } from '../components/MarketplaceShared.jsx';
import useCatalogQuery from '../hooks/useCatalogQuery.js';
import { fetchAdminServices } from '../store/marketplaceSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const RATE_LABEL = { starting_from: 'Starting from', fixed: 'Fixed package', per_hour: 'Per hour', per_session: 'Per session' };
const METHOD_LABEL = { at_customer_location: 'At customer location', online: 'Online', at_my_location: "At creator's location" };
const CATEGORY_TONES = ['bg-pink-100 text-[#C81345]', 'bg-indigo-50 text-indigo-700', 'bg-purple-100 text-[#8E35B5]', 'bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-sky-50 text-sky-700'];
const STATUS_OPTIONS = [{ value: 'all', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'draft', label: 'Draft' }];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'availability', label: 'Most available' },
  { value: 'name', label: 'Name A–Z' },
];

const Thumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#EEF0FA]">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
        : <div className="flex h-full w-full items-center justify-center"><Wrench className="h-4 w-4 text-[#8E35B5]" /></div>}
    </div>
  );
};

const isLive = (r) => r.status === 'active' && r.visible && !r.sellerSuspended;

const statusOf = (r) => {
  if (r.status === 'draft') return { label: 'Draft', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' };
  if (r.status === 'inactive') return { label: 'Inactive', cls: 'bg-[#E9EBFA] text-neutral-600', dot: 'bg-neutral-400' };
  if (r.sellerSuspended) return { label: 'Suspended', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' };
  if (!r.visible) return { label: 'Hidden', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
};

const MarketplaceServices = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.services);
  const query = useCatalogQuery({ fetchThunk: fetchAdminServices, items });
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => items.map((service) => {
    const seller = sellerOf(service);
    const availability = service.weekly_availability || {};
    const days = WEEKDAYS.filter((d) => Array.isArray(availability[d]) && availability[d].length > 0);
    return {
      id: String(service._id),
      name: service.name || 'Untitled service',
      image: service.images?.[0]?.fileUrl ? toAbsoluteMediaUrl(service.images[0].fileUrl) : '',
      provider: service.provider || '',
      sellerId: seller.id,
      sellerName: seller.storeName || seller.fullName || seller.username || 'Unknown seller',
      sellerUsername: seller.username,
      sellerSuspended: seller.isSuspended,
      category: service.category || '',
      price: Number(service.price) || 0,
      rateType: service.rate_type || '',
      duration: service.duration || '',
      method: service.service_method || '',
      packages: Array.isArray(service.subservices) ? service.subservices.filter((s) => s?.name).length : 0,
      days,
      visible: service.visible_to_customers !== false,
      status: service.status || 'active',
      createdAt: service.createdAt,
    };
  }), [items]);

  const categories = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => { if (r.category) counts.set(r.category, (counts.get(r.category) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const categoryTone = (c) => CATEGORY_TONES[Math.max(0, categories.findIndex(([name]) => name === c)) % CATEGORY_TONES.length];

  const views = [
    { key: 'all', label: 'All', count: rows.length, test: () => true },
    ...categories.slice(0, 3).map(([name, count]) => ({ key: `cat:${name}`, label: name, count, test: (r) => r.category === name })),
    { key: 'unpublished', label: 'Draft & Inactive', count: rows.filter((r) => r.status !== 'active').length, test: (r) => r.status !== 'active', tone: 'amber' },
    { key: 'hidden', label: 'Hidden', count: rows.filter((r) => r.status === 'active' && !r.visible).length, test: (r) => r.status === 'active' && !r.visible, tone: 'amber' },
    { key: 'suspended', label: 'Suspended sellers', count: rows.filter((r) => r.sellerSuspended).length, test: (r) => r.sellerSuspended, tone: 'rose' },
  ];

  const filtered = (() => {
    const test = views.find((v) => v.key === view)?.test || (() => true);
    const sorters = {
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      price_desc: (a, b) => b.price - a.price,
      price_asc: (a, b) => a.price - b.price,
      availability: (a, b) => b.days.length - a.days.length,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return rows.filter(test).sort(sorters[sort]);
  })();

  useEffect(() => { setPage(1); }, [view, sort, query.seller, query.status, query.category, query.search]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const added30 = rows.filter((r) => new Date(r.createdAt).getTime() > Date.now() - 30 * DAY_MS).length;
    const base = rows.length - added30;
    const live = rows.filter(isLive);
    const priced = rows.filter((r) => r.price > 0);
    return {
      growth: base > 0 ? (added30 / base) * 100 : null,
      added30,
      live: live.length,
      providers: new Set(live.map((r) => r.sellerId)).size,
      notLive: rows.length - live.length,
      avgPrice: priced.length ? priced.reduce((s, r) => s + r.price, 0) / priced.length : 0,
      catalogValue: priced.reduce((s, r) => s + r.price, 0),
    };
  }, [rows]);

  const exportCsv = () => downloadCsv(`marketplace-services-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Service ID', 'Name', 'Seller', 'Seller username', 'Provider', 'Category', 'Price (INR)', 'Rate type', 'Duration', 'Method', 'Packages', 'Available days', 'Visible', 'Status', 'Listed'],
    ...filtered.map((r) => [r.id, r.name, r.sellerName, r.sellerUsername, r.provider, r.category, r.price, RATE_LABEL[r.rateType] || r.rateType, r.duration, METHOD_LABEL[r.method] || r.method, r.packages, r.days.join(' | '), r.visible ? 'yes' : 'no', r.status, r.createdAt ? new Date(r.createdAt).toISOString() : '']),
  ]);

  const refresh = () => dispatch(fetchAdminServices({ seller: query.seller, status: query.status, category: query.category, q: query.search }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Marketplace" section="Services Directory" title={<span className="inline-flex flex-wrap items-center gap-2.5">Services Management <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-[#8E35B5]"><span className="h-1.5 w-1.5 rounded-full bg-[#8E35B5]" />Active roster</span></span>}
        description="Govern creator professional services: consulting packages, pricing models, availability and visibility.">
        <OutlineButton icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export Services (CSV)</OutlineButton>
        <GradientButton icon={Users} onClick={() => navigate('/marketplace/influencers')} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">Service Providers</GradientButton>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Services" value={formatNumber(total)} icon={Layers} tone="pink" foot={<>{stats.growth !== null ? <Delta value={stats.growth} /> : null}{formatNumber(stats.added30)} added in 30 days</>} />
        <StatCard label="Live Services" value={formatNumber(stats.live)} icon={CheckCircle2} tone="violet" foot={<><Chip tone="emerald">{formatNumber(stats.providers)} providers</Chip> bookable now</>} />
        <StatCard label="Not Live" value={formatNumber(stats.notLive)} icon={EyeOff} tone="rose" foot={<>draft, inactive, hidden or seller suspended</>} />
        <StatCard label="Avg Service Price" value={inr(stats.avgPrice)} icon={IndianRupee} tone="purple" foot={<><Chip tone="purple">{inr(stats.catalogValue)}</Chip> combined list price</>} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          {views.map((v) => (
            <button key={v.key} type="button" onClick={() => setView(v.key)} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
              view === v.key ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]'
                : v.tone === 'rose' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : v.tone === 'amber' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-[#EEF0FA] text-neutral-700 hover:bg-[#E2E5F4]')}>
              {v.tone && view !== v.key && <span className={clsx('h-1.5 w-1.5 rounded-full', v.tone === 'rose' ? 'bg-rose-500' : 'bg-amber-500')} />}
              {v.label} ({formatNumber(v.count)})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchInput value={query.search} onChange={query.setSearch} placeholder="Search service title, category, provider or description…" />
          <Select value={query.seller} onChange={query.setSeller} options={query.sellerOptions} className="min-w-[170px]" />
          <Select prefix="Category" value={query.category} onChange={query.setCategory} options={query.categoryOptions.map((o) => (o.value === 'all' ? { ...o, label: 'All' } : o))} />
          <Select prefix="Status" value={query.status} onChange={query.setStatus} options={STATUS_OPTIONS.map((o) => (o.value === 'all' ? { ...o, label: 'All' } : o))} />
          <RefreshButton onClick={refresh} spinning={loadStatus === 'loading'} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">Service Offerings <span className="rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{formatNumber(filtered.length)} total</span></h2>
          <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} className="[&>button]:h-8 [&>button]:border-transparent [&>button]:bg-transparent" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                {['Service & provider', 'Category', 'Pricing & model', 'Delivery', 'Packages', 'Availability', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loadStatus === 'loading' && !rows.length ? <StateRow colSpan={7} loading message="Loading services…" />
                : !visible.length ? <StateRow colSpan={7} icon={Wrench} message={error ? `Error: ${error}` : 'No services found'} />
                  : visible.map((r) => {
                    const st = statusOf(r);
                    return (
                      <tr key={r.id} onClick={() => navigate(`/marketplace/services/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.sellerSuspended && 'bg-rose-50/40')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Thumb src={r.image} />
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.name}</p>
                              <p className="mt-0.5 flex max-w-[260px] items-center gap-1 truncate text-[11px]">
                                {r.sellerUsername && <button type="button" onClick={(e) => { e.stopPropagation(); if (r.sellerId) navigate(`/marketplace/influencers/${r.sellerId}/products`); }} className="font-semibold text-[#E8194E] hover:underline">@{r.sellerUsername}</button>}
                                <span className="text-neutral-300">·</span>
                                <span className={clsx('truncate', r.sellerSuspended ? 'text-neutral-400 line-through' : 'text-neutral-500')}>{r.provider || r.sellerName}</span>
                                {r.sellerSuspended && <ShieldOff className="h-3 w-3 flex-shrink-0 text-rose-500" />}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{r.category ? <span className={clsx('inline-flex max-w-[120px] rounded-lg px-2 py-1 text-[11px] font-semibold leading-tight', categoryTone(r.category))}>{r.category}</span> : <span className="text-neutral-400">—</span>}</td>
                        <td className="px-4 py-3">
                          <p className="text-[13.5px] font-extrabold text-neutral-900">{inr(r.price)}</p>
                          <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{RATE_LABEL[r.rateType] || humanize(r.rateType)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[12.5px] font-semibold text-neutral-800">{r.duration || '—'}</p>
                          <p className="text-[10.5px] text-neutral-500">{METHOD_LABEL[r.method] || humanize(r.method)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13.5px] font-extrabold text-neutral-900">{r.packages}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{r.packages ? 'add-ons' : 'single offer'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-0.5" title={r.days.length ? r.days.map(humanize).join(', ') : 'No weekly slots'}>
                            {WEEKDAYS.map((d) => <span key={d} className={clsx('flex h-5 w-5 items-center justify-center rounded text-[9.5px] font-bold', r.days.includes(d) ? 'bg-pink-100 text-[#C81345]' : 'bg-neutral-100 text-neutral-300')}>{d[0].toUpperCase()}</span>)}
                          </div>
                          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-neutral-500"><CalendarDays className="h-3 w-3" />{r.days.length ? `${r.days.length} day${r.days.length === 1 ? '' : 's'} / week` : 'No slots set'}</p>
                        </td>
                        <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span></td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="services" />
      </div>
    </div>
  );
};

export default MarketplaceServices;
