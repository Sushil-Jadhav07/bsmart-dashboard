import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  Coins,
  Image,
  Layers3,
  Megaphone,
  Package,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card, { CardDescription, CardHeader, CardTitle } from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import LoginAlertPanel from '../components/LoginAlertPanel.jsx';
import { fetchUsers } from '../store/usersSlice.js';
import { fetchVendors } from '../store/vendorsSlice.js';
import { fetchPosts } from '../store/postsSlice.js';
import { fetchAdsAdmin } from '../store/adsSlice.js';
import { fetchTweets } from '../store/tweetsSlice.js';
import { fetchAllWallets } from '../store/walletSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { adminFetchAllPurchases, fetchAllPackages } from '../store/vendorPackagesSlice.js';
import { formatCompactNumber, formatNumber, truncateText } from '../utils/helpers.jsx';

const COLORS = {
  pink: '#E8194E',
  purple: '#833AB4',
  green: '#16A34A',
  orange: '#F97316',
  blue: '#2563EB',
  slate: '#334155',
  amber: '#D97706',
  cyan: '#0891B2',
};

const chartTooltip = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08)',
  fontSize: '12px',
};

const toArray = (value) => (Array.isArray(value) ? value : []);
const getRecord = (entry) => entry?.post || entry?.tweet || entry?.ad || entry?.vendor || entry?.user || entry || {};
const getPostRecord = (entry) => entry?.post || entry?.post_id || entry || {};
const getCreatedAt = (entry) => entry?.createdAt || entry?.created_at || entry?.registration_date || entry?.joined_at || entry?.purchased_at || null;
const getId = (entry, fallback) => String(entry?._id || entry?.id || entry?.post_id || entry?.ad_id || fallback || '');
const getPostType = (entry) => String(entry?.item_type || entry?.type || entry?.post?.type || '').toLowerCase();
const getStatus = (entry, fallback = 'live') => String(entry?.status || entry?.validated_status || entry?.approval_status || fallback).toLowerCase();
const getUserRecord = (entry) => entry?.user || entry || {};
const getUserName = (entry) => {
  const record = getRecord(entry);
  const user = record?.author || record?.user_id || record?.user || record?.vendor_id?.user_id || record?.vendor_id || record;
  return user?.full_name || user?.username || user?.business_name || user?.email || record?.business_name || 'Unknown';
};
const numberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};
const moneyValue = (entry) => numberValue(entry?.amount_paid, entry?.final_price, entry?.base_price, entry?.amount, entry?.price);
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const createRecentDays = (count) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (count - 1 - index));
  date.setHours(0, 0, 0, 0);
  return {
    key: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
});

const createRecentMonths = (count) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (count - 1 - index), 1);
  date.setHours(0, 0, 0, 0);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', { month: 'short' }),
  };
});

const incrementByDay = (rows, items, field, reader = getCreatedAt) => {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  items.forEach((entry) => {
    const createdAt = reader(getRecord(entry));
    if (!createdAt) return;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (byKey.has(key)) byKey.get(key)[field] += 1;
  });
};

const buildDailyMomentum = (users, posts, tweets, ads) => {
  const rows = createRecentDays(14).map((row) => ({ ...row, users: 0, content: 0, tweets: 0, ads: 0 }));
  incrementByDay(rows, users, 'users', (entry) => getCreatedAt(getUserRecord(entry)));
  incrementByDay(rows, posts, 'content', (entry) => getCreatedAt(getPostRecord(entry)));
  incrementByDay(rows, tweets, 'tweets');
  incrementByDay(rows, ads, 'ads');
  return rows.map(({ key, ...row }) => row);
};

const buildContentMix = (posts, tweets, ads) => {
  const months = createRecentMonths(6).map((row) => ({ ...row, posts: 0, reels: 0, tweets: 0, ads: 0 }));
  const byKey = new Map(months.map((row) => [row.key, row]));
  posts.forEach((entry) => {
    const record = getPostRecord(entry);
    const createdAt = getCreatedAt(record);
    if (!createdAt) return;
    const date = new Date(createdAt);
    const bucket = byKey.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    if (!bucket) return;
    const type = getPostType(entry) || getPostType(record);
    if (type === 'reel') bucket.reels += 1;
    else bucket.posts += 1;
  });
  [...tweets.map((tweet) => [tweet, 'tweets']), ...ads.map((ad) => [ad, 'ads'])].forEach(([entry, field]) => {
    const createdAt = getCreatedAt(getRecord(entry));
    if (!createdAt) return;
    const date = new Date(createdAt);
    const bucket = byKey.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    if (bucket) bucket[field] += 1;
  });
  return months.map(({ key, ...row }) => row);
};

const buildEngagement = (posts, tweets, ads) => {
  const months = createRecentMonths(6).map((row) => ({ ...row, likes: 0, comments: 0, views: 0, clicks: 0 }));
  const byKey = new Map(months.map((row) => [row.key, row]));
  [...posts, ...tweets, ...ads].forEach((entry) => {
    const record = getRecord(entry);
    const createdAt = getCreatedAt(record);
    if (!createdAt) return;
    const date = new Date(createdAt);
    const bucket = byKey.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    if (!bucket) return;
    bucket.likes += numberValue(record.likes_count, record.like_count, record.likes);
    bucket.comments += numberValue(record.comments_count, record.replies_count, record.comment_count, record.comments);
    bucket.views += numberValue(record.views_count, record.impressions, record.views);
    bucket.clicks += numberValue(record.clicks_count, record.clicks, record.cta_clicks);
  });
  return months.map(({ key, ...row }) => row);
};

const buildStatusData = (items, colorMap) => {
  const counts = items.reduce((acc, entry) => {
    const status = getStatus(getRecord(entry));
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([status, value], index) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value,
    color: colorMap[status] || Object.values(COLORS)[index % Object.values(COLORS).length],
  }));
};

const buildRecentContent = (posts, tweets, ads) => [
  ...posts.map((entry) => {
    const record = getPostRecord(entry);
    const type = getPostType(entry) === 'reel' ? 'Reel' : 'Post';
    return {
      id: getId(record),
      type,
      title: truncateText(record.caption || record.title || 'Media content', 64),
      owner: getUserName(record),
      status: getStatus(record),
      engagement: numberValue(record.likes_count) + numberValue(record.comments_count) + numberValue(record.views_count),
      createdAt: getCreatedAt(record),
    };
  }),
  ...tweets.map((tweet) => ({
    id: getId(tweet),
    type: 'Tweet',
    title: truncateText(tweet.content || 'Tweet content', 64),
    owner: getUserName(tweet),
    status: getStatus(tweet),
    engagement: numberValue(tweet.likes_count) + numberValue(tweet.reposts_count) + numberValue(tweet.replies_count),
    createdAt: getCreatedAt(tweet),
  })),
  ...ads.map((ad) => ({
    id: getId(ad),
    type: 'Ad',
    title: truncateText(ad.title || ad.headline || ad.caption || ad.description || 'Campaign', 64),
    owner: getUserName(ad),
    status: getStatus(ad),
    engagement: numberValue(ad.views_count, ad.impressions) + numberValue(ad.clicks_count, ad.clicks),
    createdAt: getCreatedAt(ad),
  })),
].filter((item) => item.id).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8);

const KPI_TONES = {
  brand: { icon: 'bg-primary/10 text-primary', accent: 'text-primary' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', accent: 'text-emerald-600' },
  rose: { icon: 'bg-rose-50 text-rose-600', accent: 'text-rose-600' },
  neutral: { icon: 'bg-neutral-100 text-neutral-600', accent: 'text-neutral-600' },
};

const KPI = ({ title, value, caption, icon: Icon, tone = 'brand', meter = 0, to }) => {
  const navigate = useNavigate();
  const styles = KPI_TONES[tone] || KPI_TONES.brand;

  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={clsx(
        'bg-white rounded-lg border border-neutral-200/80 px-4 py-3 transition-all duration-200',
        to && 'cursor-pointer hover:border-neutral-300/80 hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx('w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0', styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-bold tracking-tight text-neutral-900">{value}</h3>
            <span className={clsx('text-[9px] font-bold uppercase tracking-wide flex-shrink-0', styles.accent)}>Live</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{caption}</p>
        </div>
      </div>
      <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(6, meter))}%` }}
        />
      </div>
    </div>
  );
};

const StatusRow = ({ label, value, total, color }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-neutral-700">{label}</span>
      <span className="text-[11px] text-neutral-500">{formatNumber(value)} / {formatNumber(total)}</span>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent(value, total)}%`, background: color }} />
    </div>
  </div>
);

const statusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'approved', 'validated', 'live', 'completed'].includes(normalized)) return 'bg-green-50 text-green-700 border-green-200';
  if (['pending', 'draft', 'in_review'].includes(normalized)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['paused', 'inactive'].includes(normalized)) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (['rejected', 'deleted', 'failed'].includes(normalized)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const usersState = useSelector((state) => state.users);
  const vendorsState = useSelector((state) => state.vendors);
  const postsState = useSelector((state) => state.posts);
  const adsState = useSelector((state) => state.ads);
  const tweetsState = useSelector((state) => state.tweets);
  const walletState = useSelector((state) => state.wallet);
  const salesState = useSelector((state) => state.sales);
  const vendorPackagesState = useSelector((state) => state.vendorPackages);

  const users = toArray(usersState?.items);
  const vendors = toArray(vendorsState?.items);
  const posts = toArray(postsState?.items);
  const ads = toArray(adsState?.items);
  const tweets = toArray(tweetsState?.items);
  const transactions = toArray(walletState?.transactions);
  const salesOfficers = toArray(salesState?.officers);
  const packages = toArray(vendorPackagesState?.packages);
  const purchases = toArray(vendorPackagesState?.adminPurchases);

  useEffect(() => {
    if (usersState?.status === 'idle') dispatch(fetchUsers());
    if (vendorsState?.status === 'idle') dispatch(fetchVendors());
    if (postsState?.status === 'idle') dispatch(fetchPosts());
    if (adsState?.status === 'idle') dispatch(fetchAdsAdmin({ limit: 100 }));
    if (tweetsState?.status === 'idle') dispatch(fetchTweets());
    if (walletState?.status === 'idle') dispatch(fetchAllWallets());
    if (salesState?.officersStatus === 'idle') dispatch(fetchSalesOfficers());
    if (vendorPackagesState?.packagesStatus === 'idle') dispatch(fetchAllPackages());
    if (vendorPackagesState?.adminPurchasesStatus === 'idle') dispatch(adminFetchAllPurchases({ limit: 100 }));
  }, [
    adsState?.status,
    dispatch,
    postsState?.status,
    salesState?.officersStatus,
    tweetsState?.status,
    usersState?.status,
    vendorPackagesState?.adminPurchasesStatus,
    vendorPackagesState?.packagesStatus,
    vendorsState?.status,
    walletState?.status,
  ]);

  const totals = useMemo(() => {
    const postItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) !== 'reel');
    const reelItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) === 'reel');
    const activeAds = ads.filter((ad) => getStatus(ad) === 'active').length;
    const pendingAds = ads.filter((ad) => getStatus(ad) === 'pending').length;
    const validatedVendors = vendors.filter((vendor) => Boolean(getRecord(vendor)?.validated) || getStatus(vendor) === 'validated').length;
    const walletVolume = transactions.reduce((sum, tx) => sum + Math.abs(numberValue(tx.amount)), 0);
    const packageRevenue = purchases.reduce((sum, purchase) => sum + moneyValue(purchase), 0);
    const tweetEngagement = tweets.reduce((sum, tweet) => sum + numberValue(tweet.likes_count) + numberValue(tweet.reposts_count) + numberValue(tweet.replies_count), 0);
    const contentEngagement = posts.reduce((sum, entry) => {
      const record = getPostRecord(entry);
      return sum + numberValue(record.likes_count) + numberValue(record.comments_count) + numberValue(record.views_count);
    }, 0);

    return {
      totalUsers: usersState?.total || users.length,
      totalVendors: vendors.length,
      totalPosts: postItems.length,
      totalReels: reelItems.length,
      totalAds: ads.length,
      totalTweets: tweets.length,
      activeAds,
      pendingAds,
      validatedVendors,
      walletVolume,
      packageRevenue,
      salesOfficers: salesOfficers.length,
      packages: packages.length,
      totalEngagement: tweetEngagement + contentEngagement,
    };
  }, [ads, packages.length, posts, purchases, salesOfficers.length, transactions, tweets, users.length, usersState?.total, vendors]);

  const dailyMomentum = useMemo(() => buildDailyMomentum(users, posts, tweets, ads), [ads, posts, tweets, users]);
  const contentMix = useMemo(() => buildContentMix(posts, tweets, ads), [ads, posts, tweets]);
  const engagementData = useMemo(() => buildEngagement(posts, tweets, ads), [ads, posts, tweets]);
  const adStatusData = useMemo(() => buildStatusData(ads, {
    active: COLORS.green,
    pending: COLORS.amber,
    paused: COLORS.blue,
    rejected: '#DC2626',
    draft: COLORS.slate,
  }), [ads]);
  const recentContent = useMemo(() => buildRecentContent(posts, tweets, ads), [ads, posts, tweets]);
  const operatingQueues = [
    { label: 'Pending ads', value: totals.pendingAds, total: Math.max(totals.totalAds, 1), color: COLORS.amber },
    { label: 'Active ads', value: totals.activeAds, total: Math.max(totals.totalAds, 1), color: COLORS.green },
    { label: 'Validated vendors', value: totals.validatedVendors, total: Math.max(totals.totalVendors, 1), color: COLORS.blue },
    { label: 'Sales coverage', value: totals.salesOfficers, total: Math.max(totals.totalVendors, totals.salesOfficers, 1), color: COLORS.purple },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Admin Dashboard</p>
          <h1 className="font-display text-xl font-bold tracking-tight text-neutral-900 mt-0.5">Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor users, vendors, content, campaigns, wallets, packages and sales.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={TrendingUp}>Download Report</Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KPI title="Total Users" value={formatCompactNumber(totals.totalUsers)} caption="Members, vendors, sales and admins" icon={Users} tone="brand" meter={percent(totals.totalUsers, totals.totalUsers + totals.totalVendors)} to="/users" />
        <KPI title="Total Vendors" value={formatCompactNumber(totals.totalVendors)} caption={`${formatNumber(totals.validatedVendors)} validated profiles`} icon={Briefcase} tone="brand" meter={percent(totals.validatedVendors, totals.totalVendors)} to="/vendors" />
        <KPI title="Posts + Reels" value={formatCompactNumber(totals.totalPosts + totals.totalReels)} caption={`${formatNumber(totals.totalPosts)} posts, ${formatNumber(totals.totalReels)} reels`} icon={Layers3} tone="emerald" meter={percent(totals.totalReels, totals.totalPosts + totals.totalReels)} to="/posts" />
        <KPI title="Tweets" value={formatCompactNumber(totals.totalTweets)} caption="Text posts and replies feed" icon={Send} tone="brand" meter={percent(totals.totalTweets, totals.totalTweets + totals.totalPosts + totals.totalReels)} to="/tweets" />
        <KPI title="Ads" value={formatCompactNumber(totals.totalAds)} caption={`${formatNumber(totals.activeAds)} active, ${formatNumber(totals.pendingAds)} pending`} icon={Megaphone} tone="rose" meter={percent(totals.activeAds, totals.totalAds)} to="/ads" />
        <KPI title="Wallet Volume" value={formatCompactNumber(totals.walletVolume)} caption={`${formatNumber(transactions.length)} wallet transactions`} icon={Coins} tone="emerald" meter={Math.min(100, transactions.length * 8)} to="/wallets" />
        <KPI title="Packages" value={formatCompactNumber(totals.packages)} caption={`${formatNumber(purchases.length)} purchase records`} icon={Package} tone="brand" meter={Math.min(100, packages.length * 20)} to="/vendor-packages" />
        <KPI title="Sales Officers" value={formatCompactNumber(totals.salesOfficers)} caption="Assignment team capacity" icon={ShieldCheck} tone="neutral" meter={percent(totals.salesOfficers, totals.totalVendors)} to="/sales" />
      </div>

      {/* Growth Momentum + Operating Queues */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Growth Momentum</CardTitle>
            <CardDescription>Last 14 days across registrations, content, tweets and ads</CardDescription>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyMomentum}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="ads" name="Ads" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="users" name="Users" stroke={COLORS.pink} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="content" name="Posts/Reels" stroke={COLORS.green} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tweets" name="Tweets" stroke={COLORS.blue} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Queues</CardTitle>
            <CardDescription>Moderation, campaign and vendor readiness</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {operatingQueues.map((item) => <StatusRow key={item.label} {...item} />)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-neutral-50 border border-neutral-100 px-3 py-2.5">
              <Clock3 className="h-3.5 w-3.5 text-amber-600" />
              <p className="mt-1.5 text-lg font-bold text-neutral-900">{formatNumber(totals.pendingAds)}</p>
              <p className="text-[10px] text-neutral-500">Ads waiting</p>
            </div>
            <div className="rounded-md bg-neutral-50 border border-neutral-100 px-3 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <p className="mt-1.5 text-lg font-bold text-neutral-900">{formatNumber(totals.activeAds)}</p>
              <p className="text-[10px] text-neutral-500">Ads live</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Mix + Ad Status */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Content Mix</CardTitle>
            <CardDescription>Monthly split for posts, reels, tweets and campaigns</CardDescription>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentMix}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="posts" name="Posts" stackId="a" fill={COLORS.pink} />
                <Bar dataKey="reels" name="Reels" stackId="a" fill={COLORS.purple} />
                <Bar dataKey="tweets" name="Tweets" stackId="a" fill={COLORS.blue} />
                <Bar dataKey="ads" name="Ads" stackId="a" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ad Status</CardTitle>
            <CardDescription>Campaign pipeline by state</CardDescription>
          </CardHeader>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={adStatusData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">
                  {adStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(value) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {adStatusData.length > 0 ? adStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-semibold text-neutral-800">{formatNumber(entry.value)}</span>
              </div>
            )) : <p className="py-6 text-center text-sm text-neutral-400">No ad data available</p>}
          </div>
        </Card>
      </div>

      {/* Engagement + Recent Content */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Quality</CardTitle>
            <CardDescription>Likes, comments, views and campaign clicks</CardDescription>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="views" name="Views" fill={COLORS.cyan} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="likes" name="Likes" stroke={COLORS.pink} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="comments" name="Comments" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" name="Clicks" stroke={COLORS.orange} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Platform Content</CardTitle>
              <CardDescription>Newest posts, reels, tweets and ad campaigns</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Content</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Owner</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Eng.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentContent.length > 0 ? recentContent.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-neutral-100 text-neutral-500 flex-shrink-0">
                          {item.type === 'Tweet' ? <Send className="h-3 w-3" /> : item.type === 'Ad' ? <Megaphone className="h-3 w-3" /> : item.type === 'Reel' ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-neutral-800">{item.type}</p>
                          <p className="text-[10px] text-neutral-400 truncate max-w-[160px]">{item.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-neutral-600">{item.owner}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex rounded-full border px-1.5 py-px text-[9px] font-semibold capitalize ${statusBadgeClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-[11px] font-semibold text-neutral-800">{formatCompactNumber(item.engagement)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-3 py-6 text-center text-xs text-neutral-400">No recent content found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <LoginAlertPanel />
    </div>
  );
};

export default Dashboard;
