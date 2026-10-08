import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, AlertTriangle, AtSign, BellRing, Briefcase, Camera, Check, CheckCircle2, Clock, Eye, EyeOff, Globe, History, KeyRound,
  LayoutList, Link2, Loader2, LogOut, Mail, MapPin, Monitor, Phone, RotateCcw, Save, Settings2, Shield, ShieldCheck, Smartphone, Upload,
  User, Volume2, X,
} from 'lucide-react';
import { FieldSelect } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { updateUser } from '../store/authSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { DAY_MS, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { DEFAULT_PREFS, START_PAGES, getPrefs, playChime, savePrefs } from '../utils/consolePrefs.js';

const TABS = [
  { value: 'profile', label: 'Profile', hint: 'Personal details & photo', icon: User },
  { value: 'contact', label: 'Contact & Verification', hint: 'Email, phone & code checks', icon: Mail },
  { value: 'security', label: 'Security', hint: 'Password, devices & sign-ins', icon: Shield },
  { value: 'preferences', label: 'Console Preferences', hint: 'This browser only', icon: Settings2 },
];
const TAB_ALIASES = { general: 'preferences' };
const HOUR = 3600 * 1000;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const ago = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))} min ago`;
  if (ms < DAY_MS) return `${Math.round(ms / HOUR)} hrs ago`;
  return `${Math.round(ms / DAY_MS)} days ago`;
};
const maskIp = (ip) => (ip ? String(ip).replace(/(\d+)\.(\d+)$/, 'xx.xx') : '—');
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const label = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-neutral-600';
const fieldCls = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';

const Card = ({ title, icon: Icon, subtitle, aside, children, className }) => (
  <section className={clsx('rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
    {title && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-pink-100 text-[#C81345]"><Icon className="h-[18px] w-[18px]" /></span>}
          <div>
            <h2 className="font-display text-[15px] font-bold text-neutral-900">{title}</h2>
            {subtitle && <p className="text-[12px] text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
    )}
    {children}
  </section>
);

const Toggle = ({ on, onChange, disabled, label: aria }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={aria} disabled={disabled} onClick={() => onChange(!on)} className={clsx('relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50', on ? 'bg-[#E8194E]' : 'bg-neutral-300')}>
    <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
  </button>
);

const Pill = ({ ok, children }) => (
  <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
    {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}{children}
  </span>
);

const OtpInput = ({ value, onChange, disabled }) => {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const setAt = (i, d) => {
    const next = digits.map((c, j) => (j === i ? d : c)).join('').replace(/\s+$/, '');
    onChange(next.replace(/ /g, ''));
  };
  return (
    <div className="flex gap-2" onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(5, t.length)]?.focus(); } }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d.trim()} disabled={disabled} inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(-1); setAt(i, v || ' '); if (v) refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !d.trim()) refs.current[i - 1]?.focus(); }}
          className="h-11 w-10 rounded-lg border border-transparent bg-[#F1F3FC] text-center font-display text-[18px] font-bold text-neutral-900 outline-none transition focus:border-[#E8194E]/50 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/15 sm:w-11" />
      ))}
    </div>
  );
};

// Shared fetch helper with the signed-in admin's token.
const useApi = () => {
  const token = useSelector((s) => s.auth.token);
  return useCallback(async (path, { method = 'GET', body, form } = {}) => {
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_WITH_PATH}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Request failed');
    return json;
  }, [token]);
};

// ── Profile ─────────────────────────────────────────────────────────────────
function ProfileTab({ account, onAccount, toast, sessions }) {
  const api = useApi();
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const initial = useMemo(() => ({
    full_name: account?.personal.full_name || '', username: account?.personal.username || '', location: account?.personal.location || '',
    website: account?.personal.website || '', bio: account?.personal.bio || '',
  }), [account]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uname, setUname] = useState({ state: 'idle', msg: '' });
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { setForm(initial); }, [initial]);

  const dirty = Object.keys(initial).some((k) => (form[k] || '') !== (initial[k] || ''));
  const avatar = toAbsoluteMediaUrl(account?.personal.avatar_url || '');

  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (!u || u === (initial.username || '').toLowerCase()) { setUname({ state: 'idle', msg: '' }); return undefined; }
    if (!/^[a-z0-9._]{3,30}$/.test(u)) { setUname({ state: 'bad', msg: '3–30 characters: letters, numbers, . or _' }); return undefined; }
    setUname({ state: 'checking', msg: 'Checking…' });
    const t = setTimeout(async () => {
      try { await api('/users/check/username', { method: 'POST', body: { username: u } }); setUname({ state: 'ok', msg: 'Available' }); }
      catch (e) { setUname({ state: 'bad', msg: e.message || 'Already taken' }); }
    }, 450);
    return () => clearTimeout(t);
  }, [form.username, initial.username, api]);

  const save = async () => {
    const body = {};
    Object.keys(initial).forEach((k) => { if ((form[k] || '') !== (initial[k] || '')) body[k] = k === 'username' ? form[k].trim().toLowerCase() : form[k].trim(); });
    if (body.full_name === '') { toast('Name can\'t be empty', 'error'); return; }
    if (body.website && !/^https?:\/\//i.test(body.website)) body.website = `https://${body.website}`;
    setSaving(true);
    try {
      const res = await api('/settings/account/personal', { method: 'PATCH', body });
      onAccount((a) => ({ ...a, personal: { ...a.personal, ...res.user, interests: res.user?.ad_interests || a.personal.interests } }));
      dispatch(updateUser({ full_name: res.user?.full_name, username: res.user?.username }));
      toast('Profile saved');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { toast('Use a JPG, PNG, WebP or GIF image', 'error'); return; }
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const res = await api('/settings/account/avatar', { method: 'POST', form: fd });
      onAccount((a) => ({ ...a, personal: { ...a.personal, avatar_url: res.avatar_url } }));
      dispatch(updateUser({ avatar_url: res.avatar_url }));
      toast('Profile photo updated');
    } catch (e) { toast(e.message, 'error'); }
    setUploading(false);
  };

  const checks = [
    ['Profile photo', !!account?.personal.avatar_url],
    ['Email verified', !!account?.contact.is_email_verified],
    ['Phone verified', !!account?.contact.is_phone_verified],
    ['Bio added', !!account?.personal.bio],
  ];
  const complete = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
  const current = sessions.find((s) => s.isCurrent);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-[72px]">
        <Card>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-[#E8194E] to-[#8E35B5] p-[3px]">
                {avatar ? <img src={avatar} alt="" className="h-20 w-20 rounded-full border-2 border-white object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-[#EEF0FA] font-display text-[22px] font-bold text-[#8E35B5]">{initials(form.full_name)}</span>}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo" className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#E8194E] text-white ring-2 ring-white"><Camera className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mt-3 font-display text-[17px] font-bold text-neutral-900">{account?.personal.full_name || 'Admin'}</p>
            <p className="text-[12px] font-semibold text-[#E8194E]">@{account?.personal.username || '—'}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#C81345]">{me?.role || 'admin'}</span>
              {account?.contact.is_email_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Verified</span>}
            </div>
          </div>
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-neutral-600"><span>Profile completeness</span><span className={complete === 100 ? 'text-emerald-600' : 'text-[#C81345]'}>{complete}%</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]"><div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" style={{ width: `${complete}%` }} /></div>
            <ul className="mt-3 space-y-1.5">
              {checks.map(([l, ok]) => <li key={l} className="flex items-center gap-2 text-[12px]"><span className={clsx('flex h-4 w-4 items-center justify-center rounded-full', ok ? 'bg-emerald-500 text-white' : 'bg-neutral-200 text-neutral-400')}><Check className="h-2.5 w-2.5" /></span><span className={ok ? 'text-neutral-700' : 'text-neutral-400'}>{l}</span></li>)}
            </ul>
          </div>
        </Card>
        <Card>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">This session</p>
          <div className="mt-2 divide-y divide-neutral-100 text-[12px]">
            <div className="flex justify-between py-1.5"><span className="text-neutral-500">Device</span><span className="max-w-[150px] truncate font-semibold text-neutral-800">{current?.device_name || 'This browser'}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-neutral-500">Signed in</span><span className="font-semibold text-neutral-800">{current?.created_at ? ago(current.created_at) : '—'}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-neutral-500">Location</span><span className="font-semibold text-neutral-800">{current?.location || '—'}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-neutral-500">Other devices</span><span className="font-semibold text-neutral-800">{Math.max(0, sessions.length - 1)}</span></div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Profile Photo" icon={Camera} subtitle="Shown on your admin account across the console.">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
            className={clsx('flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-5 text-center transition sm:flex-row sm:text-left', drag ? 'border-[#E8194E] bg-pink-50' : 'border-[#D9DCEF] bg-[#F6F7FD]')}
          >
            {avatar ? <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#8E35B5] shadow-sm"><Upload className="h-6 w-6" /></span>}
            <div className="flex-1">
              <p className="text-[13.5px] font-bold text-neutral-900">Drop your new photo here, or <button type="button" onClick={() => fileRef.current?.click()} className="text-[#C81345] underline">browse files</button></p>
              <p className="text-[11.5px] text-neutral-500">JPG, PNG, WebP or GIF. A square image looks best.</p>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-60">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Uploading…' : 'Upload photo'}</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </Card>

        <Card title="Personal Information" icon={User} subtitle="Your name and handle as other admins and members see them." aside={dirty && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">Unsaved changes</span>}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={label}>Full name</label><input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={clsx(fieldCls, 'font-semibold')} /></div>
            <div>
              <label className={label}>Username</label>
              <div className="relative"><AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className={clsx(fieldCls, 'pl-9 font-semibold')} /></div>
              <p className={clsx('mt-1 text-[11px] font-semibold', uname.state === 'ok' ? 'text-emerald-600' : uname.state === 'bad' ? 'text-rose-600' : 'text-neutral-500')}>{uname.state === 'idle' ? 'Saved in lowercase. Must be unique.' : uname.state === 'ok' ? `✓ ${uname.msg}` : uname.msg}</p>
            </div>
            <div><label className={label}>Location</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Mumbai, India" className={clsx(fieldCls, 'pl-9')} /></div></div>
            <div><label className={label}>Website</label><div className="relative"><Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" className={clsx(fieldCls, 'pl-9')} /></div></div>
          </div>
        </Card>

        <Card title="Bio" icon={Briefcase} subtitle="A short line about your role on the team." aside={<span className="text-[11px] font-semibold text-neutral-400">{form.bio.length} / 300</span>}>
          <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 300) }))} rows={4} placeholder="e.g. Trust & Safety lead, handling content moderation and vendor reviews." className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2.5 text-[13px] leading-relaxed outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" />
        </Card>

        {dirty && (
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-200 bg-white/95 px-4 py-3 shadow-[0_18px_40px_-16px_rgba(232,25,78,0.5)] backdrop-blur">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-neutral-800"><span className="h-2 w-2 animate-pulse rounded-full bg-[#E8194E]" />Unsaved changes</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(initial)} className="h-9 rounded-lg border border-neutral-200 px-3 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50">Discard</button>
              <button type="button" onClick={save} disabled={saving || uname.state === 'bad' || uname.state === 'checking'} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[12.5px] font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save profile</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contact & verification ──────────────────────────────────────────────────
function VerifyBlock({ kind, target, onVerified, toast }) {
  const api = useApi();
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return undefined; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const send = async () => {
    setBusy('send');
    try { const r = await api(`/settings/account/verify-${kind}/send`, { method: 'POST' }); toast(r.message || 'Code sent'); setSent(true); setWait(60); }
    catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const confirm = async () => {
    setBusy('confirm');
    try { await api(`/settings/account/verify-${kind}/confirm`, { method: 'POST', body: { otp } }); toast(`${kind === 'email' ? 'Email' : 'Phone'} verified`); onVerified(); }
    catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  if (!sent) {
    return <button type="button" onClick={send} disabled={!!busy || !target} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white disabled:opacity-50">{busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Send verification code</button>;
  }
  return (
    <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-4">
      <p className="text-[12.5px] font-bold text-neutral-900">Enter the 6-digit code sent to {target}</p>
      <p className="text-[11px] text-neutral-500">The code expires in 10 minutes. You can paste it.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <OtpInput value={otp} onChange={setOtp} disabled={busy === 'confirm'} />
        <button type="button" onClick={confirm} disabled={otp.length !== 6 || !!busy} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-50">{busy === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Verify code</button>
      </div>
      <button type="button" onClick={send} disabled={wait > 0 || !!busy} className="mt-2 text-[11.5px] font-bold text-[#C81345] hover:underline disabled:text-neutral-400 disabled:no-underline">{wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : 'Resend code'}</button>
    </div>
  );
}

function ContactTab({ account, onAccount, toast }) {
  const api = useApi();
  const dispatch = useDispatch();
  const c = account?.contact || {};
  const [edit, setEdit] = useState(null); // 'email' | 'phone'
  const [draft, setDraft] = useState('');
  const [profession, setProfession] = useState(c.profession || '');
  const [busy, setBusy] = useState('');
  useEffect(() => { setProfession(c.profession || ''); }, [c.profession]);

  const saveContact = async (body, key) => {
    setBusy(key);
    try {
      const r = await api('/settings/account/contact', { method: 'PATCH', body });
      onAccount((a) => ({ ...a, contact: { ...a.contact, ...r.contact } }));
      if (body.email) dispatch(updateUser({ email: r.contact?.email }));
      toast(r.message || 'Saved');
      setEdit(null);
    } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const markVerified = (k) => onAccount((a) => ({ ...a, contact: { ...a.contact, [k]: true } }));

  const block = (kind) => {
    const isEmail = kind === 'email';
    const value = isEmail ? c.email : c.phone;
    const verified = isEmail ? c.is_email_verified : c.is_phone_verified;
    const Icon = isEmail ? Mail : Phone;
    return (
      <Card title={isEmail ? 'Email address' : 'Mobile number'} icon={Icon} subtitle={isEmail ? 'Used for sign-in codes, password resets and admin alerts.' : 'Used for SMS sign-in codes when that method is on.'} aside={value ? <Pill ok={verified}>{verified ? 'Verified' : 'Not verified'}</Pill> : null}>
        {edit === kind ? (
          <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) saveContact({ [kind]: draft.trim() }, kind); }} className="flex flex-col gap-2 sm:flex-row">
            <input autoFocus type={isEmail ? 'email' : 'tel'} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={isEmail ? 'name@company.com' : '+91 98765 43210'} className={fieldCls} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEdit(null)} className="h-10 rounded-lg border border-neutral-200 px-3 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
              <button type="submit" disabled={busy === kind || !draft.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1F2340] px-4 text-[12.5px] font-bold text-white disabled:opacity-50">{busy === kind && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-4 py-3">
            <p className={clsx('font-mono text-[14px] font-bold', value ? 'text-neutral-900' : 'text-neutral-400')}>{value || (isEmail ? 'No email on file' : 'No phone number on file')}</p>
            <button type="button" onClick={() => { setDraft(value || ''); setEdit(kind); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-bold text-neutral-800 ring-1 ring-[#E2E5F4] hover:ring-[#E8194E]/40">{value ? `Change ${isEmail ? 'email' : 'number'}` : `Add ${isEmail ? 'email' : 'number'}`}</button>
          </div>
        )}
        {value && !verified && edit !== kind && <div className="mt-3"><VerifyBlock kind={kind} target={value} toast={toast} onVerified={() => markVerified(isEmail ? 'is_email_verified' : 'is_phone_verified')} /></div>}
        {verified && edit !== kind && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Verified. Changing it will ask you to verify again.</p>}
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50/60 p-4">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#C81345] shadow-sm"><AlertTriangle className="h-[18px] w-[18px]" /></span>
        <div>
          <p className="text-[13px] font-bold text-neutral-900">Changing your email or phone resets its verification</p>
          <p className="text-[12px] text-neutral-600">After a change, send a code to the new address or number to verify it again. Each must be unique across B-smart.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {block('email')}
        {block('phone')}
      </div>
      <Card title="Role & profession" icon={Briefcase} subtitle="Optional. Helps other admins know who handles what.">
        <form onSubmit={(e) => { e.preventDefault(); saveContact({ profession: profession.trim() }, 'profession'); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Trust & Safety Lead" className={fieldCls} />
          <button type="submit" disabled={busy === 'profession' || !profession.trim() || profession.trim() === (c.profession || '')} className="inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[12.5px] font-bold text-white disabled:opacity-40">{busy === 'profession' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
        </form>
      </Card>
    </div>
  );
}

// ── Security ────────────────────────────────────────────────────────────────
const strengthOf = (pw) => {
  let s = 0;
  if (pw.length >= 6) s += 1;
  if (pw.length >= 10) s += 1;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s += 1;
  if (/[^a-z0-9]/i.test(pw) || (/[A-Z]/.test(pw) && /[a-z]/.test(pw))) s += 1;
  return s;
};
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

const PwField = ({ lbl, value, onChange, visible, onToggle, auto }) => (
  <div>
    <label className={label}>{lbl}</label>
    <div className="relative">
      <input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} className={clsx(fieldCls, 'pr-10')} />
      <button type="button" onClick={onToggle} aria-label={visible ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
    </div>
  </div>
);

function SecurityTab({ sessions, history, reload, toast }) {
  const api = useApi();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({});
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(10);

  const strength = strengthOf(pw.next);
  const rules = [['At least 6 characters', pw.next.length >= 6], ['Letters and numbers', /[a-z]/i.test(pw.next) && /\d/.test(pw.next)], ['Different from current', !!pw.next && pw.next !== pw.current], ['Matches confirmation', !!pw.next && pw.next === pw.confirm]];
  const canSubmit = pw.current && rules[0][1] && rules[2][1] && rules[3][1];

  const changePassword = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy('pw');
    try { const r = await api('/auth/change-password', { method: 'POST', body: { currentPassword: pw.current, newPassword: pw.next } }); toast(r.message || 'Password updated'); setPw({ current: '', next: '', confirm: '' }); }
    catch (err) { toast(err.message, 'error'); }
    setBusy('');
  };
  const revoke = async (s) => {
    setBusy(s._id);
    try { await api(`/auth/sessions/${s._id}`, { method: 'DELETE' }); toast(`Signed out ${s.device_name || 'device'}`); reload(); } catch (err) { toast(err.message, 'error'); }
    setBusy('');
  };
  const logoutAll = async () => {
    setBusy('all');
    try { const r = await api('/auth/logout-all', { method: 'POST' }); toast(r.message || 'Other devices signed out'); reload(); } catch (err) { toast(err.message, 'error'); }
    setBusy('');
    setConfirm(null);
  };

  const month = history.filter((h) => Date.now() - new Date(h.login_at).getTime() <= 30 * DAY_MS);
  const failed = month.filter((h) => h.status === 'failed').length;
  const lastOk = history.find((h) => h.status === 'success');
  const others = sessions.filter((s) => !s.isCurrent);
  const rows = history.filter((h) => filter === 'all' || h.status === filter);


  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['Active sessions', `${sessions.length} device${sessions.length === 1 ? '' : 's'}`, `${others.length} besides this one`, Monitor, 'bg-pink-100 text-[#C81345]'],
          ['Sign-ins (30 days)', `${month.length - failed} successful`, failed ? `${failed} failed attempt${failed === 1 ? '' : 's'}` : 'No failed attempts', History, failed ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'],
          ['Last sign-in', lastOk ? ago(lastOk.login_at) : '—', lastOk ? `${lastOk.device_name || 'Unknown device'} · ${lastOk.location || 'unknown location'}` : 'No history yet', Clock, 'bg-purple-100 text-[#8E35B5]'],
        ].map(([l, v, sub, Icon, tone]) => (
          <div key={l} className="group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-pink-200">
            <div className="flex items-start justify-between"><p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">{l}</p><span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', tone)}><Icon className="h-4 w-4" /></span></div>
            <p className="mt-1 font-display text-[22px] font-extrabold text-neutral-900">{v}</p>
            <p className={clsx('truncate text-[11.5px]', l.startsWith('Sign-ins') && failed ? 'font-semibold text-rose-600' : 'text-neutral-500')}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card title="Change Password" icon={KeyRound} subtitle="You stay signed in here. Other devices keep their sessions unless you sign them out.">
          <form onSubmit={changePassword} className="space-y-3">
            <PwField lbl="Current password" auto="current-password" value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} visible={!!show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} />
            <PwField lbl="New password" auto="new-password" value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} visible={!!show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))} />
            {pw.next && (
              <div>
                <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={clsx('h-1.5 flex-1 rounded-full', i < strength ? (strength >= 3 ? 'bg-emerald-500' : strength === 2 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-[#EEF0FA]')} />)}</div>
                <p className={clsx('mt-1 text-[11px] font-bold', strength >= 3 ? 'text-emerald-600' : strength === 2 ? 'text-amber-600' : 'text-rose-600')}>{STRENGTH[strength]}</p>
              </div>
            )}
            <PwField lbl="Confirm new password" auto="new-password" value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} visible={!!show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />
            <ul className="grid grid-cols-1 gap-1.5 rounded-xl bg-[#F6F7FD] p-3 sm:grid-cols-2">
              {rules.map(([l, ok]) => <li key={l} className={clsx('flex items-center gap-1.5 text-[11.5px]', ok ? 'font-semibold text-emerald-700' : 'text-neutral-500')}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />}{l}</li>)}
            </ul>
            <div className="flex justify-end"><button type="submit" disabled={!canSubmit || busy === 'pw'} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-40">{busy === 'pw' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Update password</button></div>
          </form>
        </Card>

        <Card title="Where You're Signed In" icon={Monitor} subtitle="Devices with an active admin session." aside={others.length > 0 && <button type="button" onClick={() => setConfirm('all')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11.5px] font-bold text-[#E8194E] hover:bg-rose-100"><LogOut className="h-3.5 w-3.5" />Sign out all others</button>}>
          {!sessions.length ? <p className="rounded-xl bg-[#F6F7FD] px-4 py-6 text-center text-[12.5px] text-neutral-500">No active sessions recorded.</p> : (
            <ul className="space-y-2">
              {sessions.map((s) => {
                const Icon = s.device_type === 'mobile' ? Smartphone : Monitor;
                return (
                  <li key={s._id} className={clsx('flex items-center gap-3 rounded-xl p-3', s.isCurrent ? 'bg-emerald-50/60 ring-1 ring-emerald-100' : 'bg-[#F6F7FD]')}>
                    <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg', s.isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-neutral-600')}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-neutral-900">{s.device_name || 'Unknown device'}</p>
                      <p className="truncate text-[11px] text-neutral-500">{[s.location, maskIp(s.ip)].filter(Boolean).join(' · ')} · active {ago(s.last_active)}</p>
                    </div>
                    {s.isCurrent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">This device</span>
                      : <button type="button" onClick={() => revoke(s)} disabled={busy === s._id} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11.5px] font-bold text-[#E8194E] hover:bg-rose-50 disabled:opacity-50">{busy === s._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}Sign out</button>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Sign-in History" icon={History} subtitle="Your last 50 sign-in attempts, newest first." aside={
        <div className="flex rounded-lg bg-[#EEF0FA] p-0.5">
          {[['all', `All (${history.length})`], ['success', 'Successful'], ['failed', `Failed (${history.filter((h) => h.status === 'failed').length})`]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setFilter(v); setLimit(10); }} className={clsx('rounded-md px-2.5 py-1 text-[11.5px] font-bold transition', filter === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500')}>{l}</button>
          ))}
        </div>
      }>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead><tr className="bg-[#F7F8FD]">{['Date & time', 'Device', 'Location', 'IP address', 'Status'].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.slice(0, limit).map((h) => (
                <tr key={h._id} className={clsx('transition-colors hover:bg-[#FDF2F6]', h.status === 'failed' && 'bg-rose-50/50')}>
                  <td className="px-5 py-2.5"><p className="text-[12.5px] font-semibold text-neutral-900">{fmt(h.login_at)}</p><p className="text-[10.5px] text-neutral-500">{ago(h.login_at)}</p></td>
                  <td className="px-5 py-2.5 text-[12.5px] text-neutral-700">{h.device_name || 'Unknown device'}</td>
                  <td className="px-5 py-2.5 text-[12.5px] text-neutral-700">{h.location || '—'}</td>
                  <td className="px-5 py-2.5 font-mono text-[11.5px] text-neutral-600">{maskIp(h.ip)}</td>
                  <td className="px-5 py-2.5"><span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold', h.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>{h.status === 'failed' ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}{h.status === 'failed' ? 'Failed' : 'Success'}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-[12.5px] text-neutral-500">No sign-in attempts here.</td></tr>}
            </tbody>
          </table>
        </div>
        {rows.length > limit && <button type="button" onClick={() => setLimit((l) => l + 20)} className="mt-3 text-[12px] font-bold text-[#C81345] hover:underline">Show more ({rows.length - limit} left)</button>}
        {failed > 0 && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />Don't recognise a failed attempt? Change your password and sign out other devices.</p>}
      </Card>

      <ConfirmModal isOpen={confirm === 'all'} onClose={() => setConfirm(null)} onConfirm={logoutAll} title={`Sign out ${others.length} other device${others.length === 1 ? '' : 's'}?`} description="They'll need to sign in again. This device stays signed in." confirmText="Sign out others" confirmVariant="danger" loading={busy === 'all'} />
    </div>
  );
}

// ── Console preferences (browser only) ──────────────────────────────────────
function PreferencesTab({ toast }) {
  const [prefs, setPrefs] = useState(getPrefs);
  const [saved, setSaved] = useState(getPrefs);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);
  const set = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));

  const save = () => { if (savePrefs(prefs)) { setSaved(prefs); toast('Preferences saved on this device'); } else toast('This browser blocked saving', 'error'); };
  const reset = () => { setPrefs({ ...DEFAULT_PREFS }); };
  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') set('desktop', true);
  };
  const bytes = (() => { try { return (localStorage.getItem('bsmart_console_prefs') || '').length; } catch { return 0; } })();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E5F4] bg-[#F6F7FD] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#8E35B5] shadow-sm"><Settings2 className="h-[18px] w-[18px]" /></span>
          <div>
            <p className="flex items-center gap-2 text-[13px] font-bold text-neutral-900">Browser-only preferences <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#8E35B5]">Local storage</span></p>
            <p className="text-[12px] text-neutral-600">Saved in this browser only. They don't sync to your other devices or to other admins.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50"><RotateCcw className="h-4 w-4" />Reset to defaults</button>
          <button type="button" onClick={save} disabled={!dirty} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[12.5px] font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />Save preferences</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Table density & rows" icon={LayoutList} subtitle="How many rows list pages show when they open.">
          <label className={label}>Default rows per page</label>
          <div className="grid grid-cols-3 gap-2">
            {[10, 25, 50].map((n) => (
              <button key={n} type="button" onClick={() => set('rows', n)} className={clsx('rounded-xl border px-3 py-3 text-left transition', prefs.rows === n ? 'border-[#E8194E] bg-pink-50 shadow-[0_6px_14px_-10px_rgba(232,25,78,0.7)]' : 'border-[#E2E5F4] bg-white hover:border-pink-200')}>
                <p className={clsx('font-display text-[18px] font-extrabold', prefs.rows === n ? 'text-[#C81345]' : 'text-neutral-900')}>{n}</p>
                <p className="text-[11px] text-neutral-500">{n === 10 ? 'Compact view' : n === 25 ? 'Balanced' : 'Long lists'}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">Applies to Orders, Products, Services, Customer Queries, Inquiries, Gift Cards, Bug and Content Reports and Notifications. You can still change it per page.</p>
        </Card>

        <Card title="Start page after sign-in" icon={Link2} subtitle="Where the console opens when you sign in.">
          <label className={label}>Landing page</label>
          <FieldSelect value={prefs.startPage} onChange={(v) => set('startPage', v)} options={START_PAGES} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {START_PAGES.slice(0, 4).map((p) => (
              <button key={p.value} type="button" onClick={() => set('startPage', p.value)} className={clsx('rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition', prefs.startPage === p.value ? 'bg-[#1F2340] text-white' : 'bg-[#F6F7FD] text-neutral-700 hover:bg-[#EEF0FA]')}>{p.label}</button>
            ))}
          </div>
        </Card>

        <Card title="Audio cues & alerts" icon={BellRing} subtitle="How this browser tells you about new notifications.">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-3.5 py-3">
              <div><p className="text-[13px] font-bold text-neutral-900">Sound for new alerts</p><p className="text-[11.5px] text-neutral-500">A short chime when a notification arrives live.</p></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={playChime} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[11.5px] font-bold text-[#8E35B5] ring-1 ring-[#E2E5F4]"><Volume2 className="h-3.5 w-3.5" />Test</button>
                <Toggle on={prefs.sound} onChange={(v) => set('sound', v)} label="Sound for new alerts" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-3.5 py-3">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-bold text-neutral-900">Desktop notifications <span className={clsx('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase', perm === 'granted' ? 'bg-emerald-50 text-emerald-700' : perm === 'denied' ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700')}>{perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Blocked' : perm === 'unsupported' ? 'Unsupported' : 'Not asked'}</span></p>
                <p className="text-[11.5px] text-neutral-500">Shows a system pop-up when this tab is in the background.</p>
                {perm === 'default' && <button type="button" onClick={askPermission} className="mt-1 text-[11.5px] font-bold text-[#C81345] hover:underline">Allow in this browser</button>}
                {perm === 'denied' && <p className="mt-1 text-[11px] text-rose-600">Blocked in browser settings. Allow notifications for this site there first.</p>}
              </div>
              <Toggle on={prefs.desktop && perm === 'granted'} disabled={perm !== 'granted'} onChange={(v) => set('desktop', v)} label="Desktop notifications" />
            </div>
          </div>
        </Card>

        <Card title="Local storage" icon={Shield} subtitle="What this page keeps in your browser.">
          <div className="divide-y divide-neutral-100 text-[12.5px]">
            <div className="flex justify-between py-2"><span className="text-neutral-500">Preferences saved</span><span className="font-semibold text-neutral-800">{bytes ? `${bytes} bytes` : 'Nothing yet'}</span></div>
            <div className="flex justify-between py-2"><span className="text-neutral-500">Rows per page</span><span className="font-semibold text-neutral-800">{saved.rows}</span></div>
            <div className="flex justify-between py-2"><span className="text-neutral-500">Start page</span><span className="font-semibold text-neutral-800">{START_PAGES.find((p) => p.value === saved.startPage)?.label}</span></div>
            <div className="flex justify-between py-2"><span className="text-neutral-500">Alert sound / desktop</span><span className="font-semibold text-neutral-800">{saved.sound ? 'On' : 'Off'} / {saved.desktop ? 'On' : 'Off'}</span></div>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">Clearing your browser data resets these to defaults.</p>
        </Card>
      </div>
      {dirty && <p className="text-center text-[12px] font-semibold text-amber-700">You have unsaved preference changes.</p>}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Settings() {
  const api = useApi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = TABS.some((t) => t.value === (TAB_ALIASES[raw] || raw)) ? (TAB_ALIASES[raw] || raw) : 'profile';
  const [account, setAccount] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  const toast = useCallback((message, tone = 'success') => { setToastMsg({ message, tone }); setTimeout(() => setToastMsg(null), 2800); }, []);

  const loadAccount = useCallback(async () => {
    try { setAccount(await api('/settings/account')); setLoadError(''); } catch (e) { setLoadError(e.message); }
  }, [api]);
  const loadSecurity = useCallback(async () => {
    const [s, h] = await Promise.all([api('/auth/sessions').catch(() => ({ sessions: [] })), api('/auth/login-history').catch(() => ({ history: [] }))]);
    setSessions(Array.isArray(s.sessions) ? s.sessions : []);
    setHistory(Array.isArray(h.history) ? h.history : []);
  }, [api]);

  useEffect(() => { loadAccount(); loadSecurity(); }, [loadAccount, loadSecurity]);

  const current = TABS.find((t) => t.value === tab);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest"><span className="text-[#E8194E]">Settings</span><span className="text-neutral-300">›</span><span className="text-neutral-500">{current.label}</span></p>
          <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">{tab === 'profile' ? 'Profile Settings' : tab === 'contact' ? 'Contact & Verification' : tab === 'security' ? 'Security & Authentication' : 'Console & Display Preferences'}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">{tab === 'profile' ? 'Manage your public admin identity and photo.' : tab === 'contact' ? 'Keep your email and phone verified so sign-in codes and alerts reach you.' : tab === 'security' ? 'Change your password, review signed-in devices and check recent sign-ins.' : 'Tune how this console behaves in this browser.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.value === tab;
          return (
            <button key={t.value} type="button" onClick={() => setParams({ tab: t.value })} className={clsx('flex items-start gap-2.5 rounded-2xl border p-3 text-left transition', active ? 'border-transparent bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_10px_24px_-14px_rgba(232,25,78,0.8)]' : 'border-neutral-200/70 bg-white hover:-translate-y-0.5 hover:border-pink-200')}>
              <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', active ? 'bg-white/20' : 'bg-[#EEF0FA] text-[#8E35B5]')}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0"><span className={clsx('block truncate text-[13px] font-bold', active ? 'text-white' : 'text-neutral-900')}>{t.label}</span><span className={clsx('block truncate text-[11px]', active ? 'text-white/80' : 'text-neutral-500')}>{t.hint}</span></span>
            </button>
          );
        })}
      </div>

      {loadError && tab !== 'preferences' ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white py-14 text-center">
          <AlertCircle className="h-8 w-8 text-rose-400" />
          <p className="font-semibold text-neutral-800">Couldn't load your account</p>
          <p className="text-[12.5px] text-neutral-500">{loadError}</p>
          <button type="button" onClick={loadAccount} className="text-[12.5px] font-bold text-[#C81345] hover:underline">Try again</button>
        </div>
      ) : !account && tab !== 'preferences' && tab !== 'security' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="h-80 animate-pulse rounded-2xl bg-white" /><div className="h-80 animate-pulse rounded-2xl bg-white" /></div>
      ) : tab === 'profile' ? (
        <ProfileTab account={account} onAccount={setAccount} toast={toast} sessions={sessions} />
      ) : tab === 'contact' ? (
        <ContactTab account={account} onAccount={setAccount} toast={toast} />
      ) : tab === 'security' ? (
        <SecurityTab sessions={sessions} history={history} reload={loadSecurity} toast={toast} />
      ) : (
        <PreferencesTab toast={toast} />
      )}

      {toastMsg && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toastMsg.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toastMsg.message}</div>}
    </div>
  );
}
