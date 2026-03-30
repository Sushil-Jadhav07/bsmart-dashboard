import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Users, Store, Activity, ShoppingBag, ShieldAlert, Flag, Inbox, Megaphone } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import StatsCard from '../components/StatsCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import Button from '../components/Button.jsx'
import { fetchUsers } from '../store/usersSlice.js'
import { fetchVendors } from '../store/vendorsSlice.js'
import { fetchPosts } from '../store/postsSlice.js'
import { fetchAdsAdmin } from '../store/adsSlice.js'

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

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [range, setRange] = useState('30d')
  const users = useSelector((s) => s.users.items)
  const vendors = useSelector((s) => s.vendors.items)
  const posts = useSelector((s) => s.posts.items)
  const ads = useSelector((s) => s.ads.items)

  useEffect(() => {
    dispatch(fetchUsers())
    dispatch(fetchVendors())
    dispatch(fetchPosts())
    dispatch(fetchAdsAdmin({}))
  }, [dispatch])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="primary" onClick={() => {
            dispatch(fetchUsers())
            dispatch(fetchVendors())
            dispatch(fetchPosts())
            dispatch(fetchAdsAdmin({}))
          }}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Users" value={dashboard.totals.users || 0} icon={Users} color="blue" />
        <StatsCard label="Total Vendors" value={dashboard.totals.vendors || 0} icon={Store} color="violet" />
        <StatsCard label="Total Posts" value={dashboard.totals.posts || 0} icon={Activity} color="green" />
        <StatsCard label="Total Ads" value={dashboard.totals.ads || 0} icon={Megaphone} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="User Growth">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dashboard.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="count" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Vendor Growth">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboard.vendorGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dashboard.revenue || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Post Engagement">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboard.engagement || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="likes" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="comments" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ad Performance" subtitle={`${dashboard.ads.impressions || 0} impressions`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboard.ads.performance || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="impressions" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="clicks" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard label="Pending Vendor Approvals" value={dashboard.totals.pendingVendors || 0} icon={ShoppingBag} />
          <StatsCard label="Reported Posts" value={dashboard.totals.reportedPosts || 0} icon={Flag} />
          <StatsCard label="Support Tickets" value={dashboard.totals.tickets || 0} icon={Inbox} />
          <StatsCard label="System Alerts" value={dashboard.totals.alerts || 0} icon={ShieldAlert} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/admin/vendors')}>Approve Vendors</Button>
        <Button onClick={() => navigate('/admin/posts')}>Review Posts</Button>
        <Button onClick={() => navigate('/admin/ads')}>Manage Ads</Button>
        <Button onClick={() => navigate('/vendor-packages')}>Vendor Packages</Button>
      </div>
    </div>
  )
}
