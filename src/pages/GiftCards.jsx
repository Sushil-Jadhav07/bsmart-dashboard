import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  Gift, Plus, Search, X, Trash2, CheckCircle2,
  XCircle, Clock, ChevronLeft, ChevronRight,
  IndianRupee, MoreVertical, Pencil,
  Building2, Package, Loader2, RefreshCw,
} from 'lucide-react';
import { fetchGiftCards, deleteGiftCard, clearDeleteStatus } from '../store/giftCardsSlice.js';

const PAGE_SIZE = 9; // 3-column grid

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  active:   { label: 'Active',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-400', icon: CheckCircle2 },
  inactive: { label: 'Inactive', cls: 'bg-neutral-50 text-neutral-500 border-neutral-200', dot: 'bg-neutral-300', icon: Clock },
  draft:    { label: 'Draft',    cls: 'bg-amber-50 text-amber-600 border-amber-100',       dot: 'bg-amber-400',   icon: Clock },
  expired:  { label: 'Expired',  cls: 'bg-red-50 text-red-500 border-red-100',             dot: 'bg-red-400',     icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.inactive;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// Gradient backgrounds for cards without media
const CARD_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-rose-500 to-pink-700',
  'from-amber-400 to-orange-600',
  'from-sky-500 to-blue-700',
  'from-emerald-400 to-teal-600',
  'from-indigo-500 to-blue-700',
];

// ── Gift Card tile ─────────────────────────────────────────────────────────

function GiftCardTile({ card, idx, onEdit, onDelete, onView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
  const id = card.id ?? card._id;
  const status = card.card_status ?? card.status ?? 'inactive';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Media / gradient header */}
      <div 
        className={clsx('relative h-32 w-full overflow-hidden bg-gradient-to-br cursor-pointer', gradient)}
        onClick={() => onView(id)}
      >
        {card.media?.url ? (
          <img src={card.media.url} alt={card.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gift className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2.5 left-2.5">
          <StatusBadge status={status} />
        </div>
        {/* Action menu */}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl border border-neutral-200 shadow-lg py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(id); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    <Gift className="w-3.5 h-3.5 text-neutral-400" /> View
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(id); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    <Pencil className="w-3.5 h-3.5 text-neutral-400" /> Edit
                  </button>
                  <div className="h-px bg-neutral-100 mx-2" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(id); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Title + vendor */}
        <div>
          <h3 
            className="text-[14px] font-bold text-neutral-900 leading-tight line-clamp-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onView(id)}
          >
            {card.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {card.vendor && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <Building2 className="w-3 h-3" /> {card.vendor}
              </span>
            )}
            {card.category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                <Package className="w-2.5 h-2.5" /> {card.category}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {card.description && (
          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{card.description}</p>
        )}

        {/* Denominations */}
        {card.denominations?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Denominations</p>
            <div className="flex flex-wrap gap-1.5">
              {card.denominations.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  {d.bcoins > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700">
                      🪙 {Number(d.bcoins).toLocaleString()}
                    </span>
                  )}
                  {d.amount > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">
                      <IndianRupee className="w-2.5 h-2.5" />{Number(d.amount).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
              {card.denominations.length > 4 && (
                <span className="text-[10px] text-neutral-400 font-semibold self-center">+{card.denominations.length - 4} more</span>
              )}
            </div>
          </div>
        )}

        {/* Footer: edit button */}
        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={() => onEdit(id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50 hover:border-primary hover:text-primary transition"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => onDelete(id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ────────────────────────────────────────────────────

function DeleteModal({ card, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="text-[16px] font-bold text-neutral-900">Delete Gift Card?</h2>
        <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">
          <strong className="text-neutral-800">{card?.title || 'This gift card'}</strong> will be permanently removed.
          This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-[13px] font-semibold text-white hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GiftCards() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();

  const { list, listStatus, listError, deleteStatus } = useSelector((s) => s.giftCards);

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page,         setPage]         = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchGiftCards());
  }, [dispatch]);

  // After successful delete, close modal
  useEffect(() => {
    if (deleteStatus === 'succeeded') {
      setDeleteTarget(null);
      dispatch(clearDeleteStatus());
    }
  }, [deleteStatus, dispatch]);

  // Stats
  const total    = list.length;
  const active   = list.filter((c) => (c.card_status ?? c.status) === 'active').length;
  const draft    = list.filter((c) => (c.card_status ?? c.status) === 'draft').length;
  const inactive = list.filter((c) => (c.card_status ?? c.status) === 'inactive').length;

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      const matchQ = !q ||
        (c.title ?? '').toLowerCase().includes(q) ||
        (c.vendor ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q);
      const st = c.card_status ?? c.status ?? '';
      const matchS = filterStatus === 'all' || st === filterStatus;
      return matchQ && matchS;
    });
  }, [list, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleView   = (id) => navigate(`/gift-cards/${id}`);
  const handleEdit   = (id) => navigate(`/gift-cards/${id}/edit`);
  const handleDelete = (id) => {
    const card = list.find((c) => (c.id ?? c._id) === id);
    setDeleteTarget({ id, title: card?.title });
  };
  const confirmDelete = () => dispatch(deleteGiftCard(deleteTarget.id));

  const isLoading = listStatus === 'idle' || listStatus === 'loading';

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          card={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteStatus === 'loading'}
        />
      )}

      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Promotions</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Gift Cards</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Create and manage gift card products</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => dispatch(fetchGiftCards())}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 transition"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={() => navigate('/gift-cards/create')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-[13px] font-semibold shadow-soft hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Gift Card</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: total,    dot: 'bg-primary',      bg: 'bg-primary/5' },
            { label: 'Active',   value: active,   dot: 'bg-emerald-400',  bg: 'bg-emerald-50' },
            { label: 'Draft',    value: draft,    dot: 'bg-amber-400',    bg: 'bg-amber-50' },
            { label: 'Inactive', value: inactive, dot: 'bg-neutral-300',  bg: 'bg-neutral-50' },
          ].map(({ label, value, dot, bg }) => (
            <div key={label} className={clsx('rounded-xl border border-neutral-200 px-4 py-3.5 flex items-center gap-3', bg)}>
              <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} />
              <div>
                <p className="text-[20px] font-bold text-neutral-900 leading-none">{isLoading ? '—' : value}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, vendor or description…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1.5 py-1.5 flex-shrink-0 flex-wrap">
            {['all', 'active', 'draft', 'inactive'].map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                  filterStatus === s ? 'bg-gradient-brand text-white shadow-soft' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                )}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-pulse">
                <div className="h-32 bg-neutral-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded-lg w-1/2" />
                  <div className="h-3 bg-neutral-100 rounded-lg w-full" />
                  <div className="h-3 bg-neutral-100 rounded-lg w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {listStatus === 'failed' && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-[14px] font-semibold text-neutral-700">Failed to load gift cards</p>
            <p className="text-[12px] text-neutral-400 mt-1">{listError}</p>
            <button
              onClick={() => dispatch(fetchGiftCards())}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-semibold hover:opacity-90 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Cards grid */}
        {!isLoading && listStatus !== 'failed' && (
          <>
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-200">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                  <Gift className="w-7 h-7 text-neutral-400" />
                </div>
                <p className="text-[15px] font-bold text-neutral-700">
                  {filtered.length === 0 && list.length > 0 ? 'No matching gift cards' : 'No gift cards yet'}
                </p>
                <p className="text-[12px] text-neutral-400 mt-1.5 max-w-xs">
                  {filtered.length === 0 && list.length > 0
                    ? 'Try a different search or filter'
                    : 'Create your first gift card product to get started'}
                </p>
                {filtered.length === 0 && list.length > 0 ? (
                  <button onClick={() => { setSearch(''); setFilterStatus('all'); }} className="mt-4 text-[12px] text-primary font-semibold underline underline-offset-2 hover:opacity-80">
                    Clear filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/gift-cards/create')}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-[13px] font-semibold shadow-soft hover:opacity-90 transition"
                  >
                    <Plus className="w-4 h-4" /> Create Gift Card
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((card, idx) => (
                  <GiftCardTile
                    key={card.id ?? card._id}
                    card={card}
                    idx={(page - 1) * PAGE_SIZE + idx}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-5 py-3">
                <p className="text-[12px] text-neutral-400">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} gift cards
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={clsx('w-8 h-8 rounded-lg text-[13px] font-semibold transition', n === page ? 'bg-gradient-brand text-white' : 'text-neutral-500 hover:bg-neutral-100')}
                    >
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
