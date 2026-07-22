import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowLeft, Gift, Loader2, Upload, Image as ImageIcon,
  X, Plus, Trash2, IndianRupee, Coins,
  FileText, Building2, Tag, CheckCircle2, AlertCircle,
} from 'lucide-react';
import {
  createGiftCard, uploadGiftCardMedia,
  clearSaveStatus, clearUploadStatus,
} from '../store/giftCardsSlice.js';

// ── Shared field helpers (used by Edit too) ────────────────────────────────

export function SectionCard({ children, className }) {
  return (
    <div className={clsx('bg-white rounded-2xl border border-neutral-200 p-5', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon: Icon, iconBg, iconColor, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon className={clsx('w-3.5 h-3.5', iconColor)} />
      </div>
      <h2 className="text-[14px] font-bold text-neutral-800">{children}</h2>
    </div>
  );
}

export function FieldLabel({ children, required }) {
  return (
    <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function FieldError({ msg }) {
  return msg ? <p className="text-[11px] text-red-500 mt-1">{msg}</p> : null;
}

export function FieldHint({ children }) {
  return <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{children}</p>;
}

// ── GiftCard form (shared by Create + Edit) ────────────────────────────────

export function GiftCardForm({ initialValues = {}, onSubmit, saving, saveError, title, breadcrumb }) {
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const fileInputRef = useRef(null);

  const { uploadStatus, uploadError } = useSelector((s) => s.giftCards);

  const [form, setForm] = useState({
    title:       initialValues.title       ?? '',
    description: initialValues.description ?? '',
    vendor:      initialValues.vendor      ?? '',
    card_status: initialValues.card_status ?? 'active',
  });

  // Uploaded media (populated after /upload call)
  const [media, setMedia] = useState(
    initialValues.media?.url
      ? { url: initialValues.media.url, type: initialValues.media.type ?? 'image', preview: initialValues.media.url }
      : null
  );
  const [isDragging, setIsDragging] = useState(false);

  // Denominations
  const [denominations, setDenominations] = useState(
    initialValues.denominations?.length
      ? initialValues.denominations.map((d, i) => ({ id: String(i), bcoins: String(d.bcoins ?? ''), amount: String(d.amount ?? '') }))
      : [{ id: '1', bcoins: '', amount: '' }]
  );

  // Terms & conditions
  const [terms, setTerms] = useState(
    initialValues.terms_and_conditions?.length
      ? initialValues.terms_and_conditions.map((t, i) => ({ id: String(i), text: t }))
      : [{ id: '1', text: '' }]
  );

  const [errors, setErrors]       = useState({});
  const [mediaError, setMediaError] = useState('');

  // Clear stale upload status whenever the form mounts
  useEffect(() => {
    dispatch(clearUploadStatus());
  }, [dispatch]);

  const setField = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  // ── Denomination helpers ────────────────────────────────────────────────

  const addDenomination    = () => setDenominations((p) => [...p, { id: Date.now().toString(), bcoins: '', amount: '' }]);
  const removeDenomination = (id) => setDenominations((p) => p.filter((d) => d.id !== id));
  const updateDenomination = (id, field, value) =>
    setDenominations((p) => p.map((d) => d.id === id ? { ...d, [field]: value } : d));

  // ── Terms helpers ───────────────────────────────────────────────────────

  const addTerm    = () => setTerms((p) => [...p, { id: Date.now().toString(), text: '' }]);
  const removeTerm = (id) => setTerms((p) => p.filter((t) => t.id !== id));
  const updateTerm = (id, value) => setTerms((p) => p.map((t) => t.id === id ? { ...t, text: value } : t));

  // ── Media upload ────────────────────────────────────────────────────────

  const handleFiles = (files) => {
    const file = Array.from(files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setMedia({ url: '', type: 'image', preview });
    dispatch(clearUploadStatus());
    dispatch(uploadGiftCardMedia(file)).then((result) => {
      if (uploadGiftCardMedia.fulfilled.match(result)) {
        const { url, type } = result.payload ?? {};
        setMedia({ url: url ?? '', type: type ?? 'image', preview });
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Validate & submit ───────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    const hasDenom = denominations.some((d) => +d.bcoins > 0 || +d.amount > 0);
    if (!hasDenom) e.denominations = 'Add at least one denomination';
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const body = {
      title:               form.title.trim(),
      description:         form.description.trim(),
      category:            'Gift Cards',
      card_status:         form.card_status,
      vendor:              form.vendor.trim(),
      denominations:       denominations
        .filter((d) => +d.bcoins > 0 || +d.amount > 0)
        .map((d) => ({ bcoins: +d.bcoins || 0, amount: +d.amount || 0 })),
      terms_and_conditions: terms.map((t) => t.text.trim()).filter(Boolean),
      ...(media?.url ? { media: { url: media.url, type: media.type } } : {}),
    };

    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/gift-cards')} className="p-2 rounded-xl border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-400">
            <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/gift-cards')}>Gift Cards</span>
            <span>›</span>
            <span className="text-neutral-600 font-medium">{breadcrumb}</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5">{title}</h1>
        </div>
      </div>

      {/* API error banner */}
      {saveError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[13px] text-red-700">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ① Title */}
          <SectionCard>
            <FieldLabel required>Title</FieldLabel>
            <input
              type="text"
              value={form.title}
              onChange={setField('title')}
              placeholder="e.g. Amazon Gift Card"
              className={clsx(
                'w-full rounded-xl border px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder-neutral-400',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition',
                errors.title ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-neutral-50'
              )}
            />
            <FieldError msg={errors.title} />
          </SectionCard>

          {/* ② Description */}
          <SectionCard>
            <FieldLabel>Description</FieldLabel>
            <div className="flex items-center gap-1 px-2 py-1.5 border border-neutral-200 border-b-0 rounded-t-xl bg-neutral-50">
              {['B', 'I', 'U'].map((t) => (
                <button key={t} type="button"
                  className="w-7 h-7 flex items-center justify-center rounded text-[12px] font-bold text-neutral-500 hover:bg-neutral-200 transition"
                  style={{ fontStyle: t === 'I' ? 'italic' : 'normal', textDecoration: t === 'U' ? 'underline' : 'none' }}
                >{t}</button>
              ))}
              <div className="w-px h-4 bg-neutral-200 mx-1" />
              {['≡', '⊞'].map((t) => (
                <button key={t} type="button" className="w-7 h-7 flex items-center justify-center rounded text-[13px] text-neutral-500 hover:bg-neutral-200 transition">{t}</button>
              ))}
            </div>
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={4}
              placeholder="Describe the gift card — where it can be used, restrictions…"
              className="w-full rounded-b-xl border border-neutral-200 bg-white px-3.5 py-3 text-[13px] text-neutral-800 placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </SectionCard>

          {/* ③ Media */}
          <SectionCard>
            <SectionTitle icon={ImageIcon} iconBg="bg-sky-50" iconColor="text-sky-600">Media</SectionTitle>

            {media?.preview ? (
              <div className="relative rounded-xl overflow-hidden border border-neutral-200 mb-3 bg-neutral-50 w-64">
                <div className="aspect-[4/3] w-full">
                  <img src={media.preview} alt="preview" className="w-full h-full object-contain" />
                </div>
                {uploadStatus === 'loading' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {uploadStatus === 'succeeded' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </div>
                )}
                {uploadStatus === 'failed' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
                    <AlertCircle className="w-3 h-3" /> Upload failed
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setMedia(null); dispatch(clearUploadStatus()); }}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                  <Upload className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-neutral-600">
                    Drop image here or <span className="text-primary underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">PNG, JPG, WEBP · 1 image</p>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            {uploadError && <p className="text-[11px] text-red-500 mt-1.5">{uploadError}</p>}
          </SectionCard>

          {/* ④ Category — static */}
          <SectionCard>
            <SectionTitle icon={Tag} iconBg="bg-amber-50" iconColor="text-amber-600">Category</SectionTitle>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50">
              <Gift className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-neutral-700 flex-1">Gift Cards</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-200/60 px-2 py-0.5 rounded-full">Default</span>
            </div>
            <FieldHint>Gift card products are always filed under the "Gift Cards" category.</FieldHint>
          </SectionCard>

          {/* ⑤ Denominations */}
          <SectionCard>
            <SectionTitle icon={IndianRupee} iconBg="bg-emerald-50" iconColor="text-emerald-600">Denominations</SectionTitle>

            {errors.denominations && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="text-[12px] text-red-600">{errors.denominations}</span>
              </div>
            )}

            {/* Column headers */}
            <div className="grid grid-cols-[32px_1fr_1fr_36px] gap-2 mb-2 px-1">
              <div />
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                  <Coins className="w-3 h-3 text-amber-500" />
                </div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Bcoins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                  <IndianRupee className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Amount</span>
              </div>
              <div />
            </div>

            <div className="space-y-2">
              {denominations.map((d, idx) => (
                <div key={d.id} className="grid grid-cols-[32px_1fr_1fr_36px] gap-2 items-center">
                  <div className="flex items-center justify-center">
                    <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-neutral-100 text-[11px] font-bold text-neutral-400">{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-amber-200 focus-within:border-amber-300 transition">
                    <span className="text-[13px] select-none flex-shrink-0">🪙</span>
                    <input
                      type="number"
                      value={d.bcoins}
                      onChange={(e) => updateDenomination(d.id, 'bcoins', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-neutral-800 placeholder-amber-300 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300 transition">
                    <span className="text-[13px] font-bold text-emerald-500 select-none flex-shrink-0">₹</span>
                    <input
                      type="number"
                      value={d.amount}
                      onChange={(e) => updateDenomination(d.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-neutral-800 placeholder-emerald-300 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDenomination(d.id)}
                    disabled={denominations.length === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary chips */}
            {denominations.some((d) => +d.bcoins > 0 || +d.amount > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {denominations.filter((d) => +d.bcoins > 0 || +d.amount > 0).map((d) => (
                  <div key={d.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-50 border border-neutral-200 text-[11px] font-bold text-neutral-600">
                    {+d.bcoins > 0 && <span className="text-amber-600">🪙 {d.bcoins}</span>}
                    {+d.bcoins > 0 && +d.amount > 0 && <span className="text-neutral-300 mx-0.5">·</span>}
                    {+d.amount > 0 && <span className="text-emerald-700">₹{d.amount}</span>}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addDenomination}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-neutral-200 text-[12px] font-bold text-neutral-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition"
            >
              <Plus className="w-4 h-4" /> Add Denomination
            </button>
          </SectionCard>
        </div>

        {/* ── RIGHT sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Card Status */}
          <SectionCard>
            <SectionTitle icon={Gift} iconBg="bg-primary/10" iconColor="text-primary">Card Status</SectionTitle>
            <div className="space-y-2">
              {[
                { value: 'active',   label: 'Active',   desc: 'Customers can purchase & redeem', dot: 'bg-emerald-400' },
                { value: 'inactive', label: 'Inactive', desc: 'Hidden from customers',           dot: 'bg-neutral-300' },
                { value: 'draft',    label: 'Draft',    desc: 'Saved but not yet live',          dot: 'bg-amber-400'   },
              ].map(({ value, label, desc, dot }) => (
                <label key={value} className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  form.card_status === value ? 'border-primary bg-primary/5' : 'border-neutral-200 hover:bg-neutral-50'
                )}>
                  <input type="radio" name="cardStatus" value={value} checked={form.card_status === value} onChange={setField('card_status')} className="sr-only" />
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5', form.card_status === value ? 'border-primary' : 'border-neutral-300')}>
                    {form.card_status === value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
                      <p className={clsx('text-[13px] font-semibold', form.card_status === value ? 'text-primary' : 'text-neutral-700')}>{label}</p>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </SectionCard>

          {/* Vendor */}
          <SectionCard>
            <SectionTitle icon={Building2} iconBg="bg-indigo-50" iconColor="text-indigo-600">Vendor</SectionTitle>
            <FieldLabel>Vendor name</FieldLabel>
            <input
              type="text"
              value={form.vendor}
              onChange={setField('vendor')}
              placeholder="e.g. Amazon, Flipkart"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            <FieldHint>The brand or business issuing this gift card</FieldHint>
          </SectionCard>

          {/* Terms & Conditions */}
          <SectionCard>
            <SectionTitle icon={FileText} iconBg="bg-rose-50" iconColor="text-rose-500">Terms &amp; Conditions</SectionTitle>
            <div className="space-y-2">
              {terms.map((t, idx) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="w-5 text-[11px] font-bold text-neutral-400 text-center flex-shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={t.text}
                    onChange={(e) => updateTerm(t.id, e.target.value)}
                    placeholder="e.g. Valid for 12 months"
                    className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeTerm(t.id)}
                    disabled={terms.length === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addTerm}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-neutral-200 text-[12px] font-bold text-neutral-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Term
            </button>
          </SectionCard>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={saving || uploadStatus === 'loading'}
              className="w-full py-3 rounded-xl bg-gradient-brand text-[13px] font-bold text-white shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Gift className="w-4 h-4" /> Save Gift Card</>
              }
            </button>
            <button
              type="button"
              onClick={() => navigate('/gift-cards')}
              disabled={saving}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-500 hover:bg-neutral-50 transition"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Create page ────────────────────────────────────────────────────────────

export default function GiftCardCreate() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { saveStatus, saveError } = useSelector((s) => s.giftCards);

  useEffect(() => {
    dispatch(clearSaveStatus());
  }, [dispatch]);

  useEffect(() => {
    if (saveStatus === 'succeeded') {
      dispatch(clearSaveStatus());
      navigate('/gift-cards');
    }
  }, [saveStatus, dispatch, navigate]);

  const handleSubmit = (body) => {
    dispatch(createGiftCard(body));
  };

  return (
    <GiftCardForm
      title="Create Gift Card Product"
      breadcrumb="Create"
      onSubmit={handleSubmit}
      saving={saveStatus === 'loading'}
      saveError={saveError}
    />
  );
}
