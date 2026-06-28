import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, Film, Image, Megaphone, MoreHorizontal, MousePointerClick, Search, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteAdById, fetchAdCategories, fetchAdsAdmin } from '../store/adsSlice.js';
import { formatDateTime, formatNumber, truncateText } from '../utils/helpers.jsx';

const THUMB_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iI0Y5RkFGQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTQ0RTYzIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+QWQ8L3RleHQ+PC9zdmc+';

const PAGE_SIZE = 12;

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  paused: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  draft: 'bg-neutral-100 text-neutral-600',
};

const RowMenu = ({ onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg border border-neutral-200 shadow-lg py-1">
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
              <Eye className="w-3.5 h-3.5 text-neutral-400" /> View details
            </button>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Ads = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error, categories } = useSelector((state) => state.ads);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, ad: null });

  useEffect(() => { dispatch(fetchAdCategories()); dispatch(fetchAdsAdmin({ limit: 100 })); }, [dispatch]);

  const rows = useMemo(() => {
    return (items || []).map((ad) => {
      const id = ad._id || ad.ad_id || ad.id || '';
      const productTitle = Array.isArray(ad.product_offer) && ad.product_offer[0]?.title ? ad.product_offer[0].title : null;
      const title = ad.title || ad.headline || ad.caption || productTitle || 'Untitled ad';
      const creator = ad.vendor_id?.business_name || ad.vendor?.business_name || ad.user_id?.full_name || ad.user_id?.username || ad.user?.full_name || ad.user?.username || 'Unknown';
      const categoryRaw = ad.category || ad.targeting_rules?.category_label || '';
      const category = typeof categoryRaw === 'string' ? categoryRaw : categoryRaw?.label || categoryRaw?.name || '';
      const mediaItem = Array.isArray(ad.media) ? ad.media[0] : null;
      const mediaType = String(mediaItem?.media_type || mediaItem?.type || '').toLowerCase();
      const isVideo = mediaType.includes('video');
      const thumb = mediaItem?.thumbnails?.fileUrl || mediaItem?.thumbnail?.fileUrl || (Array.isArray(mediaItem?.thumbnails) && mediaItem.thumbnails[0]?.fileUrl) || (Array.isArray(mediaItem?.thumbnail) && mediaItem.thumbnail[0]?.fileUrl) || (!isVideo && mediaItem?.fileUrl) || THUMB_PLACEHOLDER;
      return {
        id, title, creator, category: category || 'General', thumbnail: thumb,
        type: isVideo ? 'video' : 'image',
        views: Number(ad.views_count ?? ad.views ?? 0),
        status: ad.status || 'pending',
        createdAt: ad.createdAt || ad.created_at || new Date().toISOString(),
      };
    });
  }, [items]);

  const categoryOptions = useMemo(() => {
    const mapped = (categories || []).map((c) => {
      const value = c?.value || c?.id || c?._id || c?.slug || c?.name || c?.label || '';
      const label = c?.label || c?.name || c?.title || String(value || 'Category');
      return { value: String(value), label };
    }).filter((o) => o.value);
    const unique = [];
    const seen = new Set();
    mapped.forEach((o) => { if (!seen.has(o.value)) { seen.add(o.value); unique.push(o); } });
    return [{ value: 'all', label: 'All Categories' }, ...unique];
  }, [categories]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || row.id.toLowerCase().includes(query) || row.title.toLowerCase().includes(query) || row.creator.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || String(row.category).toLowerCase() === String(categoryFilter).toLowerCase();
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, rows, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, categoryFilter]);

  const totals = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    views: rows.reduce((sum, r) => sum + r.views, 0),
  }), [rows]);

  const handleView = (row) => navigate(`/ads/${row.id}`);

  return (
    <>
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Campaign Management</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">Ads</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Review ad campaigns, status, and performance</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Ads', value: totals.all, icon: Megaphone, color: 'text-primary bg-primary/10' },
            { label: 'Active', value: totals.active, icon: Image, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Views', value: totals.views, icon: MousePointerClick, color: 'text-violet-600 bg-violet-50' },
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
              <input type="text" placeholder="Search by ID, title, or creator..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition" />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition">
                  {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
              </div>
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'paused', label: 'Paused' }].map((opt) => (
                  <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={clsx('px-2.5 py-1.5 rounded-md text-xs font-medium transition-all', statusFilter === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Ad</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Category</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center">Views</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-neutral-400 mt-3">Loading ads...</p></td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><Search className="w-5 h-5 text-neutral-300 mx-auto" /><p className="text-sm font-medium text-neutral-500 mt-2">{error ? `Error: ${error}` : 'No ads found'}</p></td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => handleView(row)} className="group hover:bg-neutral-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0 bg-neutral-50">
                          <img src={row.thumbnail} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = THUMB_PLACEHOLDER; }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-neutral-800 truncate max-w-[200px] group-hover:text-primary transition-colors">{truncateText(row.title, 50)}</p>
                            {row.type === 'video' ? <Film className="w-3 h-3 text-violet-500 flex-shrink-0" /> : <Image className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[200px] mt-0.5">{row.creator}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">{row.category}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.views)}</span></td>
                    <td className="px-4 py-3"><span className={clsx('inline-flex items-center text-xs font-medium px-2 py-1 rounded-md capitalize', statusColors[row.status] || statusColors.draft)}>{row.status}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-neutral-500">{formatDateTime(row.createdAt)}</span></td>
                    <td className="px-4 py-3"><RowMenu onView={() => handleView(row)} onDelete={() => setConfirmModal({ isOpen: true, ad: row })} /></td>
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
        onClose={() => setConfirmModal({ isOpen: false, ad: null })}
        onConfirm={() => { if (!confirmModal.ad?.id) return; dispatch(deleteAdById(confirmModal.ad.id)).finally(() => setConfirmModal({ isOpen: false, ad: null })); }}
        title="Delete Ad"
        description={`Are you sure you want to delete "${confirmModal.ad?.title || 'this ad'}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Ads;
