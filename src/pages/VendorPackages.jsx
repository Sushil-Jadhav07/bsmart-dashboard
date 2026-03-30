import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Package, History, ArrowRightLeft, Plus, Edit2,
  Trash2, CheckCircle, X, Save, Loader2, AlertCircle,
  RefreshCw, Wallet, TrendingUp, TrendingDown, Star,
  Zap, Calculator, Clock, ListChecks, BadgePercent,
  Sparkles, LayoutGrid,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import {
  fetchAllPackages,
  adminFetchAllPurchases,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeactivatePackage,
  fetchMyActivePackage,
  fetchMyCoinPreview,
  fetchMyPackageHistory,
  fetchMyTransactions,
  resetMutation,
  resetCoinPreview,
} from '../store/vendorPackagesSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';

// ─── Constants (from user story) ─────────────────────────────────────────────

// Budget options: ₹5,000 to ₹1,00,000 in steps of ₹5,000
const BUDGET_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5000);

const TIER_ORDER = ['basic', 'standard', 'premium', 'enterprise'];

// Tier styles using only the project's color palette (neutral + primary/secondary)
const TIER_CONFIG = {
  basic:      { bg: 'bg-neutral-100',  text: 'text-neutral-600', dot: 'bg-neutral-400',  border: 'border-neutral-200' },
  standard:   { bg: 'bg-neutral-100',  text: 'text-neutral-700', dot: 'bg-neutral-500',  border: 'border-neutral-200' },
  premium:    { bg: 'bg-primary/10',   text: 'text-primary',     dot: 'bg-primary',       border: 'border-primary/20' },
  enterprise: { bg: 'bg-secondary/10', text: 'text-secondary',   dot: 'bg-secondary',     border: 'border-secondary/20' },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtINR   = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
const fmtCoins = (v) => v != null ? Number(v).toLocaleString('en-IN') : '—';

// ─── Shared small components ──────────────────────────────────────────────────

const TierBadge = ({ tier }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {tier || '—'}
    </span>
  );
};

const StatusPill = ({ active }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const FieldLabel = ({ children, required, hint }) => (
  <label className="block mb-1.5">
    <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">{children}</span>
    {required && <span className="text-primary ml-0.5">*</span>}
    {hint && <span className="ml-1.5 text-xs font-normal text-neutral-400 normal-case tracking-normal">{hint}</span>}
  </label>
);

const InputField = ({ className = '', ...props }) => (
  <input
    className={`w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm bg-white text-neutral-800
      placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
      transition-colors ${className}`}
    {...props}
  />
);

const SelectField = ({ children, className = '', ...props }) => (
  <select
    className={`w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm bg-white text-neutral-800
      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors ${className}`}
    {...props}
  >
    {children}
  </select>
);

const TextareaField = ({ className = '', ...props }) => (
  <textarea
    className={`w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm bg-white text-neutral-800
      placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
      transition-colors resize-none ${className}`}
    {...props}
  />
);

const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex-1 h-px bg-neutral-100" />
    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">{label}</span>
    <div className="flex-1 h-px bg-neutral-100" />
  </div>
);

const EmptyState = ({ icon: Icon = Package, title = 'No data found', subtitle }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
      <Icon className="w-6 h-6 text-neutral-300" />
    </div>
    <p className="text-sm font-semibold text-neutral-500">{title}</p>
    {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
  </div>
);

const LoadingState = ({ msg = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Loader2 className="w-7 h-7 text-primary animate-spin" />
    <p className="text-sm text-neutral-400">{msg}</p>
  </div>
);

const ErrorState = ({ msg, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
      <AlertCircle className="w-6 h-6 text-red-400" />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-neutral-600">Something went wrong</p>
      <p className="text-xs text-neutral-400 mt-1">{msg}</p>
    </div>
    {onRetry && (
      <button onClick={onRetry}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium">
        <RefreshCw className="w-3.5 h-3.5" /> Try again
      </button>
    )}
  </div>
);

// ─── Features input — dynamic add/remove ─────────────────────────────────────

const FeaturesInput = ({ features, onChange }) => {
  const [draft, setDraft] = useState('');

  const add = () => {
    const val = draft.trim();
    if (!val) return;
    onChange([...features, val]);
    setDraft('');
  };

  const remove = (idx) => onChange(features.filter((_, i) => i !== idx));

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <InputField
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a feature and press + or Enter…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-brand disabled:opacity-40
            disabled:cursor-not-allowed text-white flex items-center justify-center transition-opacity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {features.length > 0 ? (
        <div className="space-y-1.5">
          {features.map((feat, idx) => (
            <div key={idx}
              className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 group">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold
                flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm text-neutral-700 flex-1">{feat}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-400
                  hover:text-red-500 hover:border-red-200 flex items-center justify-center flex-shrink-0
                  opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-400 pl-1">No features added yet. Type above and click +</p>
      )}
    </div>
  );
};

// ─── Package Form Modal ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', tier: 'basic',
  ads_allowed_min: '', ads_allowed_max: '',
  base_price: '', discount_percent: '0',
  final_price: '', coins_granted: '0',
  validity_days: '30', description: '',
  is_active: true,
};

const toForm = (pkg) => ({
  name:             pkg.name             || '',
  tier:             pkg.tier             || 'basic',
  ads_allowed_min:  String(pkg.ads_allowed_min ?? ''),
  ads_allowed_max:  String(pkg.ads_allowed_max ?? ''),
  base_price:       String(pkg.base_price       ?? ''),
  discount_percent: String(pkg.discount_percent ?? '0'),
  final_price:      String(pkg.final_price      ?? ''),
  coins_granted:    String(pkg.coins_granted    ?? '0'),
  validity_days:    String(pkg.validity_days    ?? '30'),
  description:      pkg.description            || '',
  is_active:        pkg.is_active !== false,
});

const PackageFormModal = ({ pkg, onClose, onSave, saving, mutationError }) => {
  const isEdit = Boolean(pkg?._id || pkg?.id);
  const [form, setForm]         = useState(isEdit ? toForm(pkg) : { ...EMPTY_FORM });
  const [features, setFeatures] = useState(isEdit ? (pkg.features || []) : []);
  const [errors, setErrors]     = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  // Auto-recalculate final_price from base_price & discount_percent
  const recalcFinalPrice = (bp, dp) => {
    const b = Number(bp), d = Number(dp);
    if (b > 0) set('final_price', String(Math.round(b - (b * d / 100))));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name = 'Required';
    if (!form.base_price)            e.base_price = 'Required';
    if (form.ads_allowed_min === '') e.ads_allowed_min = 'Required';
    if (form.ads_allowed_max === '') e.ads_allowed_max = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(
      {
        name:             form.name.trim(),
        tier:             form.tier,
        ads_allowed_min:  Number(form.ads_allowed_min),
        ads_allowed_max:  Number(form.ads_allowed_max),
        base_price:       Number(form.base_price),
        discount_percent: Number(form.discount_percent),
        final_price:      form.final_price !== '' ? Number(form.final_price) : undefined,
        coins_granted:    Number(form.coins_granted),
        validity_days:    Number(form.validity_days),
        description:      form.description.trim(),
        features,
        is_active:        form.is_active,
      },
      isEdit ? (pkg._id || pkg.id) : null
    );
  };

  const isPremiumTier = ['premium', 'enterprise'].includes(form.tier);

  return (
    <div className="fixed !m-0 inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-2xl my-4 border border-neutral-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-800">
                {isEdit ? 'Edit Package' : 'Create New Package'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isEdit ? 'Update package details' : 'Fill in the details below'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

          <SectionDivider label="Basic Info" />

          {/* Name + Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Package Name</FieldLabel>
              <InputField value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <FieldLabel required>Tier</FieldLabel>
              <SelectField value={form.tier} onChange={e => set('tier', e.target.value)}>
                {TIER_ORDER.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Tier coin-logic note — updates live */}
          <div className={`rounded-xl px-4 py-3 text-xs border ${
            isPremiumTier
              ? 'bg-primary/5 border-primary/20 text-primary'
              : 'bg-neutral-50 border-neutral-200 text-neutral-500'
          }`}>
            {isPremiumTier
              ? <><span className="font-bold">✦ Bonus tier ({form.tier}):</span> Vendor gets base coins <em>plus</em> additional coins equal to the selected ad budget. Example: ₹10,000 budget → 40,000 base + 10,000 bonus = 50,000 total coins.</>
              : <><span className="font-bold">ℹ Basic/Standard tier:</span> Vendor gets base coins only (₹1 = 4 coins). No additional bonus coins.</>
            }
          </div>

          <SectionDivider label="Ad Slots" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Min Ads Allowed</FieldLabel>
              <InputField type="number" min="1" value={form.ads_allowed_min}
                onChange={e => set('ads_allowed_min', e.target.value)} placeholder="1" />
              {errors.ads_allowed_min && <p className="text-xs text-red-500 mt-1">{errors.ads_allowed_min}</p>}
            </div>
            <div>
              <FieldLabel required hint="(999 = unlimited)">Max Ads Allowed</FieldLabel>
              <InputField type="number" min="1" value={form.ads_allowed_max}
                onChange={e => set('ads_allowed_max', e.target.value)} placeholder="25" />
              {errors.ads_allowed_max && <p className="text-xs text-red-500 mt-1">{errors.ads_allowed_max}</p>}
            </div>
          </div>

          <SectionDivider label="Pricing" />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Base Price (₹)</FieldLabel>
              <InputField type="number" min="0" value={form.base_price}
                onChange={e => set('base_price', e.target.value)}
                onBlur={() => recalcFinalPrice(form.base_price, form.discount_percent)}
                placeholder="100000" />
              {errors.base_price && <p className="text-xs text-red-500 mt-1">{errors.base_price}</p>}
            </div>
            <div>
              <FieldLabel hint="(0–100)">Discount %</FieldLabel>
              <InputField type="number" min="0" max="100" value={form.discount_percent}
                onChange={e => set('discount_percent', e.target.value)}
                onBlur={() => recalcFinalPrice(form.base_price, form.discount_percent)}
                placeholder="80" />
            </div>
            <div>
              <FieldLabel hint="(auto-calculated)">Final Price (₹)</FieldLabel>
              <InputField type="number" min="0" value={form.final_price}
                onChange={e => set('final_price', e.target.value)} placeholder="20000" />
              <p className="text-[10px] text-neutral-400 mt-1">Override or leave for auto-calc</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel hint="(credited instantly on purchase)">Coins Granted</FieldLabel>
              <InputField type="number" min="0" value={form.coins_granted}
                onChange={e => set('coins_granted', e.target.value)} placeholder="0" />
            </div>
            <div>
              <FieldLabel hint="(0 = never expires)">Validity Days</FieldLabel>
              <InputField type="number" min="0" value={form.validity_days}
                onChange={e => set('validity_days', e.target.value)} placeholder="30" />
            </div>
          </div>

          <SectionDivider label="Details" />

          <div>
            <FieldLabel>Description</FieldLabel>
            <TextareaField rows={2} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Premium package with bonus coins on every ad budget" />
          </div>

          <div>
            <FieldLabel hint="(add one at a time)">Features</FieldLabel>
            <FeaturesInput features={features} onChange={setFeatures} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <p className="text-sm font-semibold text-neutral-700">Package Active</p>
              <p className="text-xs text-neutral-400">Inactive packages are hidden from vendors</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-neutral-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {mutationError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{mutationError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-2xl">
          <button onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-700 font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-brand disabled:opacity-50 disabled:cursor-not-allowed
              text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity shadow-soft"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : isEdit ? 'Update Package' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Coin Preview Panel ───────────────────────────────────────────────────────
// Implements user story:
//   Basic/Standard  → base coins only  (budget × 4)
//   Premium/Enterprise → base + additional (= budget amount)
//   Example: Premium, ₹10,000 → 40,000 + 10,000 = 50,000 coins

const CoinPreviewPanel = ({ activePackage }) => {
  const dispatch = useDispatch();
  const { coinPreview, coinPreviewStatus, coinPreviewError } = useSelector(s => s.vendorPackages);
  const [budget, setBudget] = useState(10000);

  if (!activePackage) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-700">No active package</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Purchase a package to unlock ad budget coin calculations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Budget selector */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Select Ad Budget
          <span className="ml-1.5 font-normal text-neutral-400 normal-case tracking-normal">
            (₹5,000 – ₹1,00,000 in steps of ₹5,000)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setBudget(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                budget === opt
                  ? 'bg-gradient-brand text-white border-primary shadow-soft'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary hover:text-primary'
              }`}>
              {fmtINR(opt)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => dispatch(fetchMyCoinPreview(budget))}
        disabled={coinPreviewStatus === 'loading'}
        className="flex items-center gap-2 bg-gradient-brand disabled:opacity-50 disabled:cursor-not-allowed
          text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity"
      >
        {coinPreviewStatus === 'loading'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Calculator className="w-4 h-4" />}
        {coinPreviewStatus === 'loading' ? 'Calculating…' : 'Preview Coin Breakdown'}
      </button>

      {coinPreviewError && <p className="text-sm text-red-500">{coinPreviewError}</p>}

      {/* Coin breakdown — matches user story display */}
      {coinPreview && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-white">
            <span className="text-sm font-bold text-neutral-800">Coin Breakdown</span>
            <TierBadge tier={coinPreview.tier} />
          </div>
          <div className="px-5 py-4 space-y-3">
            {/* Paid Amount */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500">Paid Amount</span>
              <span className="font-bold text-neutral-800">{fmtINR(coinPreview.paid_amount_inr)}</span>
            </div>
            {/* Package name */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500">Package</span>
              <span className="text-neutral-700">{coinPreview.package_name}</span>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* Base Coins */}
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-neutral-700 font-medium">Base Coins</span>
                <span className="ml-1.5 text-xs text-neutral-400">(₹1 = 4 coins)</span>
              </div>
              <span className="font-bold text-neutral-800">{fmtCoins(coinPreview.base_coins)}</span>
            </div>

            {/* Additional Benefits */}
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-neutral-700 font-medium">Additional Benefits</span>
                {coinPreview.additional_coins > 0 && (
                  <span className="ml-1.5 text-xs text-primary">(Premium bonus)</span>
                )}
              </div>
              <span className={`font-bold ${coinPreview.additional_coins > 0 ? 'text-primary' : 'text-neutral-400'}`}>
                {coinPreview.additional_coins > 0 ? `+${fmtCoins(coinPreview.additional_coins)}` : 'None'}
              </span>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-neutral-800">Total Coins</span>
              <span className="text-xl font-black text-primary">{fmtCoins(coinPreview.total_coins)}</span>
            </div>

            <p className="text-[11px] text-neutral-400">{coinPreview.conversion_note}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Package Card (All Packages tab) ─────────────────────────────────────────

const PackageCard = ({ pkg, onEdit, onDeactivate, canManage = true }) => {
  const isPremiumTier = ['premium', 'enterprise'].includes(pkg.tier);
  const tierCfg = TIER_CONFIG[pkg.tier] || TIER_CONFIG.basic;

  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 shadow-card hover:shadow-soft
      transition-shadow overflow-hidden ${!pkg.is_active ? 'opacity-60' : ''}`}>
      {/* Top colour accent */}
      <div className={`h-1 ${isPremiumTier ? 'bg-gradient-brand' : 'bg-neutral-200'}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TierBadge tier={pkg.tier} />
              <StatusPill active={pkg.is_active} />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mt-1">{pkg.name}</h3>
            {pkg.description && (
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{pkg.description}</p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button onClick={() => onEdit(pkg)}
                className="w-8 h-8 rounded-lg bg-neutral-50 hover:bg-primary/10 hover:text-primary
                  flex items-center justify-center text-neutral-400 transition-colors border border-neutral-100">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDeactivate(pkg._id || pkg.id)}
                className="w-8 h-8 rounded-lg bg-neutral-50 hover:bg-red-50 hover:text-red-500
                  flex items-center justify-center text-neutral-400 transition-colors border border-neutral-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-end gap-2 mb-4">
          <span className="text-2xl font-black text-neutral-800">{fmtINR(pkg.final_price)}</span>
          <div className="mb-0.5">
            <span className="text-xs text-neutral-400 line-through block">{fmtINR(pkg.base_price)}</span>
            <span className="text-xs font-semibold text-emerald-600">{pkg.discount_percent}% off</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Ads',        value: `${pkg.ads_allowed_min}–${pkg.ads_allowed_max === 999 ? '∞' : pkg.ads_allowed_max}` },
            { label: 'Validity',   value: pkg.validity_days > 0 ? `${pkg.validity_days}d` : '∞' },
            { label: 'On Purchase', value: pkg.coins_granted > 0 ? `${fmtCoins(pkg.coins_granted)} c` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-50 rounded-xl p-2.5 text-center border border-neutral-100">
              <p className="text-[10px] text-neutral-400 mb-0.5">{label}</p>
              <p className="text-xs font-bold text-neutral-700">{value}</p>
            </div>
          ))}
        </div>

        {/* Coin bonus badge for premium/enterprise — from user story */}
        {isPremiumTier && (
          <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-xs text-primary font-medium">
              Bonus coins = ad budget on every ad (Premium benefit)
            </p>
          </div>
        )}

        {/* Features list */}
        {pkg.features?.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            {pkg.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Stat mini-card ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, gradient = false }) => (
  <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${gradient ? 'bg-gradient-brand' : 'bg-neutral-100'}`}>
      <Icon className={`w-5 h-5 ${gradient ? 'text-white' : 'text-neutral-500'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
      <div className="text-sm font-bold text-neutral-800 truncate">{value}</div>
    </div>
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'packages',   label: 'All Packages',     icon: LayoutGrid     },
  { id: 'purchases',  label: 'Admin Purchases',   icon: ListChecks     },
  { id: 'my-active',  label: 'My Active Package', icon: Star           },
  { id: 'my-history', label: 'Purchase History',  icon: History        },
  { id: 'my-txn',     label: 'Transactions',      icon: ArrowRightLeft },
];

const ADMIN_TABS = TABS.filter((tab) => tab.id === 'packages' || tab.id === 'purchases');
const VENDOR_TABS = TABS.filter((tab) => tab.id !== 'purchases');

// ─── Main page ────────────────────────────────────────────────────────────────

const VendorPackages = () => {
  const dispatch = useDispatch();
  const authUser = useSelector(s => s.auth.user);
  const vp = useSelector(s => s.vendorPackages);
  const [activeTab, setActiveTab] = useState('packages');
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg]     = useState(null);
  const role = authUser?.role || authUser?.user?.role || '';
  const isAdmin = role === 'admin';
  const visibleTabs = isAdmin ? ADMIN_TABS : VENDOR_TABS;

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'packages');
    }
  }, [activeTab, visibleTabs]);

  // ── Lazy fetch on tab switch ─────────────────────────────────────────────────
  useEffect(() => {
    if (vp.packagesStatus === 'idle') dispatch(fetchAllPackages());
  }, [dispatch, vp.packagesStatus]);

  useEffect(() => {
    if (activeTab === 'purchases' && vp.adminPurchasesStatus === 'idle')
      dispatch(adminFetchAllPurchases());
  }, [dispatch, activeTab, vp.adminPurchasesStatus]);

  useEffect(() => {
    if (activeTab === 'my-active' && vp.myActiveStatus === 'idle')
      dispatch(fetchMyActivePackage());
  }, [dispatch, activeTab, vp.myActiveStatus]);

  useEffect(() => {
    if (activeTab === 'my-history' && vp.myHistoryStatus === 'idle')
      dispatch(fetchMyPackageHistory());
  }, [dispatch, activeTab, vp.myHistoryStatus]);

  useEffect(() => {
    if (activeTab === 'my-txn' && vp.myTransactionsStatus === 'idle')
      dispatch(fetchMyTransactions());
  }, [dispatch, activeTab, vp.myTransactionsStatus]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const handleSave = async (payload, pkgId) => {
    const action = pkgId
      ? await dispatch(adminUpdatePackage({ packageId: pkgId, payload }))
      : await dispatch(adminCreatePackage(payload));
    if (!action.error) {
      dispatch(resetMutation());
      setShowModal(false);
      setEditPkg(null);
      dispatch(fetchAllPackages());
    }
  };

  const handleDeactivate = async (pkgId) => {
    if (!window.confirm('Deactivate this package? It will be hidden from vendors.')) return;
    await dispatch(adminDeactivatePackage(pkgId));
  };

  const openEdit    = (pkg) => { setEditPkg(pkg); setShowModal(true); };
  const closeModal  = () => { setShowModal(false); setEditPkg(null); dispatch(resetMutation()); };

  // ── Column configs ────────────────────────────────────────────────────────────

  const purchaseCols = [
    {
      key: 'vendor_id', title: 'Vendor',
      render: v => <span className="text-sm font-medium">{v?.business_name || '—'}</span>
    },
    {
      key: 'user_id', title: 'User',
      render: v => <span className="text-xs text-neutral-500">{v?.email || v?.username || '—'}</span>
    },
    {
      key: 'package_id', title: 'Package',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{v.name}</span>
          <TierBadge tier={v.tier} />
        </div>
      ) : '—'
    },
    { key: 'amount_paid',    title: 'Paid',           render: v => <span className="font-semibold">{fmtINR(v)}</span> },
    { key: 'coins_credited', title: 'Coins Credited',
      render: v => <span className="text-primary font-semibold">{fmtCoins(v)}</span> },
    {
      key: 'status', title: 'Status',
      render: v => <Badge variant={v === 'active' ? 'success' : v === 'superseded' ? 'secondary' : 'danger'}>{v}</Badge>
    },
    { key: 'purchased_at', title: 'Purchased',
      render: (v, r) => <span className="text-xs text-neutral-500">{formatDateTime(v || r.createdAt)}</span> },
    { key: 'expires_at', title: 'Expires',
      render: v => v
        ? <span className="text-xs text-neutral-500">{formatDateTime(v)}</span>
        : <span className="text-xs text-neutral-300">Never</span> },
  ];

  const historyCols = [
    {
      key: 'package_id', title: 'Package',
      render: (v, r) => {
        const name = v?.name || r.package_snapshot?.name || '—';
        const tier = v?.tier || r.package_snapshot?.tier;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{name}</span>
            {tier && <TierBadge tier={tier} />}
          </div>
        );
      }
    },
    { key: 'amount_paid',    title: 'Amount Paid',    render: v => <span className="font-semibold">{fmtINR(v)}</span> },
    { key: 'coins_credited', title: 'Coins Credited',
      render: v => <span className="text-primary font-semibold">{fmtCoins(v)}</span> },
    {
      key: 'status', title: 'Status',
      render: v => <Badge variant={v === 'active' ? 'success' : v === 'superseded' ? 'secondary' : 'danger'}>{v}</Badge>
    },
    { key: 'purchased_at', title: 'Purchased',
      render: (v, r) => <span className="text-xs text-neutral-500">{formatDateTime(v || r.createdAt)}</span> },
    { key: 'expires_at', title: 'Expires',
      render: v => v
        ? <span className="text-xs text-neutral-500">{formatDateTime(v)}</span>
        : <span className="text-xs text-neutral-300">Never</span> },
  ];

  const txnCols = [
    {
      key: 'type', title: 'Type',
      render: v => <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">{v}</span>
    },
    {
      key: 'amount', title: 'Coins',
      render: (v, r) => (
        <span className={`flex items-center gap-1 text-sm font-bold ${r.direction === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
          {r.direction === 'credit' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {r.direction === 'credit' ? '+' : ''}{fmtCoins(v)}
        </span>
      )
    },
    { key: 'description', title: 'Description',
      render: v => <span className="text-xs text-neutral-500 max-w-xs truncate block">{v || '—'}</span> },
    {
      key: 'status', title: 'Status',
      render: v => <Badge variant={v === 'SUCCESS' ? 'success' : 'danger'}>{v}</Badge>
    },
    { key: 'created_at', title: 'Date',
      render: v => <span className="text-xs text-neutral-500">{formatDateTime(v)}</span> },
  ];

  // ── Tab content renderers ─────────────────────────────────────────────────────

  const renderPackagesTab = () => {
    if (vp.packagesStatus === 'loading') return <LoadingState msg="Loading packages…" />;
    if (vp.packagesStatus === 'failed')  return <ErrorState msg={vp.packagesError} onRetry={() => dispatch(fetchAllPackages())} />;
    if (!vp.packages.length) return (
      <EmptyState icon={Package} title="No packages yet"
        subtitle={isAdmin ? 'Click "Create Package" to add your first vendor package.' : 'No active packages are available right now.'} />
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vp.packages.map(pkg => (
          <PackageCard key={pkg._id || pkg.id} pkg={pkg} onEdit={openEdit} onDeactivate={handleDeactivate} canManage={isAdmin} />
        ))}
      </div>
    );
  };

  const renderPurchasesTab = () => {
    if (vp.adminPurchasesStatus === 'loading') return <LoadingState msg="Loading purchases…" />;
    if (vp.adminPurchasesStatus === 'failed')  return <ErrorState msg={vp.adminPurchasesError} onRetry={() => dispatch(adminFetchAllPurchases())} />;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total Purchases:</span>
          <span className="text-sm font-bold text-neutral-700">{vp.adminPurchasesTotal}</span>
        </div>
        <Table columns={purchaseCols} data={vp.adminPurchases} searchable pagination pageSize={10} emptyMessage="No purchases found" />
      </div>
    );
  };

  const renderMyActiveTab = () => {
    if (vp.myActiveStatus === 'loading') return <LoadingState msg="Loading active package…" />;
    if (vp.myActiveStatus === 'failed')  return <ErrorState msg={vp.myActiveError} onRetry={() => dispatch(fetchMyActivePackage())} />;

    const ap = vp.myActivePackage;

    return (
      <div className="space-y-6">
        {ap ? (
          <>
            {/* Hero banner — gradient-brand */}
            <div className="bg-gradient-brand rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Active Package</p>
                  <h3 className="text-xl font-black">{ap.package?.name || '—'}</h3>
                  <p className="text-white/70 text-sm capitalize mt-0.5">{ap.package?.tier} tier</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs mb-1">Amount Paid</p>
                  <p className="text-2xl font-black">{fmtINR(ap.amount_paid)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Ads Allowed', value: ap.package ? `${ap.package.ads_allowed_min}–${ap.package.ads_allowed_max === 999 ? '∞' : ap.package.ads_allowed_max}` : '—' },
                  { label: 'Purchased',   value: formatDateTime(ap.purchased_at) },
                  { label: 'Expires',     value: ap.expires_at ? formatDateTime(ap.expires_at) : 'Never' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/15 rounded-xl p-3">
                    <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-white text-xs font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Coins Credited" value={`${fmtCoins(ap.coins_credited)} coins`} icon={Zap} gradient />
              <StatCard label="Status"         value={ap.status}                               icon={CheckCircle} />
              <StatCard label="Validity"       value={ap.package?.validity_days > 0 ? `${ap.package.validity_days} days` : 'No expiry'} icon={Clock} />
              <StatCard label="Discount"       value={`${ap.package?.discount_percent || 0}% off`} icon={BadgePercent} />
            </div>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-amber-800 font-bold">No Active Package</p>
            <p className="text-amber-600 text-sm mt-1">Go to &quot;All Packages&quot; to purchase a package.</p>
          </div>
        )}

        {/* Ad Budget Coin Preview (user story feature) */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800">Ad Budget Coin Preview</h3>
              <p className="text-xs text-neutral-400">
                Calculate coins for any ad budget based on your active package tier
              </p>
            </div>
          </div>
          <div className="p-6">
            <CoinPreviewPanel activePackage={ap} />
          </div>
        </div>
      </div>
    );
  };

  const renderMyHistoryTab = () => {
    if (vp.myHistoryStatus === 'loading') return <LoadingState msg="Loading history…" />;
    if (vp.myHistoryStatus === 'failed')  return <ErrorState msg={vp.myHistoryError} onRetry={() => dispatch(fetchMyPackageHistory())} />;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total:</span>
          <span className="text-sm font-bold text-neutral-700">{vp.myHistoryTotal} purchases</span>
        </div>
        <Table columns={historyCols} data={vp.myHistory} searchable pagination pageSize={10} emptyMessage="No purchase history" />
      </div>
    );
  };

  const renderMyTxnTab = () => {
    if (vp.myTransactionsStatus === 'loading') return <LoadingState msg="Loading transactions…" />;
    if (vp.myTransactionsStatus === 'failed')  return <ErrorState msg={vp.myTransactionsError} onRetry={() => dispatch(fetchMyTransactions())} />;
    return (
      <div className="space-y-4">
        {/* Wallet balance banner using brand gradient */}
        <div className="flex items-center gap-4 bg-gradient-brand rounded-2xl px-5 py-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium">Wallet Balance</p>
            <p className="text-xl font-black">
              {fmtCoins(vp.myWalletBalance)} <span className="text-sm font-semibold text-white/60">coins</span>
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/60 text-xs">Total Transactions</p>
            <p className="text-sm font-bold">{vp.myTransactionsTotal}</p>
          </div>
        </div>
        <Table columns={txnCols} data={vp.myTransactions} searchable pagination pageSize={20} emptyMessage="No transactions found" />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'packages':   return renderPackagesTab();
      case 'purchases':  return renderPurchasesTab();
      case 'my-active':  return renderMyActiveTab();
      case 'my-history': return renderMyHistoryTab();
      case 'my-txn':     return renderMyTxnTab();
      default: return null;
    }
  };

  const activeCount   = vp.packages.filter(p => p.is_active).length;
  const inactiveCount = vp.packages.length - activeCount;
  const totalPackageRevenue = vp.packages.reduce((sum, pkg) => sum + Number(pkg?.final_price || 0), 0);

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-800">Vendor Packages</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {isAdmin
              ? 'Manage package pricing, tiers, coin rules and vendor purchases'
              : 'Browse packages, active plan details and transaction history'}
          </p>
          {activeTab === 'packages' && vp.packages.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-neutral-400">{activeCount} active</span>
              <span className="text-neutral-200">·</span>
              <span className="text-xs text-neutral-400">{inactiveCount} inactive</span>
              <span className="text-neutral-200">·</span>
              <span className="text-xs text-neutral-400">{vp.packages.length} total</span>
              {isAdmin && (
                <>
                  <span className="text-neutral-200">|</span>
                  <span className="text-xs text-neutral-400">{fmtINR(totalPackageRevenue)} listed value</span>
                </>
              )}
            </div>
          )}
        </div>
        {isAdmin && activeTab === 'packages' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(fetchAllPackages())}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700
                border border-neutral-200 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={() => { setEditPkg(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-brand text-white text-sm font-semibold
                px-4 py-2 rounded-xl shadow-soft transition-opacity hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Create Package
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-soft p-1 flex gap-1 overflow-x-auto">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap
              transition-all flex-1 justify-center ${
              activeTab === id
                ? 'bg-gradient-brand text-white shadow-soft'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-soft p-6">
        {renderContent()}
      </div>

      {/* Modal */}
      {isAdmin && showModal && (
        <PackageFormModal
          pkg={editPkg}
          onClose={closeModal}
          onSave={handleSave}
          saving={vp.mutationStatus === 'loading'}
          mutationError={vp.mutationError}
        />
      )}
    </div>
  );
};

export default VendorPackages;
