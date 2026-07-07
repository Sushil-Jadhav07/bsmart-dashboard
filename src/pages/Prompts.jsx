import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, Film, Heart, MessageCircle, MoreHorizontal, Search, Sparkles, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber, truncateText } from '../utils/helpers.jsx';

const PAGE_SIZE = 12;

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

const Prompts = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load promoted reels');
      setItems(Array.isArray(data?.data) ? data.data : []);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load promoted reels');
      setStatus('failed');
    }
  };

  useEffect(() => { load(); }, [token]);

  const rows = useMemo(() => items.map((item) => ({
    id: item.promote_reel_id || item._id,
    caption: item.caption || '(no caption)',
    owner: item.user_id?.username || item.user_id?.full_name || 'unknown',
    likes: Number(item.likes_count || 0),
    comments: Number(item.comments_count || 0),
    status: item.status || 'active',
    createdAt: item.createdAt || item.created_at,
  })), [items]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      String(row.id || '').toLowerCase().includes(query) ||
      row.caption.toLowerCase().includes(query) ||
      row.owner.toLowerCase().includes(query)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm]);

  const totals = useMemo(() => ({
    all: rows.length,
    likes: rows.reduce((sum, r) => sum + r.likes, 0),
    comments: rows.reduce((sum, r) => sum + r.comments, 0),
    live: rows.filter((r) => r.status === 'active').length,
  }), [rows]);

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete');
      setItems((prev) => prev.filter((item) => (item.promote_reel_id || item._id) !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e.message);
      setConfirmDelete(null);
    }
  };

  const handleView = (row) => navigate(`/promote/${row.id}`);

  return (
    <>
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Boosts</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">Boosts</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage boosted bSpark content and engagement</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Boosts', value: totals.all, icon: Sparkles, color: 'text-primary bg-primary/10' },
            { label: 'Likes', value: totals.likes, icon: Heart, color: 'text-rose-600 bg-rose-50' },
            { label: 'Comments', value: totals.comments, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Live', value: totals.live, icon: Film, color: 'text-violet-600 bg-violet-50' },
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
          <div className="p-3 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input type="text" placeholder="Search by ID, caption, or owner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Boost</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center"><Heart className="w-3.5 h-3.5 inline" /></th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center"><MessageCircle className="w-3.5 h-3.5 inline" /></th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-neutral-400 mt-3">Loading promoted reels...</p></td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><Search className="w-5 h-5 text-neutral-300 mx-auto" /><p className="text-sm font-medium text-neutral-500 mt-2">{error ? `Error: ${error}` : 'No promoted reels found'}</p></td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => handleView(row)} className="group hover:bg-neutral-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate max-w-[280px] group-hover:text-primary transition-colors">{truncateText(row.caption, 60)}</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">@{row.owner}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.likes)}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.comments)}</span></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-md capitalize bg-emerald-50 text-emerald-700">{row.status}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-neutral-500">{formatDateTime(row.createdAt)}</span></td>
                    <td className="px-4 py-3"><RowMenu onView={() => handleView(row)} onDelete={() => setConfirmDelete(row)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {formatNumber(filtered.length)}</p>
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
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Boost"
        description="Are you sure you want to delete this boost? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Prompts;
