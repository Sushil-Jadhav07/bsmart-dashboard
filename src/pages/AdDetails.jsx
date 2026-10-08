import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ChevronLeft, Film, Image as ImageIcon, Trash2, Calendar, MapPin, Tag,
  CheckCircle2, PauseCircle, XCircle, MessageCircle, Wallet, TrendingDown,
  TrendingUp, RefreshCw, Loader2, Eye, Heart, ThumbsDown, Play, Users,
  BarChart3, Globe, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Legend,
} from 'recharts'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Modal, { ConfirmModal } from '../components/Modal.jsx'
import { formatDateTime, formatNumber } from '../utils/helpers.jsx'
import {
  CaptionPanel, CommunityPanel, DetailTopBar, ErrorState, HashtagsPanel, IconBtn, InfoPanel, Lightbox,
  LoadingState, MediaActions, MediaCarousel, ModerationPanel, Panel, Pill, VideoStage,
} from '../components/ContentDetailKit.jsx'
import {
  fetchAdById, patchAdStatus, deleteAdById,
  fetchAdComments, deleteAdComment, fetchAdStats, resetAdStats,
} from '../store/adsSlice.js'
import { fetchAdWalletHistory, resetAdHistory } from '../store/walletSlice.js'

// ─── Brand palette — ONLY these two colors ────────────────────────────────────
// Primary: #E8194E  Secondary/Purple: #833AB4
// All tints are achieved via opacity or hex lightening of these two values.
const C = {
  brand:  '#E8194E',
  purple: '#833AB4',
}
const BRAND_GRADIENT = 'linear-gradient(135deg, #E8194E 0%, #833AB4 100%)'
const PURPLE_GRADIENT = 'linear-gradient(135deg, #833AB4 0%, #E8194E 100%)'

// Chart series colors — all derived from the two brand hues at varying opacities
// We use rgba so they remain on-brand without introducing new hues.
const CHART_COLORS = [
  '#E8194E',        // brand pink — full
  '#833AB4',        // brand purple — full
  'rgba(232,25,78,0.55)',  // brand pink mid
  'rgba(131,58,180,0.55)',  // brand purple mid
  'rgba(232,25,78,0.30)',  // brand pink light
]
// Gender donut — two brand hues + their translucent variants
const GENDER_COLORS = [
  '#833AB4',
  '#E8194E',
  'rgba(131,58,180,0.55)',
  'rgba(232,25,78,0.40)',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getThumbnailUrl = (m) => {
  if (!m) return ''
  if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl
  if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl
  if (Array.isArray(m.thumbnails) && m.thumbnails[0]?.fileUrl) return m.thumbnails[0].fileUrl
  if (m.thumbnails?.fileUrl) return m.thumbnails.fileUrl
  if (m.thumbnail_url) return m.thumbnail_url
  return ''
}
const normalizeType = (v) => String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase()
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-neutral-400 mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color || p.fill || C.brand }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Stats sub-components ─────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, gradient }) {
  // gradient: true = brand pink→purple, false = purple→pink (reversed)
  const bg = gradient === 'reverse' ? PURPLE_GRADIENT : gradient ? BRAND_GRADIENT : `linear-gradient(135deg, rgba(232,25,78,0.08) 0%, rgba(131,58,180,0.08) 100%)`
  const iconBg = gradient ? BRAND_GRADIENT : `linear-gradient(135deg, rgba(131,58,180,0.15) 0%, rgba(232,25,78,0.15) 100%)`
  const iconColor = gradient ? '#fff' : C.brand
  const textColor = gradient ? '#fff' : '#171717'
  const subColor  = gradient ? 'rgba(255,255,255,0.7)' : 'rgba(131,58,180,0.7)'

  return (
    <div className="rounded-2xl p-5 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200" style={{ background: gradient ? bg : 'white' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 rounded-xl" style={{ background: gradient ? 'rgba(255,255,255,0.18)' : iconBg }}>
          <Icon className="w-5 h-5" style={{ color: gradient ? '#fff' : C.brand }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: textColor }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: gradient ? 'rgba(255,255,255,0.75)' : '#737373' }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

function DonutChart({ data, total, label, colors: clrs }) {
  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const p = pct(value, total)
    if (p < 6 || value === 0) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">{p}%</text>
  }
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" labelLine={false} label={renderLabel} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={clrs[i % clrs.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-xl font-bold text-neutral-900 leading-none">{formatNumber(total)}</p>
        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function GenderLegend({ data, colors: clrs }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: clrs[i % clrs.length] }} />
          <span className="text-[11px] text-neutral-500 capitalize">{d.name}</span>
          <span className="ml-auto text-[11px] font-bold text-neutral-700">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function HBar({ label, value, max, gradient: useGradient, subLabel }) {
  const w = max > 0 ? pct(value, max) : 0
  const fill = useGradient === 'reverse' ? PURPLE_GRADIENT : BRAND_GRADIENT
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-neutral-600 capitalize">{label}</span>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-neutral-400">{subLabel}</span>}
          <span className="text-xs font-bold text-neutral-800">{formatNumber(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${w}%`, background: fill }} />
      </div>
    </div>
  )
}

function LocationsChart({ locations }) {
  if (!locations.length) return <p className="text-xs text-neutral-300 text-center py-8">No location data</p>
  const data = locations.slice(0, 8).map(l => ({
    name: l.location && l.location !== '' ? (l.location.split(',')[0].trim() || 'Unknown') : 'Unknown',
    Views:     l.views || 0,
    Unique:    l.unique_viewers || 0,
    Completed: l.completed_views || 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fdf2f8' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Bar dataKey="Views"     fill={C.brand}                       radius={[4, 4, 0, 0]} />
        <Bar dataKey="Unique"    fill={C.purple}                      radius={[4, 4, 0, 0]} />
        <Bar dataKey="Completed" fill="rgba(232,25,78,0.40)"         radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ViewFunnelChart({ total, unique, completed }) {
  const data = [
    { name: 'Total',     value: total },
    { name: 'Unique',    value: unique },
    { name: 'Completed', value: completed },
  ]
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="vfg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.brand}  stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.purple}  stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={2.5} fill="url(#vfg)" dot={{ r: 4, fill: C.brand, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function RadialGauge({ value, max, label, reverse }) {
  const safeVal = Math.min(value, max || 1)
  const color   = reverse ? C.purple : C.brand
  const data = [
    { value: safeVal,                           fill: color },
    { value: Math.max(0, (max || 1) - safeVal), fill: '#f1f5f9' },
  ]
  const percentage = pct(value, max || 1)
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="100%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={data} barSize={10}>
            <RadialBar dataKey="value" cornerRadius={5} background={{ fill: '#f1f5f9' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-[50%] left-1/2 -translate-x-1/2 text-center">
          <p className="text-lg font-bold leading-none" style={{ color }}>{percentage}%</p>
        </div>
      </div>
      <p className="text-[11px] font-semibold text-neutral-500 mt-1 text-center">{label}</p>
    </div>
  )
}

function UserChipList({ users = [], max = 6 }) {
  const [expanded, setExpanded] = useState(false)
  if (!users.length) return <span className="text-xs text-neutral-300 italic">None</span>
  const shown = expanded ? users : users.slice(0, max)
  const remaining = users.length - max
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((u) => (
          <div key={u._id} className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1 hover:border-rose-100 transition-colors" style={{ '--hover-bg': 'rgba(232,25,78,0.04)' }}>
            {u.avatar_url
              ? <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" onError={e => { e.target.style.display = 'none' }} />
              : <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND_GRADIENT }}>
                  <span className="text-[8px] font-bold text-white">{(u.username?.[0] || '?').toUpperCase()}</span>
                </div>
            }
            <span className="text-[11px] font-medium text-neutral-700 max-w-[90px] truncate">@{u.username || 'user'}</span>
            {u.location && <span className="text-[10px] text-neutral-400 max-w-[70px] truncate hidden lg:block">{u.location}</span>}
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button onClick={() => setExpanded(v => !v)} className="mt-2 text-[11px] font-semibold flex items-center gap-1 transition-colors" style={{ color: C.brand }}>
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> +{remaining} more</>}
        </button>
      )}
    </div>
  )
}

// ─── Full analytics panel ─────────────────────────────────────────────────────
function AdStatsPanel({ stats, status, error, onRefresh }) {
  if (status === 'loading') {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-neutral-100 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="bg-white border rounded-2xl p-10 text-center" style={{ borderColor: 'rgba(232,25,78,0.2)' }}>
        <p className="text-sm font-semibold" style={{ color: C.brand }}>{error || 'Failed to load stats'}</p>
        <button onClick={onRefresh} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: C.brand }}>
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    )
  }
  if (status === 'idle' || !stats) return null

  const likes    = stats.likes    || {}
  const dislikes = stats.dislikes || {}
  const views    = stats.views    || {}
  const lg       = likes.by_gender    || {}
  const dg       = dislikes.by_gender || {}
  const locs     = Array.isArray(views.by_location) ? views.by_location : []

  const likeGenderData = [
    { name: 'Male',    value: lg.male?.count    || 0 },
    { name: 'Female',  value: lg.female?.count  || 0 },
    { name: 'Other',   value: lg.other?.count   || 0 },
    { name: 'Unknown', value: lg.unknown?.count || 0 },
  ].filter(d => d.value > 0)

  const dislikeGenderData = [
    { name: 'Male',    value: dg.male?.count    || 0 },
    { name: 'Female',  value: dg.female?.count  || 0 },
    { name: 'Other',   value: dg.other?.count   || 0 },
    { name: 'Unknown', value: dg.unknown?.count || 0 },
  ].filter(d => d.value > 0)

  const likedUsers    = [...(lg.male?.users || []), ...(lg.female?.users || []), ...(lg.other?.users || []), ...(lg.unknown?.users || [])]
  const dislikedUsers = dg.users || []

  const completionRate = pct(views.completed || 0, views.total || 1)
  const uniqueRate     = pct(views.unique    || 0, views.total || 1)
  const likeRatio      = (likes.total + dislikes.total) > 0 ? pct(likes.total, likes.total + dislikes.total) : 0

  // Engagement bar — alternates between brand & purple
  const engagementData = [
    { name: 'Likes',    value: likes.total     || 0, fill: C.brand                     },
    { name: 'Dislikes', value: dislikes.total  || 0, fill: 'rgba(131,58,180,0.35)'     },
    { name: 'Views',    value: views.total     || 0, fill: C.purple                    },
    { name: 'Unique',   value: views.unique    || 0, fill: 'rgba(232,25,78,0.55)'     },
    { name: 'Done',     value: views.completed || 0, fill: 'rgba(131,58,180,0.60)'     },
  ]

  return (
    <div className="space-y-5">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl" style={{ background: BRAND_GRADIENT }}>
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Engagement Analytics</h2>
            <p className="text-[11px] text-neutral-400">Live performance data for this spotlight</p>
          </div>
        </div>
        <button onClick={onRefresh}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all"
          style={{ color: C.brand, borderColor: 'rgba(232,25,78,0.2)', background: 'rgba(232,25,78,0.04)' }}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* KPI row — alternating brand/purple gradient cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Eye}        label="Total Views"  value={formatNumber(views.total    || 0)} sub={`${uniqueRate}% unique`}           gradient={true} />
        <KpiCard icon={Users}      label="Unique Views" value={formatNumber(views.unique   || 0)} sub={`${completionRate}% completed`}    gradient="reverse" />
        <KpiCard icon={Heart}      label="Total Likes"  value={formatNumber(likes.total    || 0)} sub={`${likeRatio}% approval`}          gradient={true} />
        <KpiCard icon={ThumbsDown} label="Dislikes"     value={formatNumber(dislikes.total || 0)} sub={`${100 - likeRatio}% disapproval`} gradient={false} />
      </div>

      {/* Row 2: funnel + like donut + dislike donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-neutral-800">View Funnel</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,25,78,0.08)', color: C.brand }}>{formatNumber(views.total || 0)} total</span>
          </div>
          <p className="text-[11px] text-neutral-400 mb-4">Total → Unique → Completed</p>
          <ViewFunnelChart total={views.total || 0} unique={views.unique || 0} completed={views.completed || 0} />
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-neutral-50">
            {[
              { label: 'Total',     value: views.total     || 0, color: C.brand  },
              { label: 'Unique',    value: views.unique    || 0, color: C.purple },
              { label: 'Completed', value: views.completed || 0, color: 'rgba(232,25,78,0.55)' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-base font-bold" style={{ color: s.color }}>{formatNumber(s.value)}</p>
                <p className="text-[10px] text-neutral-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-neutral-800">Likes by Gender</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,25,78,0.08)', color: C.brand }}>{formatNumber(likes.total || 0)} likes</span>
          </div>
          <p className="text-[11px] text-neutral-400 mb-2">Audience breakdown</p>
          {likeGenderData.length > 0
            ? <><DonutChart data={likeGenderData} total={likes.total || 0} label="Total Likes" colors={GENDER_COLORS} /><GenderLegend data={likeGenderData} colors={GENDER_COLORS} /></>
            : <div className="h-40 flex items-center justify-center"><p className="text-xs text-neutral-300">No like data</p></div>}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-neutral-800">Dislikes by Gender</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(131,58,180,0.08)', color: C.purple }}>{formatNumber(dislikes.total || 0)} dislikes</span>
          </div>
          <p className="text-[11px] text-neutral-400 mb-2">Audience breakdown</p>
          {dislikeGenderData.length > 0
            ? <><DonutChart data={dislikeGenderData} total={dislikes.total || 0} label="Dislikes" colors={GENDER_COLORS} /><GenderLegend data={dislikeGenderData} colors={GENDER_COLORS} /></>
            : <div className="h-40 flex items-center justify-center"><p className="text-xs text-neutral-300">No dislike data</p></div>}
        </div>
      </div>

      {/* Row 3: radial gauges + engagement bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-neutral-800 mb-1">Performance Rates</p>
          <p className="text-[11px] text-neutral-400 mb-5">How effectively this spotlight converts views</p>
          <div className="grid grid-cols-3 gap-4">
            <RadialGauge value={views.completed || 0} max={views.total  || 1} label="Completion"  reverse={false} />
            <RadialGauge value={views.unique    || 0} max={views.total  || 1} label="Unique Rate" reverse={true}  />
            <RadialGauge value={likes.total     || 0} max={views.unique || 1} label="Like Rate"   reverse={false} />
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-50 space-y-3">
            <HBar label="Completion rate"  value={views.completed || 0} max={views.total  || 1} gradient={false}   subLabel={`${completionRate}%`} />
            <HBar label="Unique view rate" value={views.unique    || 0} max={views.total  || 1} gradient="reverse" subLabel={`${uniqueRate}%`} />
            <HBar label="Like approval"    value={likes.total     || 0} max={views.unique || 1} gradient={false}   subLabel={`${pct(likes.total || 0, views.unique || 1)}%`} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-neutral-800 mb-1">Engagement Breakdown</p>
          <p className="text-[11px] text-neutral-400 mb-4">All metrics at a glance</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={engagementData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(232,25,78,0.04)' }} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {engagementData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Approval sentiment */}
          <div className="mt-5 pt-4 border-t border-neutral-50">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="font-semibold" style={{ color: C.brand }}>👍 {likeRatio}% Approval</span>
              <span className="font-semibold" style={{ color: C.purple }}>{100 - likeRatio}% Disapproval 👎</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-neutral-100">
              <div className="h-full transition-all duration-700" style={{ width: `${likeRatio}%`, background: BRAND_GRADIENT }} />
              <div className="h-full flex-1" style={{ background: 'rgba(131,58,180,0.15)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: location bar chart */}
      {locs.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-neutral-800">Views by Location</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,25,78,0.08)', color: C.brand }}>{locs.length} regions</span>
          </div>
          <p className="text-[11px] text-neutral-400 mb-4">Geographic distribution of views</p>
          <LocationsChart locations={locs} />
          <div className="mt-4 pt-4 border-t border-neutral-50 space-y-3">
            {locs.slice(0, 5).map((loc, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,25,78,0.08)' }}>
                  <Globe className="w-3 h-3" style={{ color: C.brand }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-neutral-700 truncate">{loc.location || 'Unknown'}</span>
                    <span className="text-xs font-bold text-neutral-900 ml-2 flex-shrink-0">{formatNumber(loc.views)}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct(loc.views, locs[0]?.views || 1)}%`, background: BRAND_GRADIENT }} />
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[10px] text-neutral-400">
                    <span>{formatNumber(loc.unique_viewers)} unique</span>
                    <span>{formatNumber(loc.completed_views)} completed</span>
                    {loc.total_coins_rewarded > 0 && <span>🪙 {formatNumber(loc.total_coins_rewarded)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: who liked / disliked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {likedUsers.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4" style={{ color: C.brand }} />
              <p className="text-sm font-semibold text-neutral-800">Who Liked</p>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,25,78,0.08)', color: C.brand }}>{likedUsers.length} users</span>
            </div>
            <UserChipList users={likedUsers} max={8} />
          </div>
        )}
        {dislikedUsers.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="w-4 h-4" style={{ color: C.purple }} />
              <p className="text-sm font-semibold text-neutral-800">Who Disliked</p>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(131,58,180,0.08)', color: C.purple }}>{dislikedUsers.length} users</span>
            </div>
            <UserChipList users={dislikedUsers} max={8} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const AD_STATUS_TONE = { active: 'green', pending: 'amber', paused: 'grey', rejected: 'red', draft: 'purple' }

export default function AdDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError, adStats, adStatsStatus, adStatsError } = useSelector((s) => s.ads)

  const [deleteModal,     setDeleteModal]     = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [rejectModal,     setRejectModal]     = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [updatingStatus,  setUpdatingStatus]  = useState(false)
  const [comments,        setComments]        = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [commentDeleting, setCommentDeleting] = useState(false)
  const [viewerIndex,     setViewerIndex]     = useState(-1)

  const { adHistory, adWallet, adStatus, adError } = useSelector((s) => s.wallet)

  useEffect(() => {
    if (id) { dispatch(fetchAdById(id)); dispatch(fetchAdStats(id)) }
    return () => { dispatch(resetAdStats()) }
  }, [dispatch, id])

  useEffect(() => {
    if (!id) return
    setCommentsLoading(true)
    dispatch(fetchAdComments(id)).unwrap()
      .then((p) => setComments(p?.items || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [dispatch, id])

  useEffect(() => {
    if (id) dispatch(fetchAdWalletHistory(id))
    return () => { dispatch(resetAdHistory()) }
  }, [dispatch, id])

  const ad = useMemo(() => {
    const a = current || {}
    const media = Array.isArray(a.media) ? a.media : []
    const isVideo = String(media[0]?.media_type || media[0]?.type || '').toLowerCase().includes('video')
    const categoryRaw = a.category || a.targeting_rules?.category_label || ''
    const category = typeof categoryRaw === 'string' ? categoryRaw : (categoryRaw?.label || categoryRaw?.name || '')
    const owner = (a.user_id && typeof a.user_id === 'object' ? a.user_id : null)
      || (a.vendor_id?.user_id && typeof a.vendor_id.user_id === 'object' ? a.vendor_id.user_id : null)
      || {}
    return {
      id: a._id || a.ad_id || a.id || id,
      title: a.title || a.headline || a.caption || 'Untitled ad',
      caption: a.caption || a.description || '',
      location: a.location || a.location_name || '',
      category,
      coinsReward: a.coins_reward ?? a.coins_per_engagement ?? a.coinsPerEngagement ?? a.reward_config?.coins_per_engagement ?? 0,
      totalBudgetCoins: a.total_budget_coins ?? a.totalBudgetCoins ?? a.budget?.total_budget_coins ?? 0,
      totalCoinsSpent: a.total_coins_spent ?? a.totalCoinsSpent ?? a.total_coins_used ?? a.coins_spent ?? 0,
      createdAt: a.createdAt || a.created_at || '',
      status: String(a.status || 'pending').toLowerCase(),
      rejectionReason: a.rejection_reason || '',
      targeting: a.targeting_rules || a.targeting || {},
      owner: {
        id: owner._id || owner.id || '',
        name: owner.full_name || owner.username || a.vendor_id?.business_name || 'Unknown advertiser',
        handle: owner.username || '',
        avatar: owner.avatar_url || '',
      },
      tags: Array.isArray(a.tags) ? a.tags : [],
      media, isVideo,
    }
  }, [current, id])

  const walletStats = useMemo(() => {
    const history = Array.isArray(adHistory) ? adHistory : []
    const totalBudgetCoins = toNumber(ad.totalBudgetCoins || adWallet?.total_budget_coins || 0)
    const engagementDeductions = history.filter(t => { const tp = normalizeType(t?.type); return tp.endsWith('_DEDUCTION') && tp !== 'AD_BUDGET_DEDUCTION' }).reduce((s, t) => s + Math.abs(toNumber(t?.amount)), 0)
    const budgetRefunds = history.filter(t => normalizeType(t?.type).includes('BUDGET_REFUND')).reduce((s, t) => s + Math.abs(toNumber(t?.amount)), 0)
    const engagementSpent = Math.max(0, engagementDeductions - budgetRefunds)
    const spentCandidate = toNumber(adWallet?.total_coins_spent ?? adWallet?.totalCoinsSpent ?? ad.totalCoinsSpent ?? 0)
    const totalCoinsSpent = Math.max(spentCandidate, engagementSpent)
    const rewardsPaid = history.filter(t => normalizeType(t?.type).endsWith('_REWARD') && toNumber(t?.amount) > 0).reduce((s, t) => s + toNumber(t?.amount), 0)
    const coinsRewardCandidate = toNumber(ad.coinsReward || adWallet?.coins_reward || adWallet?.coinsReward || 0)
    const inferredCPE = coinsRewardCandidate > 0 ? 0 : history.filter(t => normalizeType(t?.type).endsWith('_REWARD') && toNumber(t?.amount) > 0).reduce((mx, t) => Math.max(mx, toNumber(t?.amount)), 0)
    return {
      totalBudgetCoins, engagementSpent, totalCoinsSpent, rewardsPaid,
      coinsPerEngagement: coinsRewardCandidate > 0 ? coinsRewardCandidate : inferredCPE,
      remainingBudget: Math.max(0, totalBudgetCoins - totalCoinsSpent),
    }
  }, [ad, adHistory, adWallet])

  const handleDeleteAd = () => {
    setDeleting(true)
    dispatch(deleteAdById(ad.id)).unwrap().then(() => navigate('/ads', { replace: true })).catch(() => setDeleting(false)).finally(() => setDeleteModal(false))
  }
  const applyStatus = (nextStatus, reason) => {
    setUpdatingStatus(true)
    dispatch(patchAdStatus({ id: ad.id, status: nextStatus, rejection_reason: reason })).unwrap().finally(() => setUpdatingStatus(false))
  }
  const handleApprove = () => applyStatus('active')
  const handlePause   = () => applyStatus('paused')
  const handleReject  = () => { setRejectModal(false); applyStatus('rejected', rejectionReason); setRejectionReason('') }
  const handleDeleteComment = () => {
    if (!commentToDelete) return
    const commentId = commentToDelete.comment_id || commentToDelete._id || commentToDelete.id
    if (!commentId) return
    setCommentDeleting(true)
    dispatch(deleteAdComment(commentId)).unwrap()
      .then(() => setComments(prev => prev.filter(c => (c.comment_id || c._id || c.id) !== commentId)))
      .catch(() => {}).finally(() => { setCommentDeleting(false); setCommentToDelete(null) })
  }

  const isLoading = currentStatus === 'loading'
  const spentPct  = walletStats.totalBudgetCoins > 0 ? Math.min(100, Math.round((walletStats.totalCoinsSpent / walletStats.totalBudgetCoins) * 100)) : 0
  const images = ad.media.map((m) => getThumbnailUrl(m) || m?.fileUrl || m?.url || '').filter(Boolean)
  const videoUrl = ad.media[0]?.fileUrl || ad.media[0]?.url || ''
  const exhausted = walletStats.totalBudgetCoins > 0 && walletStats.totalCoinsSpent >= walletStats.totalBudgetCoins
  const targeting = ad.targeting || {}
  const statusTone = AD_STATUS_TONE[ad.status] || 'grey'

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] pb-16">
      <DetailTopBar
        backLabel="Back to Spotlights"
        onBack={() => navigate('/ads')}
        chips={!isLoading ? <Pill tone={statusTone} dot>{ad.status}</Pill> : null}
        onDelete={() => setDeleteModal(true)}
        deleteLabel="Delete Spotlight"
      />

      {isLoading && <LoadingState label="Loading spotlight…" />}
      {!isLoading && currentError && <ErrorState title="Could not load spotlight" message={currentError} />}

      {!isLoading && !currentError && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <Panel
                icon={ad.isVideo ? Film : ImageIcon}
                title="Spotlight Creative"
                badge={!ad.isVideo && images.length > 1 ? <Pill tone="lavender" className="normal-case">{images.length} files</Pill> : null}
                actions={<MediaActions url={ad.isVideo ? videoUrl : images[0]} onExpand={!ad.isVideo && images.length ? () => setViewerIndex(0) : null} />}
              >
                {ad.isVideo
                  ? <VideoStage videoUrl={videoUrl} posterUrl={getThumbnailUrl(ad.media[0])} />
                  : <MediaCarousel images={images} onExpand={setViewerIndex} />}
              </Panel>

              <CaptionPanel caption={ad.caption} title={ad.title} />

              {ad.tags.length > 0 && <HashtagsPanel tags={ad.tags} />}

              <CommunityPanel comments={comments} loading={commentsLoading} authorId={ad.owner.id} authorHandle={ad.owner.handle} onDeleteComment={setCommentToDelete} />
            </div>

            <div className="space-y-5 xl:sticky xl:top-[72px]">
              <InfoPanel
                title="Spotlight Info"
                status={{ label: ad.status, tone: statusTone }}
                creator={{ name: ad.owner.name, handle: ad.owner.handle, avatar: ad.owner.avatar }}
                rows={[
                  { label: 'Spotlight ID', value: `#SPT-${String(ad.id).slice(-5).toUpperCase()}`, chip: true },
                  { label: 'Created date', value: ad.createdAt ? formatDateTime(ad.createdAt) : '—' },
                  { label: 'Category', value: ad.category, icon: Tag },
                  { label: 'Location', value: ad.location, icon: MapPin },
                  { label: 'Language', value: targeting.language ? String(targeting.language) : null },
                  { label: 'Country', value: targeting.country ? String(targeting.country) : null },
                  { label: 'Target areas', value: Array.isArray(targeting.locations) && targeting.locations.length ? targeting.locations.join(', ') : null },
                ]}
                onViewCreator={ad.owner.id ? () => navigate(`/users/${ad.owner.id}`) : null}
              />

              <Panel title="Review Decision" actions={<Pill tone={statusTone} dot>{ad.status}</Pill>}>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={handleApprove} disabled={updatingStatus || ad.status === 'active'} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[12.5px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-10px_rgba(232,25,78,0.7)] disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button type="button" onClick={handlePause} disabled={updatingStatus || ad.status === 'paused'} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#E9EBFA] text-[12.5px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] disabled:translate-y-0 disabled:opacity-40">
                    <PauseCircle className="h-4 w-4" /> Pause
                  </button>
                  <button type="button" onClick={() => setRejectModal(true)} disabled={updatingStatus || ad.status === 'rejected'} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[12.5px] font-semibold text-[#C81345] transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:translate-y-0 disabled:opacity-40">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
                {updatingStatus && <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-neutral-500"><Loader2 className="h-3 w-3 animate-spin" /> Updating status…</p>}
                {ad.status === 'rejected' && ad.rejectionReason && (
                  <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Rejection reason</p>
                    <p className="mt-0.5 text-[12.5px] text-rose-800">{ad.rejectionReason}</p>
                  </div>
                )}
              </Panel>

              <Panel title="Budget & Coin Rewards" actions={exhausted ? <Pill tone="red">Exhausted</Pill> : null}>
                <div className="rounded-xl bg-[#F1F3FC] p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">Budget used</p>
                    <p className="text-[11px] font-bold text-[#C81345]">{spentPct}%</p>
                  </div>
                  <p className="mt-1 font-display text-[22px] font-extrabold leading-tight text-neutral-900">
                    {formatNumber(walletStats.totalCoinsSpent)}<span className="text-[13px] font-semibold text-neutral-500"> / {formatNumber(walletStats.totalBudgetCoins)} coins</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5] transition-all duration-500" style={{ width: `${Math.max(2, spentPct)}%` }} />
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Per engagement', value: formatNumber(walletStats.coinsPerEngagement), tone: 'text-[#C81345]' },
                    { label: 'Rewarded', value: formatNumber(walletStats.rewardsPaid), tone: 'text-[#8E35B5]' },
                    { label: 'Remaining', value: formatNumber(walletStats.remainingBudget), tone: 'text-emerald-700' },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-xl bg-[#F1F3FC] px-2.5 py-2 transition hover:-translate-y-0.5 hover:bg-[#E9EBFA]">
                      <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-600">{tile.label}</p>
                      <p className={clsx('mt-0.5 text-[15px] font-extrabold', tile.tone)}>🪙 {tile.value}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                icon={Wallet}
                title="Coin Transactions"
                badge={adHistory.length ? <Pill tone="lavender" className="normal-case">{adHistory.length}</Pill> : null}
                actions={<IconBtn icon={RefreshCw} title="Refresh transactions" onClick={() => dispatch(fetchAdWalletHistory(id))} />}
              >
                {adStatus === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 py-6"><Loader2 className="h-4 w-4 animate-spin text-[#E8194E]" /><span className="text-xs text-neutral-400">Loading transactions…</span></div>
                ) : adStatus === 'failed' ? (
                  <p className="py-4 text-center text-xs text-red-500">{adError || 'Failed to load'}</p>
                ) : adHistory.length === 0 ? (
                  <p className="py-4 text-center text-[12.5px] text-neutral-400">No transactions found</p>
                ) : (
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {adHistory.map((tx, i) => {
                      const isDeduction = (tx.amount ?? 0) < 0
                      return (
                        <div key={tx._id || i} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-[#F1F3FC]">
                          <span className={clsx('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', isDeduction ? 'bg-pink-100 text-[#C81345]' : 'bg-purple-100 text-[#8E35B5]')}>
                            {isDeduction ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold capitalize text-neutral-800">{String(tx.type || 'Transaction').replace(/_/g, ' ').toLowerCase()}</p>
                            <p className="text-[10.5px] text-neutral-500">{formatDateTime(tx.createdAt || tx.transactionDate)}</p>
                          </div>
                          <p className={clsx('flex-shrink-0 text-[12.5px] font-bold', isDeduction ? 'text-[#C81345]' : 'text-[#8E35B5]')}>
                            {isDeduction ? '' : '+'}{formatNumber(tx.amount ?? 0)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <ModerationPanel contentType="ad" contentId={ad.id} />
            </div>
          </div>

          <AdStatsPanel stats={adStats} status={adStatsStatus} error={adStatsError} onRefresh={() => dispatch(fetchAdStats(id))} />
        </div>
      )}

      <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDeleteAd} title="Delete Spotlight" description="Are you sure you want to permanently delete this spotlight? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <ConfirmModal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} onConfirm={handleDeleteComment} title="Delete Comment" description="Are you sure you want to delete this comment? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={commentDeleting} />
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Ad" description="Provide a reason for rejection (optional)" size="sm"
        footer={<><Button variant="ghost" onClick={() => setRejectModal(false)} disabled={updatingStatus}>Cancel</Button><Button variant="danger" onClick={handleReject} loading={updatingStatus}>Reject</Button></>}>
        <Input label="Rejection reason" placeholder="Enter rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} fullWidth />
      </Modal>
      <Lightbox images={images} index={viewerIndex} onClose={() => setViewerIndex(-1)} onIndex={setViewerIndex} />
    </div>
  )
}
