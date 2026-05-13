import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  Image,
  Video,
  Briefcase,
  Megaphone,
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
import Button from '../components/Button.jsx';
import LoginAlertPanel from '../components/LoginAlertPanel.jsx';
import { fetchUsers } from '../store/usersSlice.js';
import { fetchVendors } from '../store/vendorsSlice.js';
import { fetchPosts } from '../store/postsSlice.js';
import { fetchAdsAdmin } from '../store/adsSlice.js';
import { formatCompactNumber, formatNumber, formatRelativeTime } from '../utils/helpers.jsx';

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
    save: Bookmark,
    user: Users
  };
  const colors = {
    like: 'text-red-500 bg-red-50',
    comment: 'text-blue-500 bg-blue-50',
    save: 'text-yellow-500 bg-yellow-50',
    user: 'text-green-600 bg-green-50'
  };
  const Icon = icons[type];
  const initials = String(user || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      {type === 'user' ? (
        <div className="w-9 h-9 rounded-lg bg-gradient-brand text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
          {initials}
        </div>
      ) : (
        <div className={`w-9 h-9 rounded-lg ${colors[type]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800">
          <span className="font-medium">{user}</span>
          <span className="text-neutral-500"> {type === 'user' ? 'joined with' : type === 'like' ? 'liked' : type === 'comment' ? 'commented on' : 'saved'} </span>
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
};

const getUserRecord = (entry) => entry?.user || entry || {};
const getPostRecord = (entry) => entry?.post || entry || {};
const getPostType = (entry) => String(entry?.item_type || entry?.type || entry?.post?.type || '').toLowerCase();
const getCreatedAt = (entry) => entry?.createdAt || entry?.created_at || entry?.registration_date || entry?.joined_at || null;

const buildLast30Days = (users) => {
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    return { key, date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), users: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  users.forEach((entry) => {
    const user = getUserRecord(entry);
    const createdAt = getCreatedAt(user);
    if (!createdAt) return;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (byKey.has(key)) byKey.get(key).users += 1;
  });
  return days.map(({ key, ...day }) => day);
};

const buildPostsVsReels = (posts) => {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    date.setHours(0, 0, 0, 0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, month: date.toLocaleDateString('en-US', { month: 'short' }), posts: 0, reels: 0 };
  });
  const byKey = new Map(months.map((month) => [month.key, month]));
  posts.forEach((entry) => {
    const record = getPostRecord(entry);
    const createdAt = getCreatedAt(record);
    if (!createdAt) return;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byKey.get(key);
    if (!bucket) return;
    const type = getPostType(entry) || getPostType(record);
    if (type === 'reel') bucket.reels += 1;
    else bucket.posts += 1;
  });
  return months.map(({ key, ...month }) => month);
};

const buildRoleData = (users) => {
  const colors = ['#E1306C', '#833AB4', '#22C55E', '#F59E0B', '#3B82F6'];
  const counts = users.reduce((acc, entry) => {
    const role = String(getUserRecord(entry)?.role || 'member').toLowerCase();
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([role, value], index) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value,
    color: colors[index % colors.length],
  }));
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const usersState = useSelector((state) => state.users);
  const vendorsState = useSelector((state) => state.vendors);
  const postsState = useSelector((state) => state.posts);
  const adsState = useSelector((state) => state.ads);

  const users = usersState?.items || [];
  const vendors = vendorsState?.items || [];
  const posts = postsState?.items || [];
  const ads = adsState?.items || [];

  useEffect(() => {
    if (usersState?.status === 'idle') dispatch(fetchUsers());
    if (vendorsState?.status === 'idle') dispatch(fetchVendors());
    if (postsState?.status === 'idle') dispatch(fetchPosts());
    if (adsState?.status === 'idle') dispatch(fetchAdsAdmin({ limit: 100 }));
  }, [dispatch, usersState?.status, vendorsState?.status, postsState?.status, adsState?.status]);

  const totals = useMemo(() => {
    const postItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) === 'post');
    const reelItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) === 'reel');
    return {
      totalUsers: usersState?.total || users.length,
      totalVendors: vendors.length,
      totalPosts: postItems.length,
      totalReels: reelItems.length,
      totalAds: ads.length,
    };
  }, [ads.length, posts, users.length, usersState?.total, vendors.length]);

  const newUsersData = useMemo(() => buildLast30Days(users), [users]);
  const postsVsReelsData = useMemo(() => buildPostsVsReels(posts), [posts]);
  const userRolesData = useMemo(() => buildRoleData(users), [users]);
  const recentActivity = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(getCreatedAt(getUserRecord(b)) || 0) - new Date(getCreatedAt(getUserRecord(a)) || 0))
      .slice(0, 5)
      .map((entry, index) => {
        const user = getUserRecord(entry);
        const name = user.username || user.full_name || user.email || 'Unknown user';
        const email = user.email || 'No email';
        const createdAt = getCreatedAt(user);
        return {
          id: user._id || user.id || index,
          type: 'user',
          user: name,
          target: email,
          time: createdAt ? `Joined ${formatRelativeTime(createdAt)}` : 'Join date unavailable',
        };
      });
  }, [users]);

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
          value={formatCompactNumber(totals.totalUsers)}
          icon={Users}
          trend="up"
          trendValue="Live"
          color="bg-gradient-brand"
        />
        <KPICard
          title="Total Vendors"
          value={formatCompactNumber(totals.totalVendors)}
          icon={Briefcase}
          trend="up"
          trendValue="Live"
          color="bg-primary"
        />
        <KPICard
          title="Total Posts"
          value={formatCompactNumber(totals.totalPosts)}
          icon={Image}
          trend="up"
          trendValue="Live"
          color="bg-secondary"
        />
        <KPICard
          title="Total Reels"
          value={formatCompactNumber(totals.totalReels)}
          icon={Video}
          trend="up"
          trendValue="Live"
          color="bg-green-500"
        />
        <KPICard
          title="Total Ads"
          value={formatCompactNumber(totals.totalAds)}
          icon={Megaphone}
          trend="up"
          trendValue="Live"
          color="bg-orange-500"
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
              <CardDescription>Latest user registrations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" icon={MoreHorizontal} />
          </CardHeader>
          <div className="max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id} {...activity} />
              ))
            ) : (
              <div className="py-10 text-center text-sm text-neutral-400">No recent users found</div>
            )}
          </div>
        </Card>

        {/* Login Alert Panel */}
        <LoginAlertPanel />
      </div>
    </div>
  );
};

export default Dashboard;
