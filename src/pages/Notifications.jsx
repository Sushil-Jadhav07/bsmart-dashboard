import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MailOpen,
  Search,
  Trash2,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { deleteNotification, fetchNotifications, markAllRead, markOneRead } from '../store/notificationsSlice.js';
import { getNotificationIcon, getNotificationDotColor, formatNotifTime } from '../utils/notificationHelpers.js';
import { formatNumber } from '../utils/helpers.jsx';
import Button from '../components/Button.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const PAGE_SIZE = 10;

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const SenderAvatar = ({ sender }) => {
  const hasAvatar = sender?.avatar_url && sender.avatar_url.trim();
  const name = sender?.full_name || sender?.username || '?';
  return (
    <div className="relative h-9 w-9 shrink-0 rounded-full border border-neutral-200 bg-white p-0.5">
      {hasAvatar ? (
        <img src={sender.avatar_url} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
          {avatarInitial(name)}
        </div>
      )}
    </div>
  );
};

const TypeBadge = ({ type }) => {
  const icon = getNotificationIcon(type);
  const label = String(type || 'system').replace(/_/g, ' ');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium capitalize text-neutral-700">
      <span className="text-sm leading-none">{icon}</span>
      {label}
    </span>
  );
};

const Notifications = () => {
  const dispatch = useDispatch();
  const { items, unreadCount, status, error } = useSelector((state) => state.notifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, notification: null });

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const rows = useMemo(() =>
    (items || []).map((item) => ({
      id: item._id,
      sender: item.sender || null,
      senderName: item.sender?.full_name || item.sender?.username || '-',
      senderUsername: item.sender?.username || '',
      type: item.type || 'system',
      message: item.message || 'Notification',
      link: item.link || null,
      isRead: !!item.isRead,
      createdAt: item.createdAt,
      postId: item.postId || item.relatedPost || null,
    })),
  [items]);

  const typeOptions = useMemo(() => {
    const types = [...new Set(rows.map((r) => r.type))].sort();
    return [
      { value: 'all', label: 'All Types' },
      ...types.map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unread' ? !row.isRead : row.isRead);
      const matchesType = typeFilter === 'all' || row.type === typeFilter;
      const matchesSearch =
        !query ||
        row.message.toLowerCase().includes(query) ||
        row.senderName.toLowerCase().includes(query) ||
        row.senderUsername.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [rows, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const readCount = rows.filter((r) => r.isRead).length;

  const statCards = [
    { label: 'Total', value: rows.length, icon: Bell, color: 'text-primary bg-primary/10' },
    { label: 'Unread', value: unreadCount, icon: Clock, color: unreadCount > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Read', value: readCount, icon: MailOpen, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const handleDelete = (notification) => {
    setConfirmModal({ isOpen: true, notification });
  };

  const confirmDelete = () => {
    if (confirmModal.notification) {
      dispatch(deleteNotification(confirmModal.notification.id));
    }
    setConfirmModal({ isOpen: false, notification: null });
  };

  const emptyMessage = error
    ? `Error: ${error}`
    : status === 'loading'
      ? 'Loading notifications...'
      : 'No notifications found';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Notification Center</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Notifications</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Review activity alerts, login events, and operational notices.</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="primary" icon={CheckCircle} size="sm" className="flex-shrink-0" onClick={() => dispatch(markAllRead())}>
              Mark All Read
            </Button>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((stat) => (
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by message, sender, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div className="flex gap-2">
              <Dropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'unread', label: 'Unread' },
                  { value: 'read', label: 'Read' },
                ]}
              />
              <Dropdown
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                options={typeOptions}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Sender</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Message</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Type</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Time</th>
                  <th className="px-4 py-2.5 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        'group transition-colors',
                        row.isRead ? 'bg-white' : 'bg-primary/[0.02]',
                      )}
                    >
                      {/* Unread dot */}
                      <td className="px-4 py-3">
                        {!row.isRead && (
                          <span className={clsx('block h-2 w-2 rounded-full', getNotificationDotColor(row.type))} />
                        )}
                      </td>

                      {/* Sender */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <SenderAvatar sender={row.sender} />
                          <div className="min-w-0">
                            <p className={clsx('truncate text-sm text-neutral-800', !row.isRead && 'font-semibold')}>
                              {row.sender?.full_name || row.senderUsername || '-'}
                            </p>
                            {row.senderUsername && (
                              <p className="truncate text-[11px] text-neutral-400">@{row.senderUsername}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className={clsx('truncate text-sm text-neutral-700', !row.isRead && 'font-medium text-neutral-900')}>
                          {row.message}
                        </p>
                        {row.link && (
                          <p className="truncate text-[11px] text-primary/70 mt-0.5">{row.link}</p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <TypeBadge type={row.type} />
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500 whitespace-nowrap">{formatNotifTime(row.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!row.isRead && (
                            <button
                              type="button"
                              onClick={() => dispatch(markOneRead(row.id))}
                              title="Mark as read"
                              className="p-1.5 rounded-md text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            title="Delete"
                            className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Bell className="w-5 h-5 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRows.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {formatNumber(filteredRows.length)}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, notification: null })}
        onConfirm={confirmDelete}
        title="Delete Notification"
        description={`Are you sure you want to delete this notification? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Notifications;
