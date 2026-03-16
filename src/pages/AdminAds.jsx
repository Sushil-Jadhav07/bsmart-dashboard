import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import Button from '../components/Button.jsx'
import Badge from '../components/Badge.jsx'
import { fetchAdsAdmin, patchAdStatus, deleteAdById } from '../store/adsSlice.js'
import { formatNumber, formatDateTime } from '../utils/helpers.jsx'
import { CheckCircle2, XCircle, Pause, Trash2, Play, Eye } from 'lucide-react'

function BudgetBar({ spent, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0
  const exhausted = pct >= 100
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-xs text-neutral-500 mb-1">
        <span>{formatNumber(spent)} spent</span>
        <span>{formatNumber(total)} total</span>
      </div>
      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${exhausted ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-0.5">
        <span className="text-[10px] text-neutral-500">{pct}% utilized</span>
        {exhausted && (
          <span className="text-[10px] font-semibold text-red-500">Budget Exhausted</span>
        )}
      </div>
    </div>
  )
}

export default function AdminAds() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items: ads, status } = useSelector((s) => s.ads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    dispatch(fetchAdsAdmin({}))
  }, [dispatch])

  const data = useMemo(() => {
    let rows = ads || []
    if (statusFilter !== 'all') rows = rows.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((a) =>
        (String(a._id || a.id || '')).toLowerCase().includes(q) ||
        (String(a.caption || a.title || '')).toLowerCase().includes(q) ||
        (String(a.vendor_id?.business_name || '')).toLowerCase().includes(q)
      )
    }
    return rows
  }, [ads, search, statusFilter])

  const STATUS_BADGE = {
    active: 'success',
    pending: 'warning',
    paused: 'secondary',
    rejected: 'danger',
  }

  const columns = [
    {
      key: 'caption',
      title: 'Ad',
      render: (v, row) => {
        const thumb = row.media?.[0]?.thumbnails?.[0]?.fileUrl || row.media?.[0]?.fileUrl || ''
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            {thumb ? (
              <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-neutral-200 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 line-clamp-1">{v || row.title || '(no caption)'}</p>
              <p className="text-xs text-neutral-400">{row.category || '—'}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: 'vendor_id',
      title: 'Vendor',
      render: (v) => <span className="text-sm text-neutral-700">{v?.business_name || '—'}</span>
    },
    {
      key: 'likes_count',
      title: 'Engagement',
      render: (v, row) => (
        <div className="text-sm text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="text-pink-500">♥</span>
            <span>{formatNumber(row.likes_count ?? v ?? 0)} likes</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="text-blue-500">💬</span>
            <span>{formatNumber(row.comments_count ?? 0)} comments</span>
          </div>
        </div>
      )
    },
    {
      key: 'coins_reward',
      title: 'Coins/View',
      render: (v) => (
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
          🪙 {formatNumber(v || 0)}
        </span>
      )
    },
    {
      key: 'total_budget_coins',
      title: 'Budget',
      render: (v, row) => (
        <BudgetBar spent={row.total_coins_spent || 0} total={v || 0} />
      )
    },
    {
      key: 'views_count',
      title: 'Views',
      render: (v, row) => (
        <div className="text-sm text-neutral-600">
          <div>{formatNumber(v || 0)} total</div>
          <div className="text-xs text-neutral-400">{formatNumber(row.completed_views_count || 0)} completed</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (v) => <Badge variant={STATUS_BADGE[v] || 'secondary'}>{v}</Badge>
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (v) => <span className="text-xs text-neutral-400">{formatDateTime(v)}</span>
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => {
        const id = row._id || row.id
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/ads/${id}`)}>View</Button>
            {row.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                icon={CheckCircle2}
                className="text-emerald-600"
                onClick={() => dispatch(patchAdStatus({ id, status: 'active' }))}
              >
                Approve
              </Button>
            )}
            {row.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                icon={Pause}
                onClick={() => dispatch(patchAdStatus({ id, status: 'paused' }))}
              >
                Pause
              </Button>
            )}
            {row.status === 'paused' && (
              <Button
                variant="ghost"
                size="sm"
                icon={Play}
                className="text-green-600"
                onClick={() => dispatch(patchAdStatus({ id, status: 'active' }))}
              >
                Resume
              </Button>
            )}
            {(row.status === 'pending' || row.status === 'active') && (
              <Button
                variant="ghost"
                size="sm"
                icon={XCircle}
                className="text-amber-600"
                onClick={() => dispatch(patchAdStatus({ id, status: 'rejected' }))}
              >
                Reject
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              className="text-red-600"
              onClick={() => dispatch(deleteAdById(id))}
            >
              Delete
            </Button>
          </div>
        )
      }
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-neutral-900">Ads</h1>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="rejected">Rejected</option>
          </select>
        </FilterBar>
        {status === 'loading' ? (
          <div className="py-20 text-center text-neutral-400 text-sm">Loading ads…</div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>
    </div>
  )
}
