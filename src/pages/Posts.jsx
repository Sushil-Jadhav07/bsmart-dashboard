import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, Film, Heart, Image, MessageCircle, MoreHorizontal, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { fetchPosts, deletePostById } from '../store/postsSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { API_BASE_URL } from '../lib/apiBase.js';

const THUMB_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y5RkFGQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTQ0RTYzIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+UG9zdDwvdGV4dD48L3N2Zz4=';

const PAGE_SIZE = 12;

const toAbsoluteMediaUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`;
  if (!raw.includes('/') && raw.includes('.')) return `${API_BASE_URL}/uploads/${raw}`;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
};

const getThumbnailUrl = (media) => {
  if (!media) return '';
  const candidates = [];
  if (Array.isArray(media.thumbnail)) candidates.push(...media.thumbnail);
  else if (media.thumbnail && typeof media.thumbnail === 'object') candidates.push(media.thumbnail);
  if (Array.isArray(media.thumbnails)) candidates.push(...media.thumbnails);
  for (const item of candidates) {
    const resolved = toAbsoluteMediaUrl(item?.fileUrl || item?.url || item?.fileName);
    if (resolved) return resolved;
  }
  return toAbsoluteMediaUrl(media.fileUrl || media.url || media.fileName);
};

const RowMenu = ({ onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg border border-neutral-200 shadow-lg py-1 overflow-hidden">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              View details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Posts = ({ forcedType = null, title = 'Moments' }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.posts);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(forcedType || 'all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, post: null });

  useEffect(() => { dispatch(fetchPosts()); }, [dispatch]);
  useEffect(() => { if (forcedType) setTypeFilter(forcedType); }, [forcedType]);

  const rows = useMemo(() => {
    return (items || []).map((post) => {
      const id = post.post_id || post._id || post.id || post.uuid || '';
      const owner = post.user_id?.full_name || post.user_id?.username || post.username || 'Unknown';
      const ownerAvatar = post.user_id?.profile_picture || post.user_id?.avatar || '';
      const mediaItem = Array.isArray(post.media) ? post.media[0] : null;
      const mediaType = String(mediaItem?.type || mediaItem?.media_type || '').toLowerCase();
      const isVideo = mediaType.includes('video');
      const type = isVideo || String(post.type || post.item_type || '').toLowerCase() === 'reel' ? 'reel' : 'post';
      return {
        id, postId: id, owner,
        ownerAvatar: ownerAvatar ? toAbsoluteMediaUrl(ownerAvatar) : '',
        thumbnail: getThumbnailUrl(mediaItem) || THUMB_PLACEHOLDER,
        type,
        caption: post.caption || post.title || post.description || '',
        likes: Number(post.likes_count ?? post.likes ?? post.likesCount ?? 0),
        comments: Number(Array.isArray(post.comments) ? post.comments.length : post.comments_count ?? post.commentsCount ?? 0),
        createdAt: post.createdAt || post.created_at || new Date().toISOString(),
      };
    });
  }, [items]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || row.postId.toLowerCase().includes(query) || row.owner.toLowerCase().includes(query) || row.caption.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || row.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [rows, searchTerm, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, typeFilter]);

  const totals = useMemo(() => ({
    all: rows.length,
    posts: rows.filter((r) => r.type === 'post').length,
    reels: rows.filter((r) => r.type === 'reel').length,
    engagement: rows.reduce((sum, r) => sum + r.likes + r.comments, 0),
  }), [rows]);

  const handleView = (row) => navigate(row.type === 'reel' ? `/reels/${row.id}` : `/posts/${row.id}`);

  return (
    <>
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Content Management</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">{title}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Review and moderate platform content</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totals.all, icon: Image, color: 'text-primary bg-primary/10' },
            { label: 'Moments', value: totals.posts, icon: Image, color: 'text-blue-600 bg-blue-50' },
            { label: 'bSparks', value: totals.reels, icon: Film, color: 'text-violet-600 bg-violet-50' },
            { label: 'Engagement', value: totals.engagement, icon: Heart, color: 'text-rose-600 bg-rose-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{formatNumber(stat.value)}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, owner, or caption..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            {!forcedType && (
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                {[{ value: 'all', label: 'All' }, { value: 'post', label: 'Moments' }, { value: 'reel', label: 'bSparks' }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all', typeFilter === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Content</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Owner</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Type</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center"><Heart className="w-3.5 h-3.5 inline" /></th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center"><MessageCircle className="w-3.5 h-3.5 inline" /></th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-neutral-400 mt-3">Loading content...</p></td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Search className="w-5 h-5 text-neutral-300 mx-auto" /><p className="text-sm font-medium text-neutral-500 mt-2">{error ? `Error: ${error}` : 'No content found'}</p></td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => handleView(row)} className="group hover:bg-neutral-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0 bg-neutral-50">
                          <img src={row.thumbnail} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = THUMB_PLACEHOLDER; }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate max-w-[220px] group-hover:text-primary transition-colors">{row.caption || row.postId}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[220px] mt-0.5">ID: {row.postId.slice(0, 12)}{row.postId.length > 12 ? '...' : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.ownerAvatar ? (
                          <img src={row.ownerAvatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold text-neutral-500">{row.owner[0]?.toUpperCase()}</span></div>
                        )}
                        <span className="text-sm text-neutral-700 truncate max-w-[120px]">{row.owner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md', row.type === 'reel' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700')}>
                        {row.type === 'reel' ? <Film className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                        {row.type === 'reel' ? 'Reel' : 'Post'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.likes)}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.comments)}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-neutral-500">{formatDateTime(row.createdAt)}</span></td>
                    <td className="px-4 py-3">
                      <RowMenu onView={() => handleView(row)} onDelete={() => setConfirmModal({ isOpen: true, post: row })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {formatNumber(filteredRows.length)}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
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
        description={`Are you sure you want to delete ${confirmModal.post?.postId || 'this content'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Posts;
