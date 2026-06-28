import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { deleteNotification, fetchNotifications, markAllRead, markOneRead } from '../store/notificationsSlice.js';
import { formatNotifTime } from '../utils/notificationHelpers.js';
import { formatNumber, truncateText } from '../utils/helpers.jsx';

const Notifications = () => {
  const dispatch = useDispatch();
  const { items, unreadCount, status } = useSelector((state) => state.notifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('new');

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const rows = useMemo(() => (items || []).map((item) => ({
    id: item._id,
    message: item.message || 'Notification',
    sender: item.sender?.username || '-',
    type: item.type || 'system',
    status: item.isRead ? 'read' : 'unread',
    createdAt: item.createdAt,
  })), [items]);

  const visibleRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTab = tab === 'history' ? row.status === 'read' : row.status === 'unread';
      const matchesSearch = !query || row.message.toLowerCase().includes(query) || row.sender.toLowerCase().includes(query) || row.type.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [rows, searchTerm, tab]);

  return (
    <div className="space-y-5">
      <PremiumResourcePage
        eyebrow="Notification Center"
        title="Notifications"
        description="Review unread activity, historical alerts, and operational notices in a clean admin inbox."
        actionLabel={unreadCount > 0 ? 'Mark All Read' : undefined}
        actionIcon={CheckCircle}
        onAction={() => dispatch(markAllRead())}
        metrics={[
          { label: 'Total Notices', value: formatNumber(rows.length), detail: 'All notifications', icon: Bell, tone: 'magenta' },
          { label: 'Unread', value: formatNumber(unreadCount), detail: 'Needs attention', icon: Clock, tone: unreadCount > 0 ? 'rose' : 'emerald' },
          { label: 'History', value: formatNumber(rows.filter((row) => row.status === 'read').length), detail: 'Already reviewed', icon: CheckCircle, tone: 'emerald' },
        ]}
        rows={visibleRows}
        columns={[
          {
            key: 'message',
            title: 'Notification',
            render: (value, row) => (
              <div>
                <p className="max-w-xl truncate text-sm font-bold text-neutral-950">{truncateText(value, 120)}</p>
                <p className="mt-0.5 text-xs font-medium text-neutral-500">from @{row.sender}</p>
              </div>
            ),
          },
          { key: 'type', title: 'Type', render: (value) => <PremiumBadge tone="magenta">{value}</PremiumBadge> },
          { key: 'status', title: 'Status', render: (value) => <PremiumBadge tone={value === 'read' ? 'emerald' : 'rose'} dot>{value}</PremiumBadge> },
          { key: 'createdAt', title: 'Time', render: (value) => formatNotifTime(value) },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search notifications, sender, or type..."
        filters={[
          {
            label: 'View',
            value: tab,
            onChange: setTab,
            options: [
              { value: 'new', label: `New (${rows.filter((row) => row.status === 'unread').length})` },
              { value: 'history', label: `History (${rows.filter((row) => row.status === 'read').length})` },
            ],
          },
          { label: 'Status', value: 'all', onChange: () => {}, options: [{ value: 'all', label: 'All Types' }] },
        ]}
        actions={[
          {
            label: 'Mark read',
            icon: CheckCircle,
            onClick: (row) => {
              if (row.status === 'unread') dispatch(markOneRead(row.id));
            },
          },
          { label: 'Delete', icon: Trash2, tone: 'rose', onClick: (row) => dispatch(deleteNotification(row.id)) },
        ]}
        emptyMessage={status === 'loading' ? 'Loading notifications...' : 'No notifications found'}
        rowKey={(row) => row.id}
      />

    </div>
  );
};

export default Notifications;
