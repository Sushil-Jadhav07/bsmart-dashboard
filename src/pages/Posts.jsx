import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  ArrowDownWideNarrow,
  ArrowUp,
  ArrowUpWideNarrow,
  Download,
  Eye,
  Heart,
  ImagePlay,
  MessageSquare,
  MoreHorizontal,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { fetchPosts, deletePostById } from '../store/postsSlice.js';
import { formatCompactNumber, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, getThumbnailUrl, growthOf as growthOfItems, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const growthOf = (rows) => growthOfItems(rows, (row) => row.createdAt);

const PAGE_SIZE = 10;

const DATE_FILTERS = [
  { value: 'all', label: 'Any time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

// Short, readable reference like "#MMT-8C21" built from the end of the id.
const shortCode = (id, type) => `#${type === 'reel' ? 'SPK' : 'MMT'}-${String(id).slice(-4).toUpperCase()}`;

const firstTag = (post) => {
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const tag = tags[0] || (String(post.caption || '').match(/#([\p{L}\p{N}_]+)/u) || [])[1] || '';
  return String(tag).replace(/^#/, '').replace(/_/g, ' ');
};

const formatDay = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatTime = (value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const GrowthBadge = ({ value }) => {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span title="vs previous 30 days" className={clsx('inline-flex items-center gap-1 text-[12px] font-semibold', up ? 'text-[#E8194E]' : 'text-rose-700')}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, iconTone, badge, bar, barColor, hoverTone }) => (
  <div className={clsx(
    'group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
    'transition-all duration-200 ease-out hover:-translate-y-1',
    hoverTone
  )}>
    <div className="flex items-start justify-between gap-3">
      <p className="pt-1 text-[11.5px] font-bold uppercase tracking-wide text-neutral-700 transition-colors group-hover:text-neutral-900">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6', iconTone)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    <div className="mt-3 flex items-end justify-between gap-3">
      <p className="font-display text-[30px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
      <span className="pb-0.5">{badge}</span>
    </div>
    <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#EEF0FA] transition-all duration-200 group-hover:h-1.5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, bar))}%`, background: barColor }} />
    </div>
  </div>
);

const RowMenu = ({ onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-400" />
              View details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Thumb = ({ src, isReel }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
      {src && !failed
        ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
        : <div className="flex h-full w-full items-center justify-center text-neutral-300"><ImagePlay className="h-5 w-5" /></div>}
      {isReel && (
        <span className="absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8E35B5] ring-1 ring-white">
          <Play className="h-2 w-2 fill-white text-white" />
        </span>
      )}
    </div>
  );
};

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">
      {String(name || '?')[0]?.toUpperCase()}
    </div>
  );
};

const Posts = ({ forcedType = null, title = 'Moments' }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.posts);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(forcedType || 'all');
  const [dateFilter, setDateFilter] = useState('all');
  const [engagedOnly, setEngagedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, post: null });

  useEffect(() => { dispatch(fetchPosts()); }, [dispatch]);
  useEffect(() => { if (forcedType) setTypeFilter(forcedType); }, [forcedType]);

  const rows = useMemo(() => {
    return (items || []).map((post) => {
      const id = post.post_id || post._id || post.id || post.uuid || '';
      const user = post.user_id && typeof post.user_id === 'object' ? post.user_id : {};
      const owner = user.full_name || user.username || post.username || 'Unknown';
      const ownerAvatar = user.avatar_url || user.profile_picture || user.avatar || '';
      const mediaItem = Array.isArray(post.media) ? post.media[0] : null;
      const mediaType = String(mediaItem?.type || mediaItem?.media_type || '').toLowerCase();
      const isVideo = mediaType.includes('video');
      const type = isVideo || String(post.type || post.item_type || '').toLowerCase() === 'reel' ? 'reel' : 'post';
      return {
        id,
        postId: id,
        code: shortCode(id, type),
        tag: firstTag(post),
        owner,
        handle: user.username || post.username || '',
        ownerAvatar: ownerAvatar ? toAbsoluteMediaUrl(ownerAvatar) : '',
        thumbnail: getThumbnailUrl(mediaItem),
        type,
        caption: post.caption || post.title || post.description || '',
        likes: Number(post.likes_count ?? post.likes ?? post.likesCount ?? 0) || 0,
        comments: Number(Array.isArray(post.comments) ? post.comments.length : post.comments_count ?? post.commentsCount ?? 0) || 0,
        createdAt: post.createdAt || post.created_at || new Date().toISOString(),
      };
    });
  }, [items]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const since = dateFilter === 'all' ? null : Date.now() - Number(dateFilter) * DAY_MS;
    const list = rows.filter((row) => {
      const matchesSearch = !query
        || [row.postId, row.code, row.owner, row.handle, row.caption, row.tag].some((v) => String(v).toLowerCase().includes(query));
      const matchesType = typeFilter === 'all' || row.type === typeFilter;
      const matchesDate = !since || new Date(row.createdAt).getTime() >= since;
      const matchesEngaged = !engagedOnly || row.likes + row.comments > 0;
      return matchesSearch && matchesType && matchesDate && matchesEngaged;
    });
    return list.sort((a, b) => (sortDir === 'desc' ? 1 : -1) * (new Date(b.createdAt) - new Date(a.createdAt)));
  }, [rows, searchTerm, typeFilter, dateFilter, engagedOnly, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount = (dateFilter !== 'all' ? 1 : 0) + (engagedOnly ? 1 : 0);

  useEffect(() => { setPage(1); }, [searchTerm, typeFilter, dateFilter, engagedOnly, sortDir]);

  const stats = useMemo(() => {
    const posts = rows.filter((r) => r.type === 'post');
    const reels = rows.filter((r) => r.type === 'reel');
    const likes = rows.reduce((sum, r) => sum + r.likes, 0);
    const comments = rows.reduce((sum, r) => sum + r.comments, 0);
    return {
      all: rows.length,
      posts: posts.length,
      reels: reels.length,
      engagement: likes + comments,
      likes,
      engagedShare: rows.length ? (rows.filter((r) => r.likes + r.comments > 0).length / rows.length) * 100 : 0,
      allGrowth: growthOf(rows),
      reelGrowth: growthOf(reels),
    };
  }, [rows]);

  const postShare = stats.all ? (stats.posts / stats.all) * 100 : 0;
  const reelShare = stats.all ? (stats.reels / stats.all) * 100 : 0;
  const perAsset = stats.all ? stats.engagement / stats.all : 0;

  const handleView = (row) => navigate(row.type === 'reel' ? `/reels/${row.id}` : `/posts/${row.id}`);

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`${title.toLowerCase()}-${stamp}.csv`, [
      ['Code', 'ID', 'Type', 'Owner', 'Username', 'Caption', 'Likes', 'Comments', 'Posted'],
      ...filteredRows.map((row) => [row.code, row.postId, row.type === 'reel' ? 'bSpark' : 'Moment', row.owner, row.handle, row.caption, row.likes, row.comments, row.createdAt]),
    ]);
  };

  const description = forcedType === 'reel'
    ? 'Review and moderate short-form bSparks and creator video reels.'
    : 'Review and moderate platform visual feeds, reels, and user-generated lifestyle stories.';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-pink-50/90 via-pink-50/30 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-widest text-[#E8194E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E8194E]" />
                Content Management
              </p>
              <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-tight text-neutral-900">{title}</h1>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">{description}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={!filteredRows.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E9EBFA] px-4 text-[13.5px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Download className="h-4 w-4" />
                Export Log
              </button>
              <button
                type="button"
                onClick={() => navigate('/reports/content')}
                title="Open the content moderation queue"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
              >
                <ShieldCheck className="h-4 w-4" />
                Auto-Audit Policy
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Assets"
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
            value={formatNumber(stats.all)}
            icon={ImagePlay}
            iconTone="bg-pink-100 text-[#E8194E]"
            badge={<GrowthBadge value={stats.allGrowth} />}
            bar={stats.engagedShare}
            barColor="#E8194E"
          />
          <StatCard
            label="Moments"
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(200,19,69,0.45)]"
            value={formatNumber(stats.posts)}
            icon={Sparkles}
            iconTone="bg-pink-100 text-[#C81345]"
            badge={(
              <span title="Moments' share of all assets" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C81345]">
                <ArrowUp className="h-3.5 w-3.5" />{postShare.toFixed(1)}%
              </span>
            )}
            bar={postShare}
            barColor="#C81345"
          />
          <StatCard
            label="bSparks"
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
            value={formatNumber(stats.reels)}
            icon={Play}
            iconTone="bg-purple-100 text-[#8E35B5] [&_svg]:fill-[#8E35B5]"
            badge={<GrowthBadge value={stats.reelGrowth} />}
            bar={reelShare}
            barColor="#8E35B5"
          />
          <StatCard
            label="Engagement Velocity"
            hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]"
            value={formatCompactNumber(stats.engagement)}
            icon={Heart}
            iconTone="bg-indigo-50 text-neutral-900 [&_svg]:fill-neutral-900"
            badge={(
              <span title="Average likes + comments per asset" className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-800">
                <Zap className="h-3.5 w-3.5" />{perAsset >= 10 ? formatCompactNumber(Math.round(perAsset)) : perAsset.toFixed(1)}/asset
              </span>
            )}
            bar={stats.engagement ? (stats.likes / stats.engagement) * 100 : 0}
            barColor="linear-gradient(90deg, #E8194E, #8E35B5)"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            {!forcedType ? (
              <div className="flex w-fit gap-1 rounded-xl bg-[#F1F3FC] p-1">
                {[{ value: 'all', label: 'All' }, { value: 'post', label: 'Moments' }, { value: 'reel', label: 'bSparks' }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={clsx(
                      'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all',
                      typeFilter === opt.value ? 'bg-white text-[#E8194E] shadow-sm ring-1 ring-pink-100' : 'text-neutral-600 hover:text-neutral-900'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : <div />}

            <div className="flex items-center gap-2">
              <div className="relative w-full lg:w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E72A8]" strokeWidth={2.25} />
                <input
                  type="text"
                  placeholder="Search by ID, owner, or caption..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-8 pr-3 text-[12.5px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={clsx(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition',
                    filtersOpen ? 'bg-[#DFE2F7] text-neutral-900' : 'bg-[#E9EBFA] text-neutral-900 hover:bg-[#DFE2F7]'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8194E] px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {filtersOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
                    <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold text-neutral-900">Filters</p>
                        {activeFilterCount > 0 && (
                          <button type="button" onClick={() => { setDateFilter('all'); setEngagedOnly(false); }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#E8194E]">
                            <X className="h-3 w-3" /> Clear
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">Date posted</p>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {DATE_FILTERS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDateFilter(opt.value)}
                            className={clsx(
                              'rounded-lg border px-2 py-1.5 text-[12px] font-medium transition',
                              dateFilter === opt.value ? 'border-pink-200 bg-pink-50 text-[#E8194E]' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12.5px] text-neutral-700">
                        <input type="checkbox" checked={engagedOnly} onChange={(e) => setEngagedOnly(e.target.checked)} className="h-4 w-4 rounded accent-[#E8194E]" />
                        Only content with engagement
                      </label>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
                aria-label="Toggle sort order"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#E9EBFA] text-neutral-800 transition hover:bg-[#DFE2F7]"
              >
                {sortDir === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-[#F7F8FD]">
                  {['Content', 'Creator Owner', 'Type', 'Engagement', 'Date Posted'].map((head) => (
                    <th key={head} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-700">{head}</th>
                  ))}
                  <th className="w-16 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading content...</p></td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No content found'}</p></td></tr>
                ) : visibleRows.map((row) => {
                  const isReel = row.type === 'reel';
                  return (
                    <tr key={row.id} onClick={() => handleView(row)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                      <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                        <div className="flex items-center gap-3">
                          <Thumb src={row.thumbnail} isReel={isReel} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[11px] font-bold uppercase tracking-wide">
                              <span className={isReel ? 'text-[#8E35B5]' : 'text-[#E8194E]'}>{row.code}</span>
                              {row.tag && <><span className="text-neutral-300">•</span><span className="truncate text-neutral-500">{row.tag}</span></>}
                            </p>
                            <p className="mt-0.5 max-w-[220px] truncate text-[13px] font-medium text-neutral-800 transition-colors group-hover:text-primary">
                              {row.caption || 'No caption'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={row.ownerAvatar} name={row.owner} />
                          <div className="min-w-0">
                            <p className="max-w-[140px] truncate text-[13px] font-medium text-neutral-800">{row.owner}</p>
                            {row.handle && <p className="max-w-[140px] truncate text-[11.5px] text-neutral-500">@{row.handle}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          isReel ? 'bg-purple-50 text-[#8E35B5]' : 'bg-pink-50 text-[#E8194E]'
                        )}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {isReel ? 'bSpark' : 'Moment'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-[12.5px] text-neutral-700">
                          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 fill-[#E8194E] text-[#E8194E]" />{formatCompactNumber(row.likes)}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-neutral-500" />{formatCompactNumber(row.comments)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12.5px] font-semibold text-[#C81345]">{formatDay(row.createdAt)}</p>
                        <p className="text-[11.5px] text-[#C81345]/70">{formatTime(row.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu onView={() => handleView(row)} onDelete={() => setConfirmModal({ isOpen: true, post: row })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <p className="text-[12px] text-neutral-500">
                  Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)}</span> of{' '}
                  <span className="font-semibold text-neutral-800">{formatNumber(filteredRows.length)}</span> content items
                </p>
                <span className={clsx('inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide', error ? 'text-rose-600' : 'text-emerald-600')}>
                  <span className={clsx('h-1.5 w-1.5 rounded-full', error ? 'bg-rose-500' : 'bg-emerald-500')} />
                  {error ? 'Sync error' : status === 'loading' ? 'Syncing feed' : 'Feed synced'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition',
                      p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100'
                    )}
                  >
                    {formatNumber(p)}
                  </button>
                )))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, post: null })}
        onConfirm={() => { if (!confirmModal.post?.id) return; dispatch(deletePostById(confirmModal.post.id)).finally(() => setConfirmModal({ isOpen: false, post: null })); }}
        title="Delete Content"
        description={`Are you sure you want to delete ${confirmModal.post?.code || 'this content'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Posts;
