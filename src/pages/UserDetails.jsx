import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRightLeft, BadgeCheck, Ban, Bookmark, Calendar, Check, CircleSlash, Copy, Download, Eye, Film,
  Heart, Image as ImageIcon, Loader2, Mail, MapPin, Megaphone, MessageCircle, MessageSquare, MessagesSquare, Pencil,
  Phone, Play, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Star, Store, Trash2, Wallet, XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { fetchUsers, deleteUserById } from '../store/usersSlice.js'
import { fetchMemberWalletHistory, resetMemberHistory } from '../store/walletSlice.js'
import { formatCompactNumber, formatDateTime, formatNumber, formatRelativeTime } from '../utils/helpers.jsx'
import { downloadCsv, getThumbnailUrl, toAbsoluteMediaUrl } from '../utils/contentHelpers.js'
import Modal, { ConfirmModal } from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

// ─── Wallet transaction labels ───────────────────────────────────────────────
const TYPE_CONFIG = {
  LIKE: { icon: Heart, color: 'text-rose-500 bg-rose-50', label: 'Post Like' },
  COMMENT: { icon: MessageCircle, color: 'text-blue-500 bg-blue-50', label: 'Post Comment' },
  REPLY: { icon: MessageCircle, color: 'text-indigo-500 bg-indigo-50', label: 'Post Reply' },
  SAVE: { icon: Bookmark, color: 'text-amber-500 bg-amber-50', label: 'Post Save' },
  REEL_VIEW_REWARD: { icon: Eye, color: 'text-purple-500 bg-purple-50', label: 'Reel View Reward' },
  AD_REWARD: { icon: Star, color: 'text-emerald-500 bg-emerald-50', label: 'Ad Reward' },
  AD_VIEW_REWARD: { icon: Eye, color: 'text-cyan-500 bg-cyan-50', label: 'Ad View Reward' },
  AD_LIKE_REWARD: { icon: Heart, color: 'text-pink-500 bg-pink-50', label: 'Ad Like Reward' },
  AD_COMMENT_REWARD: { icon: MessageCircle, color: 'text-blue-500 bg-blue-50', label: 'Ad Comment Reward' },
  AD_REPLY_REWARD: { icon: MessageCircle, color: 'text-indigo-500 bg-indigo-50', label: 'Ad Reply Reward' },
  AD_SAVE_REWARD: { icon: Bookmark, color: 'text-amber-500 bg-amber-50', label: 'Ad Save Reward' },
}
const normalizeType = (v) => String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase()
const typeConfig = (type) => TYPE_CONFIG[normalizeType(type)] || {
  icon: ArrowRightLeft,
  color: 'text-neutral-500 bg-neutral-100',
  label: String(type || 'Transaction').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
}

const ROLE_LABEL = { admin: 'Admin', vendor: 'Vendor', influencer: 'Influencer & Creator', sales: 'Sales Officer', member: 'Member' }
const ROLE_TONE = {
  admin: 'bg-[#1F2340] text-white',
  vendor: 'bg-purple-100 text-[#8E35B5]',
  influencer: 'bg-pink-100 text-[#C81345]',
  sales: 'bg-blue-100 text-blue-700',
  member: 'bg-[#E9EBFA] text-neutral-700',
}

const stringifyLocation = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return ['city', 'state', 'country'].map((k) => value?.[k]).filter((v) => typeof v === 'string' && v.trim()).join(', ')
}

const card = 'rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(16,24,40,0.3)]'

const SectionHead = ({ title, subtitle, icon: Icon, iconClass = 'text-[#C81345]', actions }) => (
  <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-neutral-900">
        {Icon && <Icon className={clsx('h-4 w-4', iconClass)} />}{title}
      </h2>
      {subtitle && <p className="mt-0.5 text-[12px] text-neutral-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
  </div>
)

const MiniStat = ({ label, value, sub, subClass = 'text-neutral-500', icon: Icon, iconTone }) => (
  <div className={clsx(card, 'group p-4 hover:-translate-y-0.5')}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      {Icon && <span className={clsx('flex h-7 w-7 items-center justify-center rounded-md transition-transform group-hover:scale-110', iconTone)}><Icon className="h-3.5 w-3.5" /></span>}
    </div>
    <p className="mt-1.5 font-display text-[22px] font-extrabold leading-tight text-neutral-900">{value}</p>
    {sub && <p className={clsx('mt-0.5 text-[10.5px] font-semibold', subClass)}>{sub}</p>}
  </div>
)

const contentThumb = (item) => {
  const media = Array.isArray(item.media) ? item.media[0] : null
  const isVideo = String(media?.type || media?.media_type || '').toLowerCase().includes('video')
  return { url: getThumbnailUrl(media) || (!isVideo ? toAbsoluteMediaUrl(media?.fileUrl || media?.url) : ''), isVideo }
}

const ContentCard = ({ item, kind, onOpen }) => {
  const [failed, setFailed] = useState(false)
  const { url, isVideo } = contentThumb(item)
  const text = item.caption || item.content || item.title || item.headline || ''
  const likes = Number(item.likes_count ?? item.likesCount ?? 0) || 0
  const views = Number(item.views_count ?? item.viewsCount ?? 0) || 0
  const comments = Number(item.comments_count ?? item.commentsCount ?? 0) || 0
  const badge = { posts: ['Moment', 'bg-[#C81345]'], reels: ['bSpark', 'bg-[#8E35B5]'], promote_reels: ['Campaign', 'bg-[#8E35B5]'], tweets: ['Buzz', 'bg-blue-600'], ads: ['Spotlight', 'bg-amber-600'] }[kind]
  return (
    <button type="button" onClick={onOpen} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-16px_rgba(16,24,40,0.4)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {url && !failed ? (
          <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : text ? (
          <p className="line-clamp-5 p-3 text-[11.5px] leading-relaxed text-neutral-600">{text}</p>
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300">{isVideo ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}</div>
        )}
        <span className={clsx('absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white', badge[1])}>{badge[0]}</span>
        {isVideo && <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60"><Play className="h-2.5 w-2.5 fill-white text-white" /></span>}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-[12.5px] font-bold text-neutral-900">{text || 'Untitled'}</p>
        <p className="mt-1 flex items-center gap-2.5 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3 text-[#E8194E]" />{formatCompactNumber(likes)}</span>
          {views > 0 ? <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatCompactNumber(views)}</span>
            : <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{formatCompactNumber(comments)}</span>}
        </p>
      </div>
    </button>
  )
}

const LedgerTable = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] text-left">
      <thead>
        <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
          {['Transaction Type', 'Amount', 'Date & Time', 'Status', 'Reference ID'].map((h) => (
            <th key={h} className={clsx('px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-700', h === 'Reference ID' && 'text-right')}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((tx, i) => {
          const cfg = typeConfig(tx.type)
          const Icon = cfg.icon
          const amount = Number(tx.amount) || 0
          const ok = String(tx.status || '').toUpperCase() === 'SUCCESS'
          return (
            <tr key={tx._id || i} className="transition-colors hover:bg-[#FDF2F6]">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', cfg.color)}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-neutral-900">{cfg.label}</p>
                    {tx.description && <p className="max-w-[200px] truncate text-[11px] text-neutral-500">{tx.description}</p>}
                  </div>
                </div>
              </td>
              <td className={clsx('px-5 py-3 text-[13px] font-bold', amount >= 0 ? 'text-emerald-600' : 'text-[#C81345]')}>
                {amount >= 0 ? '+' : ''}{formatNumber(amount)} <span className="text-[11px] font-semibold">Bcoins</span>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-[12px] text-neutral-700">{formatDateTime(tx.createdAt || tx.transactionDate)}</td>
              <td className="px-5 py-3">
                <span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                  {ok ? (amount >= 0 ? 'Settled' : 'Deducted') : (tx.status || 'Pending')}
                </span>
              </td>
              <td className="px-5 py-3 text-right font-mono text-[11px] text-neutral-500">#TXN-{String(tx._id || '').slice(-7).toUpperCase() || '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

const EMPTY_FORM = { full_name: '', username: '', email: '', phone: '' }

export default function UserDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const token = useSelector((s) => s.auth.token)
  const listItems = useSelector((s) => s.users.items)
  const { memberHistory, memberWallet, memberStatus, memberError } = useSelector((s) => s.wallet)

  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [content, setContent] = useState(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState(null)
  const [reports, setReports] = useState({ status: 'idle', items: [] })
  const [ledgerFilter, setLedgerFilter] = useState('all')

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const [banType, setBanType] = useState('temporary')
  const [banReason, setBanReason] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(null)

  const headers = useMemo(() => ({ Accept: 'application/json', Authorization: `Bearer ${token}` }), [token])
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (!id || !token) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE_WITH_PATH}/users/${id}`, { headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
        return data?.data || data?.user || data
      })
      .then((data) => { setUser(data); setLoading(false) })
      .catch((e) => { setError(e.message || 'Failed to load user'); setLoading(false) })
  }, [id, token, headers, refreshKey])

  useEffect(() => { if (!listItems || listItems.length === 0) dispatch(fetchUsers()) }, [dispatch, listItems])

  useEffect(() => {
    if (!id || !token) return
    setContentLoading(true)
    setContentError(null)
    fetch(`${API_BASE_WITH_PATH}/admin/users/${id}/content`, { headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
        return data?.data || data
      })
      .then((data) => { setContent(data); setContentLoading(false) })
      .catch((e) => { setContentError(e.message || 'Failed to load content'); setContentLoading(false) })
  }, [id, token, headers])

  useEffect(() => {
    if (id) dispatch(fetchMemberWalletHistory(id))
    return () => { dispatch(resetMemberHistory()) }
  }, [dispatch, id])

  // Reports where this user owns the reported content (latest 100 of all types).
  const loadReports = useCallback(async () => {
    if (!token || !id) return
    setReports((r) => ({ ...r, status: 'loading' }))
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/content-reports/admin?limit=100`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      const items = (Array.isArray(json?.reports) ? json.reports : []).filter((r) => String(r.owner_id?._id || r.owner_id || '') === String(id))
      setReports({ status: 'succeeded', items })
    } catch {
      setReports({ status: 'failed', items: [] })
    }
  }, [token, id, headers])
  useEffect(() => { loadReports() }, [loadReports])

  const profile = useMemo(() => {
    const u = user || {}
    const role = String(u.role || 'member').toLowerCase()
    const banned = u.is_active === false || (u.ban_type && u.ban_type !== 'none')
    return {
      id: String(u._id || u.id || id),
      name: u.full_name || u.username || 'Unknown',
      username: u.username || '',
      email: u.email || '',
      phone: u.phone || '',
      bio: u.bio || u.influencer_profile?.store_description || '',
      location: stringifyLocation(u.location) || stringifyLocation(u.address),
      avatar: u.avatar_url ? toAbsoluteMediaUrl(u.avatar_url) : '',
      role: ROLE_LABEL[role] ? role : 'member',
      active: !banned,
      banType: u.ban_type,
      banReason: u.ban_reason,
      banUntil: u.ban_until,
      followers: Number(u.followers_count) || 0,
      following: Number(u.following_count) || 0,
      emailVerified: !!u.is_email_verified,
      phoneVerified: !!u.is_phone_verified,
      entity: u.company_details?.company_name || u.influencer_profile?.store_name || '',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      summary: u.summary || {},
    }
  }, [user, id])

  const counts = useMemo(() => ({
    posts: (content?.posts || []).length,
    reels: (content?.reels || []).length,
    tweets: (content?.tweets || []).length,
    promote_reels: (content?.promote_reels || []).length,
    ads: (content?.ads || []).length,
  }), [content])

  const summary = profile.summary
  const totalPosts = (summary.posts_count ?? counts.posts) + (summary.reels_count ?? counts.reels)
  const likesTotal = Number(summary.likes_count_total) || 0
  const commentsTotal = Number(summary.comments_count_total) || 0
  const viewsTotal = Number(summary.views_count_total) || 0
  const engagement = viewsTotal ? ((likesTotal + commentsTotal) / viewsTotal) * 100 : null

  const recentContent = useMemo(() => {
    const tagged = ['posts', 'reels', 'promote_reels', 'tweets', 'ads'].flatMap((kind) => (content?.[kind] || []).map((item) => ({ item, kind })))
    return tagged.sort((a, b) => new Date(b.item.createdAt || 0) - new Date(a.item.createdAt || 0)).slice(0, 4)
  }, [content])

  const wallet = useMemo(() => {
    const earned = memberHistory.filter((t) => (t.amount ?? 0) > 0).reduce((s, t) => s + (t.amount ?? 0), 0)
    const spent = memberHistory.filter((t) => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0)
    return { balance: Number(memberWallet?.balance ?? earned - spent) || 0, earned, spent }
  }, [memberHistory, memberWallet])

  const ledger = useMemo(() => memberHistory.filter((t) => (
    ledgerFilter === 'all' || (ledgerFilter === 'credit' ? (t.amount ?? 0) >= 0 : (t.amount ?? 0) < 0)
  )), [memberHistory, ledgerFilter])

  const risk = useMemo(() => {
    const strikes = reports.items.filter((r) => r.status === 'action_taken').length
    const pending = reports.items.filter((r) => r.status === 'pending').length
    const level = !profile.active || strikes >= 3 ? 'high' : strikes > 0 || pending >= 3 ? 'medium' : 'low'
    return { strikes, pending, total: reports.items.length, level }
  }, [reports.items, profile.active])

  const openContent = (kind, item) => {
    const route = { posts: 'posts', reels: 'reels', promote_reels: 'promote', tweets: 'tweets', ads: 'ads' }[kind]
    navigate(`/${route}/${item._id || item.id}`)
  }

  const patchUser = async (body) => {
    const res = await fetch(`${API_BASE_WITH_PATH}/users/${profile.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Update failed')
    return data
  }

  const handleSuspend = async () => {
    setSaving(true)
    try {
      await patchUser(profile.active ? { is_active: false, ban_type: banType, ban_reason: banReason.trim() || undefined } : { is_active: true })
      showToast(profile.active ? 'Account suspended' : 'Account reactivated')
      setSuspendModal(false)
      setBanReason('')
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = () => {
    setForm({ full_name: user?.full_name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '' })
    setFormError('')
    setEditModal(true)
  }

  const handleSave = async () => {
    const changes = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== (user?.[k] || '')))
    if (!Object.keys(changes).length) { setEditModal(false); return }
    if ('username' in changes && !changes.username) { setFormError('Username cannot be empty'); return }
    setSaving(true)
    try {
      await patchUser(changes)
      showToast('Profile updated')
      setEditModal(false)
      setRefreshKey((k) => k + 1)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deleteUserById(profile.id)).unwrap()
      .then(() => navigate('/users', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  const copyId = async () => {
    try { await navigator.clipboard.writeText(profile.id); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  const exportLedger = () => downloadCsv(`wallet-${profile.username || profile.id}.csv`, [
    ['Reference', 'Type', 'Amount (Bcoins)', 'Status', 'Date', 'Description'],
    ...ledger.map((t) => [t._id, typeConfig(t.type).label, t.amount, t.status, t.createdAt || t.transactionDate, t.description || '']),
  ])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'posts', label: `Posts & Moments (${counts.posts})` },
    { key: 'reels', label: `bSparks Reels (${counts.reels})` },
    { key: 'tweets', label: `Buzz Threads (${counts.tweets})` },
    { key: 'promote_reels', label: `Campaigns (${counts.promote_reels})` },
    ...(profile.role === 'vendor' || counts.ads ? [{ key: 'ads', label: `Spotlights (${counts.ads})` }] : []),
    { key: 'wallet', label: 'Wallet & Vault' },
  ]

  const ledgerCard = (limit) => (
    <section className={card}>
      <SectionHead
        icon={Wallet}
        title="Financial Ledger & Bcoin Activity"
        subtitle="Rewards, ad spends and other coin movements on this account."
        actions={(
          <>
            <div className="flex rounded-lg bg-[#F1F3FC] p-0.5">
              {[['all', 'All'], ['credit', 'Credits'], ['debit', 'Debits']].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setLedgerFilter(value)} className={clsx('rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition', ledgerFilter === value ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-600 hover:text-neutral-900')}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={exportLedger} disabled={!ledger.length} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button type="button" onClick={() => dispatch(fetchMemberWalletHistory(profile.id))} aria-label="Refresh ledger" className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:shadow-sm">
              <RefreshCw className={clsx('h-3.5 w-3.5', memberStatus === 'loading' && 'animate-spin')} />
            </button>
          </>
        )}
      />
      {memberStatus === 'loading' ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading ledger…</div>
      ) : memberStatus === 'failed' ? (
        <p className="px-5 pb-6 text-sm text-red-500">{memberError || 'Failed to load wallet history'}</p>
      ) : ledger.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10"><Wallet className="h-7 w-7 text-neutral-200" /><p className="text-[12.5px] text-neutral-400">No transactions</p></div>
      ) : (
        <>
          <LedgerTable rows={limit ? ledger.slice(0, limit) : ledger} />
          {limit && ledger.length > limit && (
            <button type="button" onClick={() => setActiveTab('wallet')} className="w-full border-t border-neutral-100 py-2.5 text-[12px] font-bold text-[#C81345] transition hover:bg-pink-50/50">
              View all {formatNumber(ledger.length)} transactions
            </button>
          )}
        </>
      )}
    </section>
  )

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/users')} className="group inline-flex items-center gap-1.5 text-[14px] font-bold text-[#C81345]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Users
          </button>
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-widest text-neutral-600">Business / User Directory / <span className="text-neutral-900">User Profile</span></p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setSuspendModal(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
              {profile.active ? <CircleSlash className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
              {profile.active ? 'Suspend Account' : 'Reactivate Account'}
            </button>
            <button type="button" onClick={() => setDeleteModal(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#B3122F] px-4 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#9A0F28] hover:shadow-[0_10px_22px_-10px_rgba(179,18,47,0.7)]">
              <Trash2 className="h-4 w-4" /> Delete User
            </button>
          </div>
        )}
      </div>

      {loading && <div className="space-y-4"><div className="h-64 animate-pulse rounded-2xl bg-neutral-100" /><div className="h-96 animate-pulse rounded-2xl bg-neutral-100" /></div>}
      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
          <p className="font-semibold text-red-600">Could not load user</p>
          <p className="mt-1 text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {/* Hero */}
          <section className={clsx(card, 'overflow-hidden')}>
            <div className="relative h-36 bg-gradient-to-r from-[#E8194E] via-[#C0114A] to-[#8E35B5]">
              <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:14px_14px]" />
            </div>
            <div className="px-6 pb-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="relative -mt-12 flex-shrink-0">
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                      {profile.avatar
                        ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        : <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-2xl font-bold text-white">{profile.name[0]?.toUpperCase()}</div>}
                    </div>
                    <span className={clsx('absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-white', profile.active ? 'bg-emerald-500' : 'bg-neutral-400')} />
                  </div>
                  <div className="pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">{profile.name}</h1>
                      {profile.username && <span className="text-[15px] font-semibold text-neutral-600">@{profile.username}</span>}
                      <span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-bold', ROLE_TONE[profile.role])}>{ROLE_LABEL[profile.role]}</span>
                      <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold', profile.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', profile.active ? 'bg-emerald-500' : 'bg-rose-500')} /> {profile.active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className="mt-0.5 max-w-xl text-[13px] text-neutral-500">{profile.bio || 'No bio added'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  {profile.email && (
                    <a href={`mailto:${profile.email}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E9EBFA] px-4 text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7]">
                      <Mail className="h-4 w-4" /> Message
                    </a>
                  )}
                  <button type="button" onClick={openEdit} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#C81345] px-4 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#A50F39] hover:shadow-[0_10px_22px_-10px_rgba(200,19,69,0.7)]">
                    <Pencil className="h-4 w-4" /> Edit Details
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-[#F1F3FC] px-4 py-2.5 text-[12.5px] text-neutral-700">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-[#6E72A8]" />{profile.email || 'No email'}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-[#6E72A8]" />{profile.phone || 'No phone'}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#6E72A8]" />{profile.location || 'No location'}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#6E72A8]" />Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Followers', value: formatCompactNumber(profile.followers) },
                  { label: 'Following', value: formatNumber(profile.following) },
                  { label: 'Published Media', value: `${formatNumber(totalPosts)} Posts & Reels` },
                  { label: 'Avg Engagement', value: engagement === null ? '—' : `${engagement.toFixed(2)}%`, accent: true },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-xl bg-[#F1F3FC] px-4 py-3 transition hover:-translate-y-0.5 hover:bg-[#E9EBFA]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">{tile.label}</p>
                    <p className={clsx('mt-0.5 text-[17px] font-bold', tile.accent ? 'text-emerald-600' : 'text-neutral-900')}>{tile.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  '-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition',
                  activeTab === tab.key ? 'border-[#E8194E] text-[#C81345]' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Main column */}
            <div className="min-w-0 space-y-5">
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MiniStat label="Total Posts" value={formatNumber(totalPosts)} icon={ImageIcon} iconTone="bg-pink-100 text-[#C81345]" sub={`${formatNumber(summary.posts_count ?? counts.posts)} Moments · ${formatNumber(summary.reels_count ?? counts.reels)} bSparks`} />
                    <MiniStat label="Total Likes" value={formatCompactNumber(likesTotal)} icon={Heart} iconTone="bg-pink-100 text-[#C81345]" sub={totalPosts ? `${formatCompactNumber(Math.round(likesTotal / totalPosts))} avg per post` : null} subClass="text-emerald-600" />
                    <MiniStat label="Total Comments" value={formatCompactNumber(commentsTotal)} icon={MessagesSquare} iconTone="bg-indigo-50 text-indigo-600" sub={likesTotal ? `${((commentsTotal / likesTotal) * 100).toFixed(1)}% of likes` : null} subClass="text-[#8E35B5]" />
                    <MiniStat label="Total Views" value={formatCompactNumber(viewsTotal)} icon={Eye} iconTone="bg-purple-100 text-[#8E35B5]" sub={summary.unique_views_count_total ? `${formatCompactNumber(summary.unique_views_count_total)} unique` : null} />
                  </div>

                  <section className={card}>
                    <SectionHead
                      title="Recent Content & Media"
                      subtitle="Latest posts, reels, buzz and campaigns from this user."
                      actions={counts.posts + counts.reels + counts.tweets > 0 ? (
                        <button type="button" onClick={() => setActiveTab(counts.posts ? 'posts' : counts.reels ? 'reels' : 'tweets')} className="text-[12.5px] font-bold text-[#C81345] hover:underline">View All Feed</button>
                      ) : null}
                    />
                    <div className="px-5 pb-5">
                      {contentLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading content…</div>
                      ) : contentError ? (
                        <p className="py-6 text-center text-sm text-red-500">{contentError}</p>
                      ) : recentContent.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10"><ImageIcon className="h-7 w-7 text-neutral-200" /><p className="text-[12.5px] text-neutral-400">No content yet</p></div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                          {recentContent.map(({ item, kind }) => <ContentCard key={`${kind}-${item._id}`} item={item} kind={kind} onOpen={() => openContent(kind, item)} />)}
                        </div>
                      )}
                    </div>
                  </section>

                  {ledgerCard(5)}
                </>
              )}

              {['posts', 'reels', 'tweets', 'promote_reels', 'ads'].includes(activeTab) && (
                <section className={card}>
                  <SectionHead title={tabs.find((t) => t.key === activeTab)?.label} />
                  <div className="px-5 pb-5">
                    {contentLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading content…</div>
                    ) : (content?.[activeTab] || []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10"><ImageIcon className="h-7 w-7 text-neutral-200" /><p className="text-[12.5px] text-neutral-400">Nothing here yet</p></div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {content[activeTab].map((item) => <ContentCard key={item._id || item.id} item={item} kind={activeTab} onOpen={() => openContent(activeTab, item)} />)}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === 'wallet' && ledgerCard(null)}
            </div>

            {/* Side column */}
            <div className="space-y-5 xl:sticky xl:top-[72px]">
              <section className={card}>
                <SectionHead title="Security & Account" actions={<ShieldCheck className="h-4 w-4 text-[#C81345]" />} />
                <div className="space-y-3 px-5 pb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Account ID</p>
                    <div className="mt-1 flex items-center justify-between rounded-lg bg-[#F1F3FC] px-3 py-2">
                      <span className="truncate font-mono text-[12px] font-bold text-neutral-800">#USR-{profile.id.slice(-6).toUpperCase()}</span>
                      <button type="button" onClick={copyId} title="Copy full ID" aria-label="Copy full ID" className="text-neutral-500 transition hover:text-[#C81345]">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Verification</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[['Email', profile.emailVerified], ['Phone', profile.phoneVerified]].map(([label, ok]) => (
                        <span key={label} className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500')}>
                          {ok ? <BadgeCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {label} {ok ? 'verified' : 'unverified'}
                        </span>
                      ))}
                    </div>
                  </div>
                  {profile.entity && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{profile.role === 'vendor' ? 'Associated Vendor Entity' : 'Storefront'}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#C81345]"><Store className="h-4 w-4" />{profile.entity}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-[#F1F3FC] px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Account Activity</p>
                    <p className="mt-0.5 text-[12.5px] text-neutral-800">Profile updated {profile.updatedAt ? formatRelativeTime(profile.updatedAt).toLowerCase() : '—'}</p>
                    {!profile.active && (
                      <p className="mt-1 text-[11.5px] text-rose-700">
                        {profile.banType === 'permanent' ? 'Permanently banned' : `Banned until ${profile.banUntil ? new Date(profile.banUntil).toLocaleDateString() : '—'}`}
                        {profile.banReason ? ` · ${profile.banReason}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className={card}>
                <SectionHead title="Coin Wallet Summary" actions={<span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[11px] font-extrabold text-amber-600">B</span>} />
                <div className="px-5 pb-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Current Balance</p>
                  <p className="mt-0.5 font-display text-[26px] font-extrabold leading-tight text-neutral-900">{formatNumber(wallet.balance)} <span className="text-[13px] font-semibold text-neutral-500">Bcoins</span></p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#EEF0FA]">
                    <div className="h-full bg-emerald-500" style={{ width: `${wallet.earned + wallet.spent ? (wallet.earned / (wallet.earned + wallet.spent)) * 100 : 0}%` }} />
                    <div className="h-full bg-[#E8194E]" style={{ width: `${wallet.earned + wallet.spent ? (wallet.spent / (wallet.earned + wallet.spent)) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-[#F1F3FC] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Total Earned</p><p className="text-[15px] font-bold text-emerald-600">{formatNumber(wallet.earned)}</p></div>
                    <div className="rounded-lg bg-[#F1F3FC] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Total Spent</p><p className="text-[15px] font-bold text-[#C81345]">{formatNumber(wallet.spent)}</p></div>
                  </div>
                  <button type="button" onClick={() => navigate('/wallets')} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#E9EBFA] text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7]">
                    <Wallet className="h-4 w-4" /> Adjust Balance in Vault
                  </button>
                </div>
              </section>

              <section className={card}>
                <SectionHead
                  title="Moderation & Risk Health"
                  actions={reports.status === 'succeeded' ? (
                    <span className={clsx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', { low: 'bg-emerald-50 text-emerald-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-rose-100 text-rose-700' }[risk.level])}>
                      {risk.level} risk
                    </span>
                  ) : null}
                />
                <div className="px-5 pb-5">
                  {reports.status === 'loading' ? <div className="h-16 animate-pulse rounded-xl bg-neutral-100" /> : reports.status === 'failed' ? (
                    <p className="rounded-lg bg-neutral-50 px-3 py-3 text-[12.5px] text-neutral-500">Reports couldn't be loaded.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F1F3FC] p-3 text-center">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Reports</p><p className="text-[17px] font-extrabold text-neutral-900">{risk.total}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Open</p><p className="text-[17px] font-extrabold text-amber-600">{risk.pending}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Strikes</p><p className={clsx('text-[17px] font-extrabold', risk.strikes ? 'text-[#C81345]' : 'text-emerald-600')}>{risk.strikes}</p></div>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-neutral-500">Reports filed against this user's content. A strike is a report where action was taken.</p>
                  <button type="button" onClick={() => navigate('/reports/content')} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8E35B5] text-[13px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#7A2C9C] hover:shadow-[0_10px_22px_-10px_rgba(142,53,181,0.7)]">
                    <ShieldAlert className="h-4 w-4" /> Open Content Reports
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / reactivate */}
      <Modal
        isOpen={suspendModal}
        onClose={() => setSuspendModal(false)}
        title={profile.active ? 'Suspend account' : 'Reactivate account'}
        description={`${profile.name}${profile.username ? ` (@${profile.username})` : ''}`}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setSuspendModal(false)} disabled={saving}>Cancel</Button>
            <Button variant={profile.active ? 'danger' : 'primary'} onClick={handleSuspend} loading={saving}>{profile.active ? 'Suspend' : 'Reactivate'}</Button>
          </>
        )}
      >
        {profile.active ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[['temporary', 'Temporary', '30-day ban'], ['permanent', 'Permanent', 'Until reactivated']].map(([value, label, hint]) => (
                <button key={value} type="button" onClick={() => setBanType(value)} className={clsx('rounded-xl border px-3 py-2.5 text-left transition', banType === value ? 'border-pink-300 bg-pink-50' : 'border-neutral-200 hover:bg-neutral-50')}>
                  <p className={clsx('text-[13px] font-bold', banType === value ? 'text-[#C81345]' : 'text-neutral-800')}><Ban className="mr-1 inline h-3.5 w-3.5" />{label}</p>
                  <p className="text-[11.5px] text-neutral-500">{hint}</p>
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Reason (optional)</label>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} placeholder="Why is this account being suspended?" className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">This lifts the ban and restores full access to the account.</p>
        )}
      </Modal>

      {/* Edit details */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit details"
        description="Changes apply to the user's account immediately."
        footer={(
          <>
            <Button variant="ghost" onClick={() => setEditModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Save changes</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[['full_name', 'Full name'], ['username', 'Username'], ['email', 'Email'], ['phone', 'Phone']].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
              <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
          ))}
        </div>
        {formError && <p className="mt-3 text-[12.5px] font-semibold text-red-600">{formError}</p>}
      </Modal>

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Permanently delete ${profile.name}? This removes their posts and data.`}
        confirmText="Delete User"
        confirmVariant="danger"
        loading={deleting}
      />

      {toast && (
        <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
