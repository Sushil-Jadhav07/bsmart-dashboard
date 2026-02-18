import React from 'react';
import {
  Users,
  Image,
  Video,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import {
  kpiData,
  newUsersData,
  postsVsReelsData,
  userRolesData,
  recentActivity
} from '../data/mockData.jsx';
import { formatCompactNumber, formatNumber, formatRelativeTime, getStatusColor } from '../utils/helpers.jsx';

const KPICard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
  <Card hover>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Card>
);

const ActivityItem = ({ type, user, target, time }) => {
  const icons = {
    like: Heart,
    comment: MessageCircle,
    save: Bookmark
  };
  const colors = {
    like: 'text-red-500 bg-red-50',
    comment: 'text-blue-500 bg-blue-50',
    save: 'text-yellow-500 bg-yellow-50'
  };
  const Icon = icons[type];

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className={`w-9 h-9 rounded-lg ${colors[type]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800">
          <span className="font-medium">{user}</span>
          <span className="text-neutral-500"> {type === 'like' ? 'liked' : type === 'comment' ? 'commented on' : 'saved'} </span>
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
          <p className="text-neutral-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Button variant="primary" icon={TrendingUp}>Download Report</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Users"
          value={formatCompactNumber(kpiData.totalUsers)}
          icon={Users}
          trend="up"
          trendValue={`+${kpiData.usersGrowth}%`}
          color="bg-gradient-brand"
        />
        <KPICard
          title="Total Posts"
          value={formatCompactNumber(kpiData.totalPosts)}
          icon={Image}
          trend="up"
          trendValue={`+${kpiData.postsGrowth}%`}
          color="bg-primary"
        />
        <KPICard
          title="Total Reels"
          value={formatCompactNumber(kpiData.totalReels)}
          icon={Video}
          trend="up"
          trendValue={`+${kpiData.reelsGrowth}%`}
          color="bg-secondary"
        />
        <KPICard
          title="Total Revenue"
          value={formatCompactNumber(kpiData.totalRevenue)}
          icon={DollarSign}
          trend="up"
          trendValue={`+${kpiData.revenueGrowth}%`}
          color="bg-green-500"
        />
        {/* reports removed */}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>New Users</CardTitle>
            <CardDescription>Daily new user registrations over the last 30 days</CardDescription>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newUsersData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E1306C" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#E1306C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactNumber(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#E1306C" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#E1306C' }}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Posts vs Reels Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Posts vs Reels</CardTitle>
            <CardDescription>Monthly comparison of posts and reels</CardDescription>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postsVsReelsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactNumber(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="posts" name="Posts" fill="#E1306C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reels" name="Reels" fill="#833AB4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Roles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Distribution of users by role</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userRolesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {userRolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => formatNumber(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {userRolesData.map((role) => (
              <div key={role.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="text-sm text-neutral-600">{role.name}</span>
                </div>
                <span className="text-sm font-medium text-neutral-800">{formatNumber(role.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest user interactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" icon={MoreHorizontal} />
          </CardHeader>
          <div className="max-h-80 overflow-y-auto">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} {...activity} />
            ))}
          </div>
        </Card>

        {/* reports section removed */}
      </div>
    </div>
  );
};

export default Dashboard;
