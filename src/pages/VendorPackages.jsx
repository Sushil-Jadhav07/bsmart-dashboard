import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Archive, Award, BadgeIndianRupee, Calendar, CircleDot, Megaphone, ChevronDown, CircleCheck, Edit2, Flame, Gem, MoreVertical, Plus, Power, RotateCw,
  Rocket, Search, ShoppingBag, SlidersHorizontal, Sprout, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from '../components/Modal.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { adminCreatePackage, adminDeactivatePackage, adminUpdatePackage, resetMutation } from '../store/vendorPackagesSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, pageList } from '../utils/contentHelpers.js';

const PAGE_SIZE = 8;
const PURCHASE_PAGE_LIMIT = 100;
const MAX_PURCHASE_PAGES = 10;

const TIERS = ['basic', 'standard', 'premium', 'enterprise'];
const TIER_META = {
  enterprise: { label: 'Enterprise', pill: 'bg-purple-100 text-[#8E35B5]', tile: 'bg-indigo-50 text-indigo-600', icon: Gem },
  premium: { label: 'Premium', pill: 'bg-pink-100 text-[#C81345]', tile: 'bg-pink-50 text-[#E8194E]', icon: Flame },
  standard: { label: 'Standard', pill: 'bg-blue-100 text-blue-700', tile: 'bg-blue-50 text-blue-600', icon: Rocket },
  basic: { label: 'Basic', pill: 'bg-[#E9EBFA] text-neutral-700', tile: 'bg-emerald-50 text-emerald-600', icon: Sprout },
};

const EMPTY_FORM = {
  name: '', tier: 'basic', ads_allowed_min: 1, ads_allowed_max: 5, base_price: '', discount_percent: 0,
  final_price: '', coins_granted: '', validity_days: 30, description: '', features: '',
};

const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
const inrCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return inr(n);
};
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const validityLabel = (days) => (days % 30 === 0 && days >= 30 ? (days === 30 ? 'month' : `${days / 30} months`) : `${days} days`);

const Select = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        {selected?.label}<ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 min-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, iconTone, foot, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <p className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-neutral-500">{foot}</div>
  </div>
);

const RowMenu = ({ row, onEdit, onToggle }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label={`Actions for ${row.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA] hover:text-neutral-900">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"><Edit2 className="h-3.5 w-3.5 text-neutral-400" /> Edit package</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className={clsx('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50', row.active ? 'text-red-600' : 'text-emerald-700')}>
              <Power className="h-3.5 w-3.5" /> {row.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const DRAFT_KEY = 'vendor_package_draft';
const VALIDITY_PRESETS = [30, 60, 90, 180, 365];

const readDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
};

const PackageForm = ({ open, initial, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const { mutationStatus, mutationError } = useSelector((s) => s.vendorPackages);
  const [form, setForm] = useState({ ...EMPTY_FORM, is_active: true });
  const [localError, setLocalError] = useState('');
  const [tierOpen, setTierOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const isEdit = !!initial?._id;

  useEffect(() => {
    if (!open) return;
    setLocalError('');
    setTierOpen(false);
    if (isEdit) {
      setForm({ ...EMPTY_FORM, ...initial, is_active: initial.is_active !== false, features: Array.isArray(initial.features) ? initial.features.join('\n') : initial.features || '' });
    } else {
      const draft = readDraft();
      setForm(draft ? { ...EMPTY_FORM, is_active: true, ...draft } : { ...EMPTY_FORM, is_active: true });
      setDraftSaved(!!draft);
    }
  }, [initial, open, isEdit]);

  // New packages autosave to this browser so a closed dialog doesn't lose work.
  useEffect(() => {
    if (!open || isEdit) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); setDraftSaved(true); } catch { /* storage blocked */ }
    }, 600);
    return () => clearTimeout(t);
  }, [form, open, isEdit]);

  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));
  const base = Number(form.base_price) || 0;
  const discount = Number(form.discount_percent) || 0;
  const computedFinal = form.final_price !== '' && form.final_price != null ? Number(form.final_price) : Math.round(base * (1 - discount / 100));
  const featureCount = String(form.features || '').split('\n').filter((f) => f.trim()).length;

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (Number(form.ads_allowed_min) > Number(form.ads_allowed_max)) { setLocalError('Min ads cannot be more than max ads.'); return; }
    const payload = {
      name: form.name.trim(),
      tier: form.tier,
      ads_allowed_min: Number(form.ads_allowed_min),
      ads_allowed_max: Number(form.ads_allowed_max),
      base_price: base,
      discount_percent: discount,
      final_price: computedFinal,
      coins_granted: Number(form.coins_granted),
      validity_days: Number(form.validity_days),
      description: form.description,
      features: String(form.features || '').split('\n').map((f) => f.trim()).filter(Boolean),
      is_active: !!form.is_active,
    };
    const res = await dispatch(isEdit ? adminUpdatePackage({ packageId: initial._id, payload }) : adminCreatePackage(payload));
    if (res.meta.requestStatus === 'fulfilled') {
      if (!isEdit) { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }
      onSaved();
      onClose();
    }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setForm({ ...EMPTY_FORM, is_active: true });
    setDraftSaved(false);
  };

  if (!open) return null;

  const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-700';
  const help = 'mt-1 text-[10.5px] font-semibold text-neutral-500';
  const shell = 'flex h-11 items-center gap-2.5 rounded-xl border border-transparent bg-[#F1F3FC] px-3.5 transition focus-within:border-[#E8194E]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#E8194E]/10';
  const input = 'h-full w-full bg-transparent text-[14px] font-semibold text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400';
  const tierMeta = TIER_META[form.tier] || TIER_META.basic;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8194E] to-[#8E35B5] text-white shadow-[0_8px_18px_-8px_rgba(232,25,78,0.7)]"><Award className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-[19px] font-bold text-neutral-900">{isEdit ? 'Edit Vendor Package' : 'Create Vendor Package'}</h2>
              <p className="text-[12.5px] text-neutral-500">Configure tier pricing, coin allocation and spotlight ad quotas.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {(localError || mutationError) && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{localError || mutationError}</div>}

          <div>
            <label className={label}>Package name</label>
            <div className={shell}><input required value={form.name} onChange={set('name')} placeholder="e.g. Apex Diamond Growth Tier" className={input} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className={label}>Tier level</label>
              <button type="button" onClick={() => setTierOpen((v) => !v)} className={clsx(shell, 'w-full justify-between')}>
                <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-bold', tierMeta.pill)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{tierMeta.label}</span>
                <ChevronDown className={clsx('h-4 w-4 text-neutral-500 transition-transform', tierOpen && 'rotate-180')} />
              </button>
              {tierOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTierOpen(false)} />
                  <div className="absolute left-0 right-0 top-[72px] z-20 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    {TIERS.map((t) => (
                      <button key={t} type="button" onClick={() => { setForm((v) => ({ ...v, tier: t })); setTierOpen(false); }} className={clsx('flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-neutral-50', form.tier === t && 'bg-pink-50')}>
                        <span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-bold', TIER_META[t].pill)}>{TIER_META[t].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className={help}>Basic, Standard, Premium or Enterprise</p>
            </div>
            <div>
              <label className={label}>Price (₹)</label>
              <div className={shell}><span className="text-[14px] font-bold text-neutral-500">₹</span><input required type="number" min="0" value={form.base_price} onChange={set('base_price')} placeholder="24999" className={input} /></div>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min="0" max="100" value={form.discount_percent} onChange={set('discount_percent')} aria-label="Discount percent" className="h-6 w-14 rounded-md border border-neutral-200 px-1.5 text-[11px] font-semibold outline-none focus:border-[#E8194E]/40" />
                <span className={clsx(help, 'mt-0')}>% discount → vendor pays <b className="text-[#C81345]">{inr(computedFinal)}</b></span>
              </div>
            </div>

            <div>
              <label className={label}>Bcoin allocation</label>
              <div className={shell}><span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#8E35B5] text-[10px] font-black text-[#8E35B5]">$</span><input required type="number" min="0" value={form.coins_granted} onChange={set('coins_granted')} placeholder="25000" className={clsx(input, 'text-[#8E35B5]')} /></div>
              <p className={help}>Credited to the vendor's Vault on purchase</p>
            </div>
            <div>
              <label className={label}>Validity duration</label>
              <div className={shell}>
                <Calendar className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                <select value={VALIDITY_PRESETS.includes(Number(form.validity_days)) ? String(form.validity_days) : 'custom'} onChange={(e) => { if (e.target.value !== 'custom') setForm((v) => ({ ...v, validity_days: Number(e.target.value) })); }} className={clsx(input, 'cursor-pointer appearance-none')}>
                  {VALIDITY_PRESETS.map((d) => <option key={d} value={d}>{d} Days</option>)}
                  <option value="custom">Custom…</option>
                </select>
                {!VALIDITY_PRESETS.includes(Number(form.validity_days)) && (
                  <input type="number" min="1" value={form.validity_days} onChange={set('validity_days')} aria-label="Custom validity days" className="h-7 w-16 rounded-md border border-neutral-200 bg-white px-1.5 text-[12px] font-semibold outline-none" />
                )}
              </div>
              <p className={help}>How long the package stays active</p>
            </div>

            <div>
              <label className={label}>Min spotlight ads</label>
              <div className={shell}><CircleDot className="h-4 w-4 flex-shrink-0 text-neutral-500" /><input required type="number" min="0" value={form.ads_allowed_min} onChange={set('ads_allowed_min')} className={input} /><span className="text-[12px] text-neutral-500">Spotlights</span></div>
            </div>
            <div>
              <label className={label}>Max spotlight ads</label>
              <div className={shell}><Megaphone className="h-4 w-4 flex-shrink-0 text-[#C81345]" /><input required type="number" min="0" value={form.ads_allowed_max} onChange={set('ads_allowed_max')} className={input} /><span className="text-[12px] text-neutral-500">Spotlights</span></div>
            </div>
          </div>

          <div>
            <label className={label}>Package description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Who this package is for and what it unlocks." className="w-full resize-none rounded-xl border border-transparent bg-[#F1F3FC] px-3.5 py-2.5 text-[13.5px] text-neutral-800 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-4 focus:ring-[#E8194E]/10" />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">Included features & entitlements</label>
              <span className="text-[10.5px] font-bold text-[#C81345]">{featureCount ? `${featureCount} feature${featureCount === 1 ? '' : 's'}` : '1 feature per line'}</span>
            </div>
            <textarea value={form.features} onChange={set('features')} rows={4} placeholder={'Priority spotlight ad verification\nDedicated sales officer & account manager'} className="w-full rounded-xl border border-transparent bg-[#F1F3FC] px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed text-neutral-800 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-4 focus:ring-[#E8194E]/10" />
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#E4E7F5] bg-[#F6F7FD] px-4 py-3 transition hover:bg-[#F1F3FC]">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-[#C81345]"><CircleCheck className="h-4 w-4" /></span>
              <span>
                <span className="block text-[13.5px] font-bold text-neutral-900">{isEdit ? 'Package is active' : 'Set package as active immediately'}</span>
                <span className="block text-[11.5px] text-neutral-500">Active packages are visible to vendors and can be purchased</span>
              </span>
            </span>
            <span className="relative">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((v) => ({ ...v, is_active: e.target.checked }))} className="peer sr-only" />
              <span className="block h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-[#E8194E]" />
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          {!isEdit ? (
            <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">
              <span className={clsx('h-1.5 w-1.5 rounded-full', draftSaved ? 'bg-[#E8194E]' : 'bg-neutral-300')} />
              {draftSaved ? 'Draft saved in this browser' : 'Not saved yet'}
              {draftSaved && <button type="button" onClick={discardDraft} className="normal-case tracking-normal text-neutral-400 underline hover:text-[#C81345]">discard</button>}
            </span>
          ) : <span />}
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 transition hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={mutationStatus === 'loading'} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60">
              {mutationStatus === 'loading' ? 'Saving…' : <><Plus className="h-4 w-4" />{isEdit ? 'Save Changes' : form.is_active ? 'Save & Publish Package' : 'Save as Inactive'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Side-by-side comparison of the active packages in each tier.
const MatrixModal = ({ open, onClose, rows }) => {
  const byTier = TIERS.map((t) => ({ tier: t, items: rows.filter((r) => r.tier === t && r.active).sort((a, b) => a.price - b.price) })).filter((g) => g.items.length);
  return (
    <Modal isOpen={open} onClose={onClose} title="Tier matrix" description="Active packages compared by tier. Coins per ₹ shows how much value each package gives." size="full">
      <div className="max-h-[70vh] overflow-auto">
        {byTier.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">No active packages</p> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {byTier.map(({ tier, items }) => {
              const meta = TIER_META[tier];
              return (
                <div key={tier} className="rounded-xl border border-neutral-200 bg-[#FAFAFE] p-3">
                  <p className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase', meta.pill)}><meta.icon className="h-3.5 w-3.5" />{meta.label}</p>
                  <div className="mt-2.5 space-y-2">
                    {items.map((r) => (
                      <div key={r.id} className="rounded-lg bg-white p-3 ring-1 ring-neutral-200">
                        <p className="text-[13px] font-bold text-neutral-900">{r.name}</p>
                        <p className="mt-0.5 text-[15px] font-extrabold text-[#C81345]">{inr(r.price)} <span className="text-[11px] font-semibold text-neutral-500">/ {validityLabel(r.validity)}</span></p>
                        <dl className="mt-2 space-y-1 text-[12px]">
                          <div className="flex justify-between"><dt className="text-neutral-500">Coins</dt><dd className="font-bold text-neutral-800">{formatNumber(r.coins)}</dd></div>
                          <div className="flex justify-between"><dt className="text-neutral-500">Coins per ₹</dt><dd className="font-bold text-neutral-800">{r.price ? (r.coins / r.price).toFixed(2) : '—'}</dd></div>
                          <div className="flex justify-between"><dt className="text-neutral-500">Spotlights</dt><dd className="font-bold text-neutral-800">{r.adsLabel}</dd></div>
                          <div className="flex justify-between"><dt className="text-neutral-500">Sold</dt><dd className="font-bold text-neutral-800">{formatNumber(r.sold)}</dd></div>
                        </dl>
                        {r.features.length > 0 && (
                          <ul className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2">
                            {r.features.slice(0, 4).map((f) => <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-neutral-600"><CircleCheck className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />{f}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

const VendorPackages = () => {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const [packages, setPackages] = useState({ status: 'idle', items: [], error: null });
  const [purchases, setPurchases] = useState({ status: 'idle', items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const headers = useMemo(() => ({ Accept: 'application/json', Authorization: `Bearer ${token}` }), [token]);

  // The admin list includes inactive packages (the public list hides them).
  const loadPackages = useCallback(async () => {
    if (!token) return;
    setPackages((p) => ({ ...p, status: 'loading', error: null }));
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load packages');
      setPackages({ status: 'succeeded', items: json?.packages || json?.data || [], error: null });
    } catch (e) {
      setPackages({ status: 'failed', items: [], error: e.message });
    }
  }, [token, headers]);

  const loadPurchases = useCallback(async () => {
    if (!token) return;
    setPurchases((p) => ({ ...p, status: 'loading' }));
    try {
      const all = [];
      let total = 0;
      for (let p = 1; p <= MAX_PURCHASE_PAGES; p += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/purchases?page=${p}&limit=${PURCHASE_PAGE_LIMIT}`, { headers });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        all.push(...(json?.purchases || []));
        total = json?.total ?? all.length;
        if (p >= (json?.total_pages || 1)) break;
      }
      setPurchases({ status: 'succeeded', items: all, total });
    } catch {
      setPurchases({ status: 'failed', items: [], total: 0 });
    }
  }, [token, headers]);

  useEffect(() => { loadPackages(); loadPurchases(); }, [loadPackages, loadPurchases]);

  const sales = useMemo(() => {
    const map = new Map();
    purchases.items.forEach((p) => {
      const id = idOf(p.package_id);
      if (!id) return;
      const entry = map.get(id) || { sold: 0, revenue: 0 };
      entry.sold += 1;
      entry.revenue += Number(p.amount_paid) || 0;
      map.set(id, entry);
    });
    return map;
  }, [purchases.items]);

  const rows = useMemo(() => packages.items.map((pkg) => {
    const id = String(pkg._id || pkg.id);
    const min = Number(pkg.ads_allowed_min) || 0;
    const max = Number(pkg.ads_allowed_max) || 0;
    const tier = TIERS.includes(pkg.tier) ? pkg.tier : 'basic';
    return {
      id,
      name: pkg.name || 'Package',
      description: pkg.description || '',
      tier,
      price: Number(pkg.final_price ?? pkg.base_price ?? 0),
      basePrice: Number(pkg.base_price ?? 0),
      discount: Number(pkg.discount_percent ?? 0),
      coins: Number(pkg.coins_granted ?? 0),
      validity: Number(pkg.validity_days ?? 0),
      min,
      max,
      adsLabel: min && min !== max ? `${min}–${max}` : `Up to ${max}`,
      features: Array.isArray(pkg.features) ? pkg.features : [],
      active: pkg.is_active !== false,
      sold: sales.get(id)?.sold || 0,
      revenue: sales.get(id)?.revenue || 0,
      createdAt: pkg.createdAt,
      raw: pkg,
    };
  }), [packages.items, sales]);

  const tierCounts = useMemo(() => TIERS.reduce((acc, t) => ({ ...acc, [t]: rows.filter((r) => r.tier === t).length }), {}), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.name, r.tier, r.description, r.adsLabel, String(r.max)].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (tierFilter !== 'all' && r.tier !== tierFilter) return false;
      if (statusFilter === 'active' && !r.active) return false;
      if (statusFilter === 'inactive' && r.active) return false;
      return true;
    }).sort((a, b) => (Number(b.active) - Number(a.active)) || (TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier)) || (b.price - a.price));
  }, [rows, search, tierFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, tierFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const now = Date.now();
    const startYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const activeVendors = new Set(purchases.items
      .filter((p) => (!p.expires_at || new Date(p.expires_at).getTime() > now) && String(p.status || 'active').toLowerCase() !== 'cancelled')
      .map((p) => idOf(p.vendor_id) || idOf(p.user_id))).size;
    const recent = purchases.items.filter((p) => new Date(p.purchased_at || p.createdAt).getTime() > now - 30 * DAY_MS).length;
    const prior = purchases.items.filter((p) => { const t = new Date(p.purchased_at || p.createdAt).getTime(); return t <= now - 30 * DAY_MS && t > now - 60 * DAY_MS; }).length;
    return {
      total: rows.length,
      tiersInUse: TIERS.filter((t) => tierCounts[t]).length,
      active: rows.filter((r) => r.active).length,
      activeVendors,
      purchases: purchases.total || purchases.items.length,
      purchaseGrowth: prior ? ((recent - prior) / prior) * 100 : null,
      revenueYtd: purchases.items.filter((p) => new Date(p.purchased_at || p.createdAt).getTime() >= startYear).reduce((s, p) => s + (Number(p.amount_paid) || 0), 0),
      revenueAll: purchases.items.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0),
    };
  }, [rows, tierCounts, purchases]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const runToggle = async () => {
    if (!confirm) return;
    setBusy(true);
    const action = confirm.active
      ? adminDeactivatePackage(confirm.id)
      : adminUpdatePackage({ packageId: confirm.id, payload: { is_active: true } });
    const res = await dispatch(action);
    setBusy(false);
    setConfirm(null);
    if (res.meta.requestStatus === 'fulfilled') {
      showToast(confirm.active ? 'Package deactivated' : 'Package reactivated');
      loadPackages();
    } else {
      showToast(res.payload || 'Update failed', 'error');
    }
  };

  const openForm = (row) => { dispatch(resetMutation()); setEditing(row ? row.raw : null); setFormOpen(true); };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Package Management</span><span className="text-neutral-400">•</span><span className="text-neutral-500">Tier Matrix</span>
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Vendor Packages</h1>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Create and manage vendor subscription packages, purchase history, ad limits and coin allocation.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button type="button" onClick={() => setMatrixOpen(true)} disabled={!rows.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E9EBFA] px-4 text-[13.5px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50">
              <SlidersHorizontal className="h-4 w-4" /> Tier Matrix
            </button>
            <button type="button" onClick={() => openForm(null)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105">
              <Plus className="h-4 w-4" /> Create Package
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Packages" value={formatNumber(stats.total)} icon={Archive} iconTone="bg-purple-100 text-[#8E35B5]"
            foot={<><span className="h-1.5 w-1.5 rounded-full bg-[#8E35B5]" />Across {stats.tiersInUse} merchant tier{stats.tiersInUse === 1 ? '' : 's'}</>}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]" />
          <StatCard label="Active Plans" value={formatNumber(stats.active)} icon={CircleCheck} iconTone="bg-emerald-100 text-emerald-600"
            foot={purchases.status === 'succeeded' ? <><b className="text-neutral-800">{formatNumber(stats.activeVendors)} vendors</b> on an unexpired package</> : 'Loading subscriptions…'}
            hoverTone="hover:border-emerald-200 hover:shadow-[0_14px_30px_-14px_rgba(16,185,129,0.45)]" />
          <StatCard label="Total Purchases" value={formatNumber(stats.purchases)} icon={ShoppingBag} iconTone="bg-blue-100 text-blue-600"
            foot={stats.purchaseGrowth === null ? 'Package purchases' : (
              <>
                <span className={clsx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold', stats.purchaseGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                  {stats.purchaseGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{stats.purchaseGrowth >= 0 ? '+' : ''}{stats.purchaseGrowth.toFixed(1)}%
                </span> vs previous 30 days
              </>
            )}
            hoverTone="hover:border-blue-200 hover:shadow-[0_14px_30px_-14px_rgba(59,130,246,0.45)]" />
          <StatCard label="Revenue (YTD)" value={inrCompact(stats.revenueYtd)} icon={BadgeIndianRupee} iconTone="bg-rose-100 text-rose-600"
            foot={<><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{inrCompact(stats.revenueAll)} all-time package billing</>}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packages, tier, or ad range..." className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select value={tierFilter} onChange={setTierFilter} options={[{ value: 'all', label: `All Tiers (${stats.tiersInUse})` }, ...TIERS.map((t) => ({ value: t, label: `${TIER_META[t].label} (${tierCounts[t] || 0})` }))]} />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            {(search || tierFilter !== 'all' || statusFilter !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setTierFilter('all'); setStatusFilter('all'); }} title="Clear filters" aria-label="Clear filters" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-[#C81345] hover:bg-pink-50"><X className="h-4 w-4" /></button>
            )}
            <button type="button" onClick={() => { loadPackages(); loadPurchases(); }} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]">
              <RotateCw className={clsx('h-4 w-4', (packages.status === 'loading' || purchases.status === 'loading') && 'animate-spin')} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Package', 'Tier', 'Price', 'Coins', 'Validity', 'Ad Limits', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-16 px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {packages.status === 'loading' && !rows.length ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading packages…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Archive className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{packages.error ? `Error: ${packages.error}` : 'No packages found'}</p></td></tr>
                ) : visible.map((row) => {
                  const meta = TIER_META[row.tier];
                  return (
                    <tr key={row.id} onClick={() => openForm(row)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', !row.active && 'opacity-70')}>
                      <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                        <div className="flex items-center gap-3">
                          <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110', meta.tile)}><meta.icon className="h-5 w-5" /></span>
                          <div className="min-w-0">
                            <p className="max-w-[200px] text-[13.5px] font-bold leading-snug text-neutral-900 transition-colors group-hover:text-[#C81345]">{row.name}</p>
                            <p className="max-w-[200px] truncate text-[11.5px] text-neutral-500">{row.description || `${row.features.length} features`}</p>
                            <p className="text-[10.5px] font-semibold text-[#8E35B5]">{formatNumber(row.sold)} sold{row.revenue ? ` · ${inrCompact(row.revenue)}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', meta.pill)}>{meta.label}</span></td>
                      <td className="px-4 py-3">
                        <p className="text-[14px] font-extrabold text-neutral-900">{inr(row.price)}</p>
                        <p className="text-[11px] font-semibold text-neutral-500">/ {validityLabel(row.validity)}</p>
                        {row.discount > 0 && row.basePrice > row.price && <p className="text-[10.5px] text-neutral-400"><span className="line-through">{inr(row.basePrice)}</span> <span className="font-bold text-emerald-600">{row.discount}% off</span></p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[13px] font-extrabold text-amber-700">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-white">₿</span>
                          {formatNumber(row.coins)} <span className="text-[10.5px] font-semibold">Bcoins</span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[11.5px] font-bold text-neutral-700">{row.validity} days</span></td>
                      <td className="px-4 py-3">
                        <p className="text-[12.5px] font-bold text-neutral-900">{row.adsLabel}</p>
                        <p className="text-[11px] font-semibold text-neutral-500">Spotlights</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', row.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>
                          <span className={clsx('h-1.5 w-1.5 rounded-full', row.active ? 'bg-emerald-500' : 'bg-neutral-400')} />{row.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-neutral-700">{row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="px-4 py-3"><RowMenu row={row} onEdit={() => openForm(row)} onToggle={() => setConfirm(row)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of {formatNumber(filtered.length)} packages</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span> : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#C81345] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>{p}</button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PackageForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSaved={() => { loadPackages(); showToast(editing ? 'Package updated' : 'Package created'); }} />
      <MatrixModal open={matrixOpen} onClose={() => setMatrixOpen(false)} rows={rows} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runToggle}
        title={confirm?.active ? 'Deactivate package' : 'Reactivate package'}
        description={confirm?.active ? `Hide "${confirm?.name}" from vendors? Existing subscriptions keep running.` : `Make "${confirm?.name}" available to vendors again?`}
        confirmText={confirm?.active ? 'Deactivate' : 'Reactivate'}
        confirmVariant={confirm?.active ? 'danger' : 'primary'}
        note="You can change this again at any time."
        loading={busy}
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default VendorPackages;
