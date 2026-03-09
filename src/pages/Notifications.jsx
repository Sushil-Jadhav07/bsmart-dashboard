import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bell } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
  deleteNotification
} from '../store/notificationsSlice.js'
import {
  getNotificationIcon,
  getNotificationDotColor,
  formatNotifTime
} from '../utils/notificationHelpers.js'
import Card from '../components/Card.jsx'

const Notifications = () => {
  const dispatch = useDispatch()
  const { items, unreadCount, status } = useSelector((s) => s.notifications)
  const [activeTab, setActiveTab] = useState('new')

  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  const unread = items.filter((n) => !n.isRead)
  const read = items.filter((n) => n.isRead)
  const visibleItems = activeTab === 'history' ? read : unread

  const NotifRow = ({ notif }) => (
    <div
      className={clsx(
        'flex items-start gap-4 p-4 rounded-xl border transition-all group',
        !notif.isRead
          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
          : 'bg-white border-neutral-100 hover:bg-neutral-50'
      )}
    >
      <span className="text-2xl flex-shrink-0 mt-0.5">
        {getNotificationIcon(notif.type)}
      </span>
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-sm',
          !notif.isRead ? 'font-semibold text-neutral-900' : 'text-neutral-700'
        )}>
          {notif.message}
        </p>
        {notif.sender && (
          <p className="text-xs text-neutral-400 mt-0.5">
            from @{notif.sender.username}
          </p>
        )}
        <p className="text-xs text-neutral-400 mt-1">
          {formatNotifTime(notif.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!notif.isRead && (
          <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', getNotificationDotColor(notif.type))} />
        )}
        {!notif.isRead && (
          <button
            onClick={() => dispatch(markOneRead(notif._id))}
            className="opacity-0 group-hover:opacity-100 text-xs text-neutral-500 hover:text-primary border border-neutral-200 rounded px-2 py-1 transition-all"
          >
            Mark read
          </button>
        )}
        <button
          onClick={() => dispatch(deleteNotification(notif._id))}
          className="opacity-0 group-hover:opacity-100 text-xs text-neutral-400 hover:text-red-500 border border-neutral-200 rounded px-2 py-1 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-8xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => dispatch(markAllRead())}
            className="px-4 py-2 text-sm bg-gradient-brand text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-soft"
          >
            Mark all as read
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-4 inline-flex rounded-xl border border-neutral-200 bg-white p-1">
          <button
            onClick={() => setActiveTab('new')}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-lg transition-colors',
              activeTab === 'new' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
            )}
          >
            New ({unread.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-lg transition-colors',
              activeTab === 'history' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'
            )}
          >
            History ({read.length})
          </button>
        </div>
      )}

      {status === 'loading' ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        </Card>
      ) : visibleItems.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <p className="text-sm">
              {activeTab === 'history' ? 'No history notifications' : 'No new notifications'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((n) => (
            <NotifRow key={n._id} notif={n} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
