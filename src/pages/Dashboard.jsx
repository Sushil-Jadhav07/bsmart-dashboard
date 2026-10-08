import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  ChartColumn,
  ChevronRight,
  Clock,
  Contact,
  Download,
  EllipsisVertical,
  Hourglass,
  Image,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  SlidersHorizontal,
  SquarePlay,
  Store,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Area,
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
import LoginAlertPanel from '../components/LoginAlertPanel.jsx';
import { API_BASE_URL } from '../lib/apiBase.js';
import { fetchUsers } from '../store/usersSlice.js';
import { fetchVendors } from '../store/vendorsSlice.js';
import { fetchPosts } from '../store/postsSlice.js';
import { fetchAdsAdmin } from '../store/adsSlice.js';
import { fetchTweets } from '../store/tweetsSlice.js';
import { fetchAllWallets } from '../store/walletSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { adminFetchAllPurchases, fetchAllPackages } from '../store/vendorPackagesSlice.js';
import { formatCompactNumber, formatNumber, formatRelativeTime, truncateText } from '../utils/helpers.jsx';

const COLORS = {
  pink: '#E8194E',
  purple: '#8E35B5',
  green: '#10B981',
  orange: '#F59E0B',
  barOrange: '#FB923C',
  blue: '#3B82F6',
  cyan: '#9BDCEB',
  grey: '#9CA3AF',
  red: '#EF4444',
};

const chartTooltip = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '10px',
  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08)',
  fontSize: '12px',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toArray = (value) => (Array.isArray(value) ? value : []);
const getRecord = (entry) => entry?.post || entry?.tweet || entry?.ad || entry?.vendor || entry?.user || entry || {};
const getPostRecord = (entry) => entry?.post || entry?.post_id || entry || {};
const getCreatedAt = (entry) => entry?.createdAt || entry?.created_at || entry?.registration_date || entry?.joined_at || entry?.purchased_at || null;
const getId = (entry, fallback) => String(entry?._id || entry?.id || entry?.post_id || entry?.ad_id || fallback || '');
const getPostType = (entry) => String(entry?.item_type || entry?.type || entry?.post?.type || '').toLowerCase();
const getStatus = (entry, fallback = 'live') => String(entry?.status || entry?.validated_status || entry?.approval_status || fallback).toLowerCase();
const getUserRecord = (entry) => entry?.user || entry || {};
const getOwner = (entry) => {
  const record = getRecord(entry);
  return record?.author || record?.user_id || record?.user || record?.vendor_id?.user_id || record?.vendor_id || record;
};
const getUserName = (entry) => {
  const record = getRecord(entry);
  const user = getOwner(entry);
  return user?.full_name || user?.username || user?.business_name || user?.email || record?.business_name || 'Unknown';
};
const getUserHandle = (entry) => getOwner(entry)?.username || '';
const numberValue = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};

const toAbsoluteMediaUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`;
  return `${API_BASE_URL}/uploads/${raw}`;
};

const getMediaThumb = (record) => {
  const media = Array.isArray(record?.media) ? record.media[0] : null;
  if (!media) return '';
  const thumbs = [media.thumbnail, media.thumbnails].flat().filter(Boolean);
  const thumb = thumbs.find((t) => t?.fileUrl || t?.url || t?.fileName);
  if (thumb) return toAbsoluteMediaUrl(thumb.fileUrl || thumb.url || thumb.fileName);
  const isVideo = String(media.type || media.mimeType || '').includes('video');
  return isVideo ? '' : toAbsoluteMediaUrl(media.fileUrl || media.url || media.fileName);
};

// Growth of the last 30 days vs the 30 days before, by creation date (or by a
// summed value such as wallet volume). Null when there's no prior period to compare.
const periodGrowth = (items, readTime, readValue = () => 1) => {
  const now = Date.now();
  let recent = 0;
  let prior = 0;
  items.forEach((item) => {
    const time = readTime(item);
    if (!time) return;
    if (time > now - 30 * DAY_MS) recent += readValue(item);
    else if (time > now - 60 * DAY_MS) prior += readValue(item);
  });
  if (!prior) return null;
  return ((recent - prior) / prior) * 100;
};

const createRecentDays = (count) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (count - 1 - index));
  date.setHours(0, 0, 0, 0);
  return { key: date.toISOString().slice(0, 10), date };
});

const createRecentMonths = (count) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (count - 1 - index), 1);
  date.setHours(0, 0, 0, 0);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
});

const dayKeyOf = (value) => {
  const time = toTime(value);
  return time ? new Date(time).toISOString().slice(0, 10) : null;
};

const buildDailyMomentum = (users, posts, tweets, ads) => {
  const rows = createRecentDays(14).map((row, index) => ({
    key: row.key,
    label: index === 13 ? 'Day 14 (Today)' : `Day ${index + 1}`,
    users: 0,
    content: 0,
    tweets: 0,
    ads: 0,
  }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const add = (items, field, reader) => items.forEach((entry) => {
    const row = byKey.get(dayKeyOf(reader(entry)));
    if (row) row[field] += 1;
  });
  add(users, 'users', (entry) => getCreatedAt(getUserRecord(entry)));
  add(posts, 'content', (entry) => getCreatedAt(getPostRecord(entry)));
  add(tweets, 'tweets', (entry) => getCreatedAt(getRecord(entry)));
  add(ads, 'ads', (entry) => getCreatedAt(getRecord(entry)));
  return rows;
};

const buildContentMix = (posts, tweets, ads) => {
  const months = createRecentMonths(6).map((row) => ({ ...row, posts: 0, reels: 0, tweets: 0, ads: 0 }));
  const byKey = new Map(months.map((row) => [row.key, row]));
  const monthKey = (value) => {
    const time = toTime(value);
    if (!time) return null;
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  posts.forEach((entry) => {
    const record = getPostRecord(entry);
    const bucket = byKey.get(monthKey(getCreatedAt(record)));
    if (!bucket) return;
    const type = getPostType(entry) || getPostType(record);
    if (type === 'reel') bucket.reels += 1;
    else bucket.posts += 1;
  });
  [...tweets.map((tweet) => [tweet, 'tweets']), ...ads.map((ad) => [ad, 'ads'])].forEach(([entry, field]) => {
    const bucket = byKey.get(monthKey(getCreatedAt(getRecord(entry))));
    if (bucket) bucket[field] += 1;
  });
  return months;
};

// Engagement totals bucketed by the content's creation day over the last 14
// days; the first 7 rows are the previous week, the last 7 this week.
const buildEngagementDays = (posts, tweets, ads) => {
  const rows = createRecentDays(14).map((row) => ({
    key: row.key,
    label: row.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    likes: 0,
    comments: 0,
    views: 0,
    clicks: 0,
  }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  [...posts.map(getPostRecord), ...tweets.map(getRecord), ...ads.map(getRecord)].forEach((record) => {
    const row = byKey.get(dayKeyOf(getCreatedAt(record)));
    if (!row) return;
    row.likes += numberValue(record.likes_count, record.like_count, record.likes);
    row.comments += numberValue(record.comments_count, record.replies_count, record.comment_count, record.comments);
    row.views += numberValue(record.views_count, record.impressions, record.views);
    row.clicks += numberValue(record.clicks_count, record.clicks, record.cta_clicks);
  });
  return rows;
};

const clickThroughRate = (rows) => {
  const views = rows.reduce((sum, row) => sum + row.views, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  return views > 0 ? (clicks / views) * 100 : null;
};

const AD_STATUS_META = {
  active: { label: 'Active', color: COLORS.green },
  pending: { label: 'Pending Review', color: COLORS.pink },
  paused: { label: 'Paused', color: COLORS.grey },
  rejected: { label: 'Rejected', color: COLORS.red },
};

const buildAdStatus = (ads) => {
  const counts = ads.reduce((acc, entry) => {
    const status = getStatus(getRecord(entry));
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const ordered = Object.keys(AD_STATUS_META).filter((key) => counts[key]);
  const others = Object.keys(counts).filter((key) => !AD_STATUS_META[key]);
  return [...ordered, ...others].map((status) => ({
    name: AD_STATUS_META[status]?.label || status.charAt(0).toUpperCase() + status.slice(1),
    value: counts[status],
    color: AD_STATUS_META[status]?.color || '#C4B5FD',
  }));
};

const TYPE_STYLE = {
  Moment: { text: 'text-[#E8194E]', tile: 'bg-pink-50 text-[#E8194E]', icon: Image },
  bSpark: { text: 'text-[#8E35B5]', tile: 'bg-purple-50 text-[#8E35B5]', icon: Zap },
  Buzz: { text: 'text-[#3B82F6]', tile: 'bg-blue-50 text-[#3B82F6]', icon: MessageSquare },
  Spotlight: { text: 'text-[#F59E0B]', tile: 'bg-amber-50 text-[#F59E0B]', icon: Megaphone },
};

const buildRecentContent = (posts, tweets, ads) => [
  ...posts.map((entry) => {
    const record = getPostRecord(entry);
    const likes = numberValue(record.likes_count);
    return {
      id: getId(record),
      type: getPostType(entry) === 'reel' ? 'bSpark' : 'Moment',
      title: truncateText(record.caption || record.title || 'Media content', 40),
      owner: getUserName(record),
      handle: getUserHandle(record),
      thumb: getMediaThumb(record),
      status: getStatus(record),
      engagement: likes + numberValue(record.comments_count) + numberValue(record.views_count),
      engDetail: `${formatCompactNumber(likes)} likes`,
      createdAt: getCreatedAt(record),
    };
  }),
  ...tweets.map((tweet) => ({
    id: getId(tweet),
    type: 'Buzz',
    title: truncateText(tweet.content || 'Buzz content', 40),
    owner: getUserName(tweet),
    handle: getUserHandle(tweet),
    thumb: '',
    status: getStatus(tweet),
    engagement: numberValue(tweet.likes_count) + numberValue(tweet.reposts_count) + numberValue(tweet.replies_count),
    engDetail: `${formatCompactNumber(numberValue(tweet.replies_count))} replies`,
    createdAt: getCreatedAt(tweet),
  })),
  ...ads.map((ad) => {
    const clicks = numberValue(ad.clicks_count, ad.clicks);
    return {
      id: getId(ad),
      type: 'Spotlight',
      title: truncateText(ad.title || ad.headline || ad.caption || ad.description || 'Campaign', 40),
      owner: getUserName(ad),
      handle: getUserHandle(ad),
      thumb: getMediaThumb(ad),
      status: getStatus(ad),
      engagement: numberValue(ad.views_count, ad.impressions) + clicks,
      engDetail: `${formatCompactNumber(clicks)} clicks`,
      createdAt: getCreatedAt(ad),
    };
  }),
].filter((item) => item.id).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);

// ─── UI pieces ──────────────────────────────────────────────────────────────

const KPI_TONES = {
  pink: { tile: 'bg-pink-50 text-[#E8194E]', bar: 'linear-gradient(90deg, #E8194E, #8E35B5)' },
  purple: { tile: 'bg-purple-50 text-[#8E35B5]', bar: 'linear-gradient(90deg, #E8194E, #E8194E)' },
  blue: { tile: 'bg-indigo-50 text-[#4F46E5]', bar: 'linear-gradient(90deg, #8E35B5, #3B82F6)' },
  green: { tile: 'bg-emerald-50 text-emerald-600', bar: 'linear-gradient(90deg, #10B981, #059669)' },
  orange: { tile: 'bg-orange-50 text-orange-500', bar: 'linear-gradient(90deg, #F59E0B, #F97316)' },
  rose: { tile: 'bg-rose-50 text-rose-500', bar: 'linear-gradient(90deg, #E8194E, #FB7185)' },
  violet: { tile: 'bg-violet-50 text-violet-600', bar: 'linear-gradient(90deg, #8E35B5, #6366F1)' },
  cyan: { tile: 'bg-cyan-50 text-cyan-600', bar: 'linear-gradient(90deg, #06B6D4, #3B82F6)' },
};

const BADGE_TONES = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  orange: 'text-orange-500',
  purple: 'text-[#8E35B5]',
  green: 'text-emerald-600',
};

const growthBadge = (value) => (value === null || !Number.isFinite(value)
  ? null
  : { text: `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, tone: value >= 0 ? 'up' : 'down', title: 'vs previous 30 days' });

const KPI = ({ title, value, badge, caption, icon: Icon, tone, to }) => {
  const navigate = useNavigate();
  const styles = KPI_TONES[tone];
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-4 pb-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-[0_8px_24px_-12px_rgba(16,24,40,0.18)]"
    >
      <div className="flex items-start justify-between">
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', styles.tile)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-600" />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-neutral-700">{title}</p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <h3 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-neutral-900">{value}</h3>
        {badge && <span title={badge.title} className={clsx('text-[11px] font-bold', BADGE_TONES[badge.tone])}>{badge.text}</span>}
      </div>
      <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">{caption}</p>
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: styles.bar }} />
    </button>
  );
};

const Panel = ({ title, subtitle, action, children, className }) => (
  <section className={clsx('rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[17px] font-bold tracking-tight text-neutral-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Legend = ({ items, shape = 'dot' }) => (
  <div className="flex max-w-[260px] flex-wrap justify-end gap-x-3 gap-y-1">
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-700">
        <span className={clsx('h-2.5 w-2.5', shape === 'dot' ? 'rounded-full' : 'rounded-[3px]')} style={{ background: item.color }} />
        {item.label}
      </span>
    ))}
  </div>
);

const IconButton = ({ icon: Icon, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
  >
    <Icon className="h-4 w-4" />
  </button>
);

const QueueRow = ({ label, value, pct, color, valueTone, extra }) => (
  <div>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-neutral-900">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={clsx('text-[13px] font-bold', valueTone || 'text-neutral-900')}>{value}</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{extra}</span>
      </span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  </div>
);

const STATUS_PILL = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-pink-50 text-[#E8194E] border-pink-200',
  in_review: 'bg-pink-50 text-[#E8194E] border-pink-200',
  processing: 'bg-purple-50 text-[#8E35B5] border-purple-200',
  draft: 'bg-purple-50 text-[#8E35B5] border-purple-200',
  paused: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
};

const StatusPill = ({ status }) => {
  const key = status === 'live' ? 'published' : status;
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize', STATUS_PILL[key] || 'bg-neutral-100 text-neutral-600 border-neutral-200')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {key.replace(/_/g, ' ')}
    </span>
  );
};

const AVATAR_TONES = ['bg-pink-100 text-[#E8194E]', 'bg-purple-100 text-[#8E35B5]', 'bg-blue-100 text-blue-600', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-indigo-100 text-indigo-600'];
const initialsOf = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const toneOf = (name) => AVATAR_TONES[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const ContentThumb = ({ item }) => {
  const [failed, setFailed] = useState(false);
  const style = TYPE_STYLE[item.type];
  const Icon = style.icon;
  if (item.thumb && !failed) {
    return <img src={item.thumb} alt="" onError={() => setFailed(true)} className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />;
  }
  return (
    <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', style.tile)}>
      <Icon className="h-4 w-4" />
    </span>
  );
};

const MonthTick = ({ x, y, payload, currentLabel }) => (
  <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={payload.value === currentLabel ? COLORS.pink : '#6B7280'}>
    {payload.value}
  </text>
);

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ─── Page ───────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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

  // "Updated …" reflects when the last data load finished; re-render each minute.
  const isLoading = [usersState?.status, vendorsState?.status, postsState?.status, adsState?.status, tweetsState?.status]
    .includes('loading');
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLoading) setUpdatedAt(new Date().toISOString());
  }, [isLoading]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const updatedLabel = formatRelativeTime(updatedAt);

  const totals = useMemo(() => {
    const postItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) !== 'reel');
    const reelItems = posts.filter((item) => (getPostType(item) || getPostType(getPostRecord(item))) === 'reel');
    const activeAds = ads.filter((ad) => getStatus(ad) === 'active').length;
    const pendingAds = ads.filter((ad) => getStatus(ad) === 'pending').length;
    const validatedVendors = vendors.filter((vendor) => Boolean(getRecord(vendor)?.validated) || getStatus(vendor) === 'validated').length;
    const walletVolume = transactions.reduce((sum, tx) => sum + Math.abs(numberValue(tx.amount)), 0);
    const activeOfficers = salesOfficers.filter((officer) => officer?.is_active !== false && getStatus(officer, 'active') !== 'inactive').length;
    const activePackages = packages.filter((pkg) => pkg?.is_active !== false && getStatus(pkg, 'active') === 'active').length;

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
      salesOfficers: salesOfficers.length,
      activeOfficers,
      packages: packages.length,
      activePackages,
    };
  }, [ads, packages, posts, salesOfficers, transactions, tweets, users.length, usersState?.total, vendors]);

  const growth = useMemo(() => ({
    users: periodGrowth(users, (entry) => toTime(getCreatedAt(getUserRecord(entry)))),
    vendors: periodGrowth(vendors, (entry) => toTime(getCreatedAt(getRecord(entry)))),
    content: periodGrowth(posts, (entry) => toTime(getCreatedAt(getPostRecord(entry)))),
    buzz: periodGrowth(tweets, (entry) => toTime(getCreatedAt(getRecord(entry)))),
    vault: periodGrowth(transactions, (tx) => toTime(getCreatedAt(tx)), (tx) => Math.abs(numberValue(tx.amount))),
  }), [posts, transactions, tweets, users, vendors]);

  const dailyMomentum = useMemo(() => buildDailyMomentum(users, posts, tweets, ads), [ads, posts, tweets, users]);
  const contentMix = useMemo(() => buildContentMix(posts, tweets, ads), [ads, posts, tweets]);
  const engagementDays = useMemo(() => buildEngagementDays(posts, tweets, ads), [ads, posts, tweets]);
  const adStatusData = useMemo(() => buildAdStatus(ads), [ads]);
  const recentContent = useMemo(() => buildRecentContent(posts, tweets, ads), [ads, posts, tweets]);

  const engagementWeek = engagementDays.slice(7);
  const ctr = clickThroughRate(engagementWeek);
  const prevCtr = clickThroughRate(engagementDays.slice(0, 7));
  const ctrDelta = ctr !== null && prevCtr !== null ? ctr - prevCtr : null;

  const mixAverages = ['posts', 'reels', 'tweets', 'ads'].reduce((acc, key) => {
    acc[key] = contentMix.reduce((sum, row) => sum + row[key], 0) / Math.max(contentMix.length, 1);
    return acc;
  }, {});
  const currentMonthLabel = contentMix[contentMix.length - 1]?.label;
  const totalContent = posts.length + tweets.length + ads.length;
  const lastMomentumIndex = dailyMomentum.length - 1;
  const momentumTicks = new Set([0, 2, 4, 6, 8, 10, lastMomentumIndex]);

  const kpis = [
    { title: 'Total Users', value: formatCompactNumber(totals.totalUsers), badge: growthBadge(growth.users), caption: 'Members, vendors, sales & admins', icon: Users, tone: 'pink', to: '/users' },
    { title: 'Total Vendors', value: formatCompactNumber(totals.totalVendors), badge: growthBadge(growth.vendors), caption: `${formatNumber(totals.validatedVendors)} validated vendor profiles`, icon: Store, tone: 'purple', to: '/vendors' },
    { title: 'Moments + bSparks', value: formatCompactNumber(totals.totalPosts + totals.totalReels), badge: growthBadge(growth.content), caption: `${formatNumber(totals.totalPosts)} moments, ${formatNumber(totals.totalReels)} bSparks`, icon: SquarePlay, tone: 'blue', to: '/posts' },
    { title: 'Buzz Posts', value: formatCompactNumber(totals.totalTweets), badge: growthBadge(growth.buzz), caption: 'Text posts & replies feed', icon: MessageSquare, tone: 'green', to: '/tweets' },
    { title: 'Spotlights', value: formatCompactNumber(totals.totalAds), badge: totals.pendingAds ? { text: `${formatNumber(totals.pendingAds)} queue`, tone: 'orange' } : null, caption: `${formatNumber(totals.activeAds)} active, ${formatNumber(totals.pendingAds)} pending review`, icon: Megaphone, tone: 'orange', to: '/ads' },
    { title: 'Vault Volume', value: formatCompactNumber(totals.walletVolume), badge: growthBadge(growth.vault), caption: `${formatNumber(transactions.length)} vault transactions`, icon: Wallet, tone: 'rose', to: '/wallets' },
    { title: 'Packages Active', value: formatCompactNumber(totals.activePackages), badge: purchases.length ? { text: `${formatNumber(purchases.length)} orders`, tone: 'purple' } : null, caption: `${formatNumber(purchases.length)} purchase records`, icon: Archive, tone: 'violet', to: '/vendor-packages' },
    { title: 'Sales Officers', value: formatCompactNumber(totals.salesOfficers), badge: totals.salesOfficers ? { text: `${percent(totals.activeOfficers, totals.salesOfficers)}% active`, tone: 'green' } : null, caption: 'Assignment team capacity', icon: Contact, tone: 'cyan', to: '/sales' },
  ];

  const handleDownload = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`bsmart-dashboard-${stamp}.csv`, [
      ['Metric', 'Value', 'Detail'],
      ...kpis.map((kpi) => [kpi.title, kpi.value, kpi.caption]),
      [],
      ['Ad status', 'Count'],
      ...adStatusData.map((row) => [row.name, row.value]),
    ]);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E8194E]">Admin Dashboard</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <h1 className="mt-1 font-display text-[22px] font-bold tracking-tight text-neutral-900">Dashboard Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] text-neutral-600">
            <Clock className="h-3.5 w-3.5 text-[#E8194E]" />
            {isLoading ? 'Updating…' : `Updated ${updatedLabel.toLowerCase()}`}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => <KPI key={kpi.title} {...kpi} />)}
      </div>

      {/* Growth Momentum + Operating Queues */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="Growth Momentum"
          subtitle="Last 14 days across registrations, content, buzz and spotlights"
          action={<Legend items={[
            { label: 'Users', color: COLORS.pink },
            { label: 'Moments', color: COLORS.green },
            { label: 'Buzz', color: COLORS.blue },
            { label: 'Spotlights', color: COLORS.barOrange },
          ]} />}
        >
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyMomentum} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.pink} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={COLORS.pink} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="spotBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.barOrange} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.barOrange} stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="#EEF0F4" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10.5, fontWeight: 700, fill: '#374151' }}
                  tickFormatter={(value, index) => (momentumTicks.has(index) ? value : '')}
                />
                <YAxis hide />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="ads" name="Spotlights" fill="url(#spotBars)" barSize={10} radius={[3, 3, 0, 0]} />
                <Area type="monotone" dataKey="users" name="Users" stroke={COLORS.pink} strokeWidth={2.5} fill="url(#usersArea)"
                  dot={(props) => (props.index === lastMomentumIndex
                    ? <circle key="users-last" cx={props.cx} cy={props.cy} r={4} fill={COLORS.pink} stroke="#fff" strokeWidth={2} />
                    : <g key={`users-${props.index}`} />)}
                />
                <Line type="monotone" dataKey="content" name="Moments/bSparks" stroke={COLORS.green} strokeWidth={2.5}
                  dot={(props) => (props.index === lastMomentumIndex
                    ? <circle key="content-last" cx={props.cx} cy={props.cy} r={3.5} fill={COLORS.green} stroke="#fff" strokeWidth={2} />
                    : <g key={`content-${props.index}`} />)}
                />
                <Line type="monotone" dataKey="tweets" name="Buzz" stroke={COLORS.blue} strokeWidth={2} strokeDasharray="2 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Operating Queues"
          subtitle="Moderation, campaign & vendor readiness"
          action={<IconButton icon={SlidersHorizontal} title="Review spotlight queue" onClick={() => navigate('/ads')} />}
        >
          <div className="mt-5 space-y-4">
            <QueueRow label="Active ads" value={formatNumber(totals.activeAds)} pct={percent(totals.activeAds, totals.totalAds)} extra={`${percent(totals.activeAds, totals.totalAds)}%`} color={COLORS.green} />
            <QueueRow label="Pending ads" value={formatNumber(totals.pendingAds)} valueTone="text-orange-500" pct={percent(totals.pendingAds, totals.totalAds)} extra={`${percent(totals.pendingAds, totals.totalAds)}%`} color={COLORS.orange} />
            <QueueRow label="Validated vendors" value={formatNumber(totals.validatedVendors)} pct={percent(totals.validatedVendors, totals.totalVendors)} extra={`${percent(totals.validatedVendors, totals.totalVendors)}%`} color={COLORS.pink} />
            <QueueRow label="Sales coverage" value={`${percent(totals.activeOfficers, totals.salesOfficers)}%`} pct={percent(totals.activeOfficers, totals.salesOfficers)} extra={`${totals.activeOfficers}/${totals.salesOfficers} active`} color={COLORS.purple} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('/ads')} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/70 px-3.5 py-3 text-left transition hover:bg-orange-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><Hourglass className="h-4 w-4" /></span>
              <span>
                <span className="block text-[18px] font-bold leading-tight text-orange-600">{formatNumber(totals.pendingAds)}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-500">Spotlights waiting</span>
              </span>
            </button>
            <button type="button" onClick={() => navigate('/ads')} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 text-left transition hover:bg-emerald-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><BadgeCheck className="h-4 w-4" /></span>
              <span>
                <span className="block text-[18px] font-bold leading-tight text-emerald-700">{formatNumber(totals.activeAds)}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-600">Spotlights live</span>
              </span>
            </button>
          </div>
        </Panel>
      </div>

      {/* Content Mix + Ad Status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="Content Mix"
          subtitle="Monthly distribution for moments, bSparks, buzz & spotlights"
          action={<Legend shape="square" items={[
            { label: 'Moments', color: COLORS.pink },
            { label: 'bSparks', color: COLORS.purple },
            { label: 'Buzz', color: COLORS.blue },
            { label: 'Spotlights', color: COLORS.orange },
          ]} />}
        >
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentMix} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={<MonthTick currentLabel={currentMonthLabel} />} />
                <YAxis hide />
                <Tooltip contentStyle={chartTooltip} cursor={{ fill: '#F5F6FA' }} />
                <Bar dataKey="posts" name="Moments" stackId="mix" fill={COLORS.pink} barSize={30} />
                <Bar dataKey="reels" name="bSparks" stackId="mix" fill={COLORS.purple} barSize={30} />
                <Bar dataKey="tweets" name="Buzz" stackId="mix" fill={COLORS.blue} barSize={30} />
                <Bar dataKey="ads" name="Spotlights" stackId="mix" fill={COLORS.orange} barSize={30} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: 'Avg. Moments', value: mixAverages.posts, color: 'text-[#E8194E]' },
              { label: 'Avg. bSparks', value: mixAverages.reels, color: 'text-[#8E35B5]' },
              { label: 'Avg. Buzz', value: mixAverages.tweets, color: 'text-[#3B82F6]' },
              { label: 'Avg. Spotlights', value: mixAverages.ads, color: 'text-[#D97706]' },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-[#E4E7F5] bg-[#F1F3FC] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{tile.label}</p>
                <p className={clsx('mt-0.5 text-[17px] font-bold', tile.color)}>{formatCompactNumber(Math.round(tile.value))}/mo</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Ad Status"
          subtitle="Campaign pipeline by state"
          action={<IconButton icon={EllipsisVertical} title="Open Spotlights" onClick={() => navigate('/ads')} />}
        >
          <div className="relative mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adStatusData.length ? adStatusData : [{ name: 'No ads', value: 1, color: '#EEF0F4' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={90}
                  paddingAngle={adStatusData.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(adStatusData.length ? adStatusData : [{ name: 'No ads', color: '#EEF0F4' }]).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                {adStatusData.length > 0 && <Tooltip contentStyle={chartTooltip} formatter={(value) => formatNumber(value)} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-[26px] font-extrabold leading-none text-neutral-900">{formatCompactNumber(totals.totalAds)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total ads</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {adStatusData.length > 0 ? adStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-neutral-700">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: entry.color }} />
                  {entry.name}
                </span>
                <span>
                  <span className="font-bold text-neutral-900">{formatNumber(entry.value)}</span>
                  <span className="ml-1.5 text-[11.5px] text-neutral-500">({((entry.value / Math.max(totals.totalAds, 1)) * 100).toFixed(1)}%)</span>
                </span>
              </div>
            )) : <p className="py-4 text-center text-sm text-neutral-400">No ad data available</p>}
          </div>
        </Panel>
      </div>

      {/* Engagement Quality + Recent Platform Content */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.45fr]">
        <Panel title="Engagement Quality" subtitle="Likes, comments, views and campaign clicks">
          <div className="mt-3">
            <Legend items={[
              { label: 'Views', color: '#22B8D6' },
              { label: 'Likes', color: COLORS.pink },
              { label: 'Comments', color: COLORS.purple },
              { label: 'Clicks', color: COLORS.orange },
            ]} />
          </div>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={engagementWeek} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="#EEF0F4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5, fontWeight: 700, fill: '#374151' }} />
                <YAxis hide />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="views" name="Views" fill={COLORS.cyan} barSize={9} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="likes" name="Likes" stroke={COLORS.pink} strokeWidth={2.5}
                  dot={(props) => (props.index === engagementWeek.length - 1
                    ? <circle key="likes-last" cx={props.cx} cy={props.cy} r={3.5} fill={COLORS.pink} stroke="#fff" strokeWidth={2} />
                    : <g key={`likes-${props.index}`} />)}
                />
                <Line type="monotone" dataKey="comments" name="Comments" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" name="Clicks" stroke={COLORS.orange} strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E4E7F5] bg-[#F1F3FC] px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-700">
              <MousePointerClick className="h-4 w-4 text-[#E8194E]" />
              Avg. Click-Through Rate
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-neutral-900">{ctr === null ? '—' : `${ctr.toFixed(2)}%`}</span>
              {ctrDelta !== null && (
                <span title="vs previous 7 days" className={clsx('text-[11px] font-bold', ctrDelta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {ctrDelta >= 0 ? '+' : ''}{ctrDelta.toFixed(1)}%
                </span>
              )}
            </span>
          </div>
        </Panel>

        <Panel
          title="Recent Platform Content"
          subtitle="Newest posts, reels, tweets and ad campaigns"
          action={<IconButton icon={ChartColumn} title="Open content" onClick={() => navigate('/posts')} />}
        >
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="bg-[#F1F3FC]">
                  {['Content', 'Owner', 'Eng.', 'Status'].map((head, index) => (
                    <th key={head} className={clsx('px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600', index === 0 && 'rounded-l-lg', index === 3 && 'rounded-r-lg')}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContent.length > 0 ? recentContent.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="transition-colors hover:bg-neutral-50/70">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ContentThumb item={item} />
                        <div className="min-w-0">
                          <p className="max-w-[170px] truncate text-[13px] font-semibold text-neutral-900">{item.title}</p>
                          <p className={clsx('text-[11px] font-semibold', TYPE_STYLE[item.type].text)}>{item.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={clsx('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold', toneOf(item.owner))}>
                          {initialsOf(item.owner)}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[120px] truncate text-[12.5px] font-medium text-neutral-800">{item.owner}</p>
                          {item.handle && <p className="max-w-[120px] truncate text-[11px] text-neutral-500">@{item.handle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[13px] font-bold text-neutral-900">{formatCompactNumber(item.engagement)}</p>
                      <p className="text-[11px] text-neutral-500">{item.engDetail}</p>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={item.status} /></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-3 py-10 text-center text-sm text-neutral-400">No recent content found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
            <p className="text-[12px] text-neutral-500">
              Showing latest {recentContent.length} of {formatNumber(totalContent)} contents
            </p>
            <button type="button" onClick={() => navigate('/posts')} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#E8194E] hover:underline">
              View All Stream <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Panel>
      </div>

      <LoginAlertPanel />
    </div>
  );
};

export default Dashboard;
