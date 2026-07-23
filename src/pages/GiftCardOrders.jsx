import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  Gift,
  RefreshCw,
  Search,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MoreVertical,
  Eye,
  Play,
  Trash2,
  Coins,
} from 'lucide-react';
import {
  cancelGiftCardOrder,
  clearCancelStatus,
  clearDeleteStatus,
  deleteGiftCardOrder,
  fetchGiftCardOrders,
} from '../store/giftCardOrdersSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';
import Button from '../components/Button.jsx';

const PAGE_SIZE = 10;

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
};

// Delete confirm modal
const DeleteModal = ({ order, onConfirm, onCancel, loading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="text-[16px] font-bold text-neutral-900">Delete Order?</h2>
        <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">
          <strong className="text-neutral-800">
            Order #{(order?._id || order?.id)?.slice(-8) || 'Unknown'}
          </strong>{' '}
          will be permanently removed. This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-[13px] font-semibold text-white hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const GiftCardOrders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list = [], listStatus, listError, cancelStatus, cancelError, deleteStatus, deleteError } = useSelector(
    (state) => state.giftCardOrders || {}
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [openMenuOrderId, setOpenMenuOrderId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const menuWidth = 192;

  const openMenu = (e, orderId) => {
    e.stopPropagation();
    if (openMenuOrderId === orderId) {
      setOpenMenuOrderId(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < 220 ? rect.top - 8 : rect.bottom + 4;
    const openUpward = spaceBelow < 220;
    setMenuPosition({ top, left, openUpward });
    setOpenMenuOrderId(orderId);
  };

  const closeMenu = () => {
    setOpenMenuOrderId(null);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (listStatus === 'idle') {
      dispatch(fetchGiftCardOrders());
    }
  }, [dispatch, listStatus]);

  useEffect(() => {
    if (cancelStatus === 'succeeded') {
      setMessage('Order cancelled successfully');
      dispatch(clearCancelStatus());
      dispatch(fetchGiftCardOrders());
      setTimeout(() => setMessage(''), 2500);
    } else if (cancelStatus === 'failed') {
      setMessage(cancelError || 'Failed to cancel order');
      setTimeout(() => setMessage(''), 2500);
    }
  }, [cancelStatus, cancelError, dispatch]);

  useEffect(() => {
    if (deleteStatus === 'succeeded') {
      setMessage('Order deleted successfully');
      setDeleteTarget(null);
      dispatch(clearDeleteStatus());
      dispatch(fetchGiftCardOrders());
      setTimeout(() => setMessage(''), 2500);
    } else if (deleteStatus === 'failed') {
      setMessage(deleteError || 'Failed to delete order');
      setDeleteTarget(null);
      setTimeout(() => setMessage(''), 2500);
    }
  }, [deleteStatus, deleteError, dispatch]);

  // Filter and search
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return list.filter((order) => {
      const matchSearch =
        !query ||
        (order._id || order.id || '').toLowerCase().includes(query) ||
        (order.giftCard?.title || '').toLowerCase().includes(query) ||
        (order.user?.full_name || order.user?.username || order.user?.email || '').toLowerCase().includes(query);
      const matchStatus = filterStatus === 'all' || order.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [list, searchTerm, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCancelOrder = async (orderId) => {
    closeMenu();
    dispatch(cancelGiftCardOrder(orderId));
  };

  const handleDeleteOrder = (orderId) => {
    const order = list.find((o) => (o._id || o.id) === orderId);
    closeMenu();
    setDeleteTarget(order);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      dispatch(deleteGiftCardOrder(deleteTarget._id || deleteTarget.id));
    }
  };

  const total = list.length;
  const pendingCount = list.filter((o) => o.status === 'pending').length;
  const processingCount = list.filter((o) => o.status === 'processing').length;
  const completedCount = list.filter((o) => o.status === 'completed').length;

  const emptyMessage = listError
    ? `Error: ${listError}`
    : listStatus === 'loading'
    ? 'Loading gift card orders...'
    : 'No gift card orders found';

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          order={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteStatus === 'loading'}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Promotions</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Gift Card Orders</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage gift card orders and cancel pending orders.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => dispatch(fetchGiftCardOrders())}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: formatNumber(total), color: 'text-primary bg-primary/10' },
            { label: 'Pending', value: formatNumber(pendingCount), color: 'text-amber-600 bg-amber-50' },
            { label: 'Processing', value: formatNumber(processingCount), color: 'text-blue-600 bg-blue-50' },
            { label: 'Completed', value: formatNumber(completedCount), color: 'text-emerald-600 bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{stat.value}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order ID, gift card or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1.5 py-1.5 flex-shrink-0 flex-wrap">
            {['all', 'pending', 'processing', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterStatus(s);
                  setPage(1);
                }}
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Order ID
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Gift Card
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    User
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">
                    Amount
                  </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">
                    Bcoins
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listStatus === 'loading' ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Loader2 className="w-6 h-6 text-neutral-300 mx-auto animate-spin" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">Loading orders...</p>
                    </td>
                  </tr>
                ) : visibleOrders.length > 0 ? (
                  visibleOrders.map((order) => {
                    const orderId = order._id || order.id;
                    const user = order.user_id || order.user || {};
                    const isPending = order.status === 'pending';
                    const isProcessing = order.status === 'processing';
                    const isCancelled = order.status === 'cancelled';
                    const isCompleted = order.status === 'completed';
                    const isMenuOpen = openMenuOrderId === orderId;
                    return (
                      <tr key={orderId} className="group bg-white transition-colors hover:bg-neutral-50/60">
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-neutral-700">
                            {orderId ? `#${orderId.slice(-8)}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {order.media?.url ? (
                              <img
                                src={order.media.url}
                                alt={order.title}
                                className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                                <Gift className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-800 truncate">
                                {order.title || 'Untitled Gift Card'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">
                              {user.full_name || user.username || user.email || 'Unknown User'}
                            </p>
                            {user.email && (
                              <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-neutral-800">
                            <IndianRupee className="w-3 h-3 inline-block mr-0.5" />
                            {formatNumber(order.amount || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-neutral-800">
                            <Coins className="w-3 h-3 inline-block mr-0.5" />
                            {formatNumber(order.bcoins || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-neutral-500">
                            {formatDate(order.createdAt || order.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => openMenu(e, orderId)}
                              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {isMenuOpen && menuPosition && createPortal(
                              <>
                                <div className="fixed inset-0 z-40" onClick={closeMenu} />
                                <div
                                  className="fixed z-50 w-48 bg-white rounded-xl border border-neutral-200 shadow-lg py-1"
                                  style={{
                                    left: menuPosition.left,
                                    top: menuPosition.openUpward ? undefined : menuPosition.top,
                                    bottom: menuPosition.openUpward ? window.innerHeight - menuPosition.top : undefined,
                                  }}
                                >
                                  {/* View Order - always show */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeMenu();
                                      navigate(`/gift-card-orders/${orderId}`);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-neutral-400" /> View Order
                                  </button>

                                  {/* Pending Status Actions */}
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          closeMenu();
                                          navigate(`/gift-card-orders/${orderId}/process`);
                                        }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition"
                                      >
                                        <Play className="w-3.5 h-3.5 text-neutral-400" /> Start Process
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelOrder(orderId);
                                        }}
                                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-red-400" /> Cancel Order
                                      </button>
                                    </>
                                  )}

                                  {/* Processing Status Actions */}
                                  {isProcessing && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        closeMenu();
                                        navigate(`/gift-card-orders/${orderId}/process`);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition"
                                    >
                                      <Play className="w-3.5 h-3.5 text-neutral-400" /> Complete Process
                                    </button>
                                  )}

                                  {/* Cancelled Status Actions */}
                                  {isCancelled && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOrder(orderId);
                                      }}
                                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete Order
                                    </button>
                                  )}
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Gift className="w-6 h-6 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredOrders.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredOrders.length)} of{' '}
                {formatNumber(filteredOrders.length)} orders
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!!message && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft',
          deleteStatus === 'succeeded' || cancelStatus === 'succeeded'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        )}>
          {message}
        </div>
      )}
    </>
  );
};

export default GiftCardOrders;
