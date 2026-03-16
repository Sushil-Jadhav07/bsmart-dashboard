import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search,
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  User,
  Settings
} from 'lucide-react';
import Input from '../components/Input.jsx';
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
  deleteNotification
} from '../store/notificationsSlice.js';
import { getNotificationIcon, getNotificationDotColor, formatNotifTime } from '../utils/notificationHelpers.js';

const Header = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items: notifications, unreadCount, status } = useSelector((s) => s.notifications);
  const authUser = useSelector((s) => s.auth.user);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const displayName =
    authUser?.full_name ||
    authUser?.name ||
    authUser?.username ||
    (authUser?.email ? authUser.email.split('@')[0] : 'Admin User');
  const displayEmail = authUser?.email || 'No email';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  const dateOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white border-b border-neutral-200 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-20' : 'left-64'
      )}
    >
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search anything..."
            icon={Search}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm text-neutral-600 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:block w-px h-6 bg-neutral-200" />

          <div className="relative">
            <button
              onClick={() => {
                if (!showNotifications) dispatch(fetchNotifications());
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                  <h3 className="font-semibold text-sm text-neutral-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => dispatch(markAllRead())}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {status === 'loading' ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                      <Bell className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={clsx(
                          'flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors group',
                          !notif.isRead && 'bg-primary/5'
                        )}
                      >
                        <span className="text-lg mt-0.5 flex-shrink-0">
                          {getNotificationIcon(notif.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            'text-sm leading-snug',
                            !notif.isRead ? 'font-medium text-neutral-800' : 'text-neutral-600'
                          )}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {formatNotifTime(notif.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {!notif.isRead && (
                            <span className={clsx('w-2 h-2 rounded-full', getNotificationDotColor(notif.type))} />
                          )}
                          {!notif.isRead && (
                            <button
                              onClick={() => dispatch(markOneRead(notif._id))}
                              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-primary text-xs transition-all"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dispatch(deleteNotification(notif._id))}
                            className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-400 text-xs transition-all"
                          >
                            x
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 text-center">
                  <button
                    onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                    className="text-sm text-primary hover:underline w-full text-center font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{initials}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="font-semibold text-sm text-neutral-800">{displayName}</p>
                  <p className="text-xs text-neutral-500">{displayEmail}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/settings?tab=profile');
                      setShowProfile(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings?tab=general');
                      setShowProfile(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-neutral-100 py-1">
                  <button
                    onClick={() => navigate('/logout')}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
