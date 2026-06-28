import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Users, Activity, ShoppingBag, ShieldAlert, Flag, Inbox, Eye, MousePointerClick, Heart, Coins, RefreshCw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import Button from '../components/Button.jsx'
import { fetchUsers } from '../store/usersSlice.js'
import { fetchVendors } from '../store/vendorsSlice.js'
import { fetchPosts } from '../store/postsSlice.js'
import { fetchAdsAdmin } from '../store/adsSlice.js'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'

const RANGE_TO_DAYS = { '7d': 7, '30d': 30, '90d': 90 }

const withinRange = (value, range) => {
  const days = RANGE_TO_DAYS[range] || 30
  if (!value) return false
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return false
  return ts >= Date.now() - days * 24 * 60 * 60 * 1000
}

const dateKey = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const labelForKey = (key) => {
  if (!key) return ''
  const d = new Date(key)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const chartTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08)',
  fontSize: '12px',
}

const MiniStat = ({ label, value, icon: Icon, color = 'neutral' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    neutral: 'bg-neutral-100 text-neutral-600',
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 px-3 py-2.5 flex items-center gap-3">
      <div className={clsx('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', tones[color])}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-neutral-900 leading-none">{value}</p>
        <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const ChartPanel = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-lg border border-neutral-200 p-4">
    <div className="mb-2">
      <h3 className="text-xs font-semibold text-neutral-800">{title}</h3>
      {subtitle && <p className="text-[10px] text-neutral-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
)

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [range, setRange] = useState('30d')
  const [summaryReloadKey, setSummaryReloadKey] = useState(0)
  const [summaryOverview, setSummaryOverview] = useState({
    total_impressions: 0,
    total_clicks: 0,
    engagement_rate: 0,
    total_spend: 0,
    conversions: 0,
    reach: 0,
  })
  const [summaryStatus, setSummaryStatus] = useState('idle')
  const users = useSelector((s) => s.users.items)
  const vendors = useSelector((s) => s.vendors.items)
  const posts = useSelector((s) => s.posts.items)
  const ads = useSelector((s) => s.ads.items)
  const token = useSelector((s) => s.auth.token)

  useEffect(() => {
    dispatch(fetchUsers())
    dispatch(fetchVendors())
    dispatch(fetchPosts())
    dispatch(fetchAdsAdmin({}))
  }, [dispatch])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const days = RANGE_TO_DAYS[range] || 30
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    })

    const loadSummary = async () => {
      setSummaryStatus('loading')
      try {
        const res = await fetch(`${API_BASE_WITH_PATH}/reports/summary?${params.toString()}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Failed to load report summary')
        setSummaryOverview({
          total_impressions: data?.overview?.total_impressions || 0,
          total_clicks: data?.overview?.total_clicks || 0,
          engagement_rate: data?.overview?.engagement_rate || 0,
          total_spend: data?.overview?.total_spend || 0,
          conversions: data?.overview?.conversions || 0,
          reach: data?.overview?.reach || 0,
        })
        setSummaryStatus('succeeded')
      } catch (error) {
        if (error.name === 'AbortError') return
        setSummaryOverview({
          total_impressions: 0,
          total_clicks: 0,
          engagement_rate: 0,
          total_spend: 0,
          conversions: 0,
          reach: 0,
        })
        setSummaryStatus('failed')
      }
    }

    loadSummary()
    return () => controller.abort()
  }, [token, range, summaryReloadKey])

  const dashboard = useMemo(() => {
    const filteredUsers = (users || []).filter((entry) => withinRange((entry?.user || entry)?.createdAt || (entry?.user || entry)?.created_at, range))
    const filteredVendors = (vendors || []).filter((entry) => withinRange(entry?.createdAt || entry?.created_at || entry?.user?.createdAt, range))
    const filteredPosts = (posts || []).filter((entry) => withinRange(entry?.createdAt || entry?.created_at, range))
    const filteredAds = (ads || []).filter((entry) => withinRange(entry?.createdAt || entry?.created_at, range))

    const userGrowthMap = new Map()
    filteredUsers.forEach((entry) => {
      const key = dateKey((entry?.user || entry)?.createdAt || (entry?.user || entry)?.created_at)
      if (!key) return
      userGrowthMap.set(key, (userGrowthMap.get(key) || 0) + 1)
    })

    const vendorGrowthMap = new Map()
    filteredVendors.forEach((entry) => {
      const key = dateKey(entry?.createdAt || entry?.created_at || entry?.user?.createdAt)
      if (!key) return
      vendorGrowthMap.set(key, (vendorGrowthMap.get(key) || 0) + 1)
    })

    const revenueMap = new Map()
    filteredAds.forEach((entry) => {
      const key = dateKey(entry?.createdAt || entry?.created_at)
      if (!key) return
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(entry?.total_coins_spent || 0))
    })

    const userGrowth = Array.from(userGrowthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([key, count]) => ({ name: labelForKey(key), count }))
    const vendorGrowth = Array.from(vendorGrowthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([key, count]) => ({ name: labelForKey(key), count }))
    const revenue = Array.from(revenueMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([key, value]) => ({ name: labelForKey(key), value }))

    const engagement = filteredPosts.slice(0, 6).map((post, index) => ({
      name: post?.caption?.slice(0, 12) || `Post ${index + 1}`,
      likes: Number(post?.likes_count || post?.likes?.length || post?.likes || 0),
      comments: Number(Array.isArray(post?.comments) ? post.comments.length : post?.comments_count || 0),
    }))

    const adPerformance = filteredAds.slice(0, 6).map((ad, index) => ({
      name: ad?.caption?.slice(0, 12) || `Ad ${index + 1}`,
      impressions: Number(ad?.views_count || 0),
      clicks: Number(ad?.likes_count || 0),
    }))

    return {
      totals: {
        users: users?.length || 0,
        vendors: vendors?.length || 0,
        posts: posts?.length || 0,
        ads: ads?.length || 0,
        pendingVendors: (vendors || []).filter((vendor) => !vendor?.validated || String(vendor?.status || '').toLowerCase() === 'pending').length,
        reportedPosts: (posts || []).reduce((sum, post) => sum + Number(post?.reports_count || post?.report_count || 0), 0),
        tickets: 0,
        alerts: 0,
      },
      userGrowth,
      vendorGrowth,
      revenue,
      engagement,
      ads: {
        impressions: (filteredAds || []).reduce((sum, ad) => sum + Number(ad?.views_count || 0), 0),
        performance: adPerformance,
      },
    }
  }, [users, vendors, posts, ads, range])

  const handleRefresh = () => {
    dispatch(fetchUsers())
    dispatch(fetchVendors())
    dispatch(fetchPosts())
    dispatch(fetchAdsAdmin({}))
    setSummaryReloadKey((v) => v + 1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Campaign performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="h-9 border border-neutral-200 rounded-lg px-3 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <MiniStat label="Impressions" value={summaryOverview.total_impressions || 0} icon={Eye} color="blue" />
        <MiniStat label="Clicks" value={summaryOverview.total_clicks || 0} icon={MousePointerClick} color="violet" />
        <MiniStat label="Engagement" value={`${Number(summaryOverview.engagement_rate || 0).toFixed(1)}%`} icon={Heart} color="rose" />
        <MiniStat label="Total Spend" value={summaryOverview.total_spend || 0} icon={Coins} color="green" />
        <MiniStat label="Conversions" value={summaryOverview.conversions || 0} icon={Activity} color="amber" />
        <MiniStat label="Reach" value={summaryOverview.reach || 0} icon={Users} color="blue" />
      </div>

      {summaryStatus === 'failed' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load reports summary overview.
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartPanel title="User Growth" subtitle="New registrations over time">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={dashboard.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line dataKey="count" stroke="#E8194E" strokeWidth={2} dot={{ r: 3, fill: '#E8194E' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Vendor Growth" subtitle="New vendors per period">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dashboard.vendorGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#833AB4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Revenue" subtitle="Coin spend trend">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={dashboard.revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line dataKey="value" stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: '#16A34A' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartPanel title="Post Engagement" subtitle="Likes vs comments">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dashboard.engagement || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="likes" fill="#E8194E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Ad Performance" subtitle={`${dashboard.ads.impressions || 0} total impressions`}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dashboard.ads.performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="impressions" fill="#833AB4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="#0891B2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Pending Vendors" value={dashboard.totals.pendingVendors || 0} icon={ShoppingBag} color="amber" />
          <MiniStat label="Reported Posts" value={dashboard.totals.reportedPosts || 0} icon={Flag} color="rose" />
          <MiniStat label="Support Tickets" value={dashboard.totals.tickets || 0} icon={Inbox} color="blue" />
          <MiniStat label="System Alerts" value={dashboard.totals.alerts || 0} icon={ShieldAlert} color="neutral" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/vendors')}>Approve Vendors</Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/posts')}>Review Posts</Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/ads')}>Manage Ads</Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/vendor-packages')}>Vendor Packages</Button>
      </div>
    </div>
  )
}
