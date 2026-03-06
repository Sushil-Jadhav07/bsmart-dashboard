import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Users, Store, Activity, ShoppingBag, DollarSign, ShieldAlert, Flag, Inbox, Megaphone } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatsCard from '../components/StatsCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import Button from '../components/Button.jsx'
import { fetchAnalytics, setRange } from '../store/analyticsSlice.js'

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { data, status, range } = useSelector((s) => s.analytics)
  useEffect(() => {
    dispatch(fetchAnalytics(range))
  }, [dispatch, range])

  const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => dispatch(setRange(e.target.value))}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="primary">Export Reports</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Users" value={data?.totals.users || 0} icon={Users} color="blue" />
        <StatsCard label="Total Vendors" value={data?.totals.vendors || 0} icon={Store} color="violet" />
        <StatsCard label="Total Posts" value={data?.totals.posts || 0} icon={Activity} color="green" />
        <StatsCard label="Total Ads" value={data?.totals.ads || 0} icon={Megaphone} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="User Growth">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data?.userGrowth || []}>
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
            <BarChart data={data?.vendorGrowth || []}>
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
            <LineChart data={data?.revenue || []}>
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
            <BarChart data={data?.engagement || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="likes" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="comments" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ad Performance" subtitle={`${data?.ads.impressions || 0} impressions`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.ads.performance || []}>
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
          <StatsCard label="Pending Vendor Approvals" value={data?.totals.pendingVendors || 0} icon={ShoppingBag} />
          <StatsCard label="Reported Posts" value={data?.totals.reportedPosts || 0} icon={Flag} />
          <StatsCard label="Support Tickets" value={data?.totals.tickets || 0} icon={Inbox} />
          <StatsCard label="System Alerts" value={data?.totals.alerts || 0} icon={ShieldAlert} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button>Approve Vendors</Button>
        <Button>Review Reported Posts</Button>
        <Button>Send Announcement</Button>
        <Button>Manage Ads</Button>
      </div>
    </div>
  )
}

