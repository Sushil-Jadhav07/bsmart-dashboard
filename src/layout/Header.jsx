import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clsx } from 'clsx';
import {
  Bell,
  LogOut,
  User,
  Settings,
  X,
  Search,
  HelpCircle,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
  deleteNotification
} from '../store/notificationsSlice.js';
import { getNotificationIcon, getNotificationDotColor, formatNotifTime } from '../utils/notificationHelpers.js';

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items: notifications, unreadCount, status } = useSelector((s) => s.notifications);
  const authUser = useSelector((s) => s.auth.user);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const displayName =
    authUser?.full_name ||
    authUser?.name ||
    authUser?.username ||
    (authUser?.email ? authUser.email.split('@')[0] : 'Admin User');
  const displayEmail = authUser?.email || 'No email';
  const roleLabel = String(authUser?.role || 'admin').replace(/[_-]+/g, ' ');
  const avatarUrl = authUser?.avatar_url || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-[52px] bg-white border-b border-neutral-200/70 shadow-[0_1px_3px_rgba(16,24,40,0.04)] z-30">
      <div className="h-full flex items-center justify-between gap-4 pl-16 pr-4 lg:pl-5 lg:pr-6">

        {/* Search */}
        <div className="hidden md:block w-full max-w-[240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6E72A8]" strokeWidth={2.25} />
            <input
              type="text"
              placeholder="Search campaigns, creators, orders..."
              className="h-[30px] w-full rounded-md border border-[#E2E5F4] bg-[#EEF0FA] pl-8 pr-3 text-[12px] text-neutral-700 placeholder:text-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 ml-auto">

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                if (!showNotifications) dispatch(fetchNotifications());
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              aria-label="Notifications"
              className={clsx(
                'relative p-2 rounded-lg transition-colors duration-150',
                showNotifications
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
              )}
            >
              <Bell className="w-[17px] h-[17px]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-[5px] right-[6px] w-[7px] h-[7px] bg-primary rounded-full ring-[1.5px] ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl shadow-lift border border-neutral-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-neutral-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => dispatch(markAllRead())}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {status === 'loading' ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                      <Bell className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={clsx(
                          'flex items-start gap-3 px-4 py-3 border-b border-neutral-50 last:border-0 transition-colors group cursor-default',
                          !notif.isRead
                            ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                            : 'hover:bg-neutral-50'
                        )}
                      >
                        <span className="text-base mt-0.5 flex-shrink-0">
                          {getNotificationIcon(notif.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            'text-[13px] leading-snug',
                            !notif.isRead ? 'font-medium text-neutral-800' : 'text-neutral-600'
                          )}>
                            {notif.message}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-1">
                            {formatNotifTime(notif.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.isRead && (
                            <button
                              onClick={() => dispatch(markOneRead(notif._id))}
                              className="text-[11px] text-neutral-400 hover:text-primary font-medium transition-colors"
                            >
                              Read
                            </button>
                          )}
                          <button
                            onClick={() => dispatch(deleteNotification(notif._id))}
                            className="p-0.5 text-neutral-300 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {!notif.isRead && (
                          <span className={clsx('w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0', getNotificationDotColor(notif.type))} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-neutral-100 text-center">
                  <button
                    onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                    className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button
            onClick={() => navigate('/notifications')}
            aria-label="Help & support"
            title="Help & support"
            className="p-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150"
          >
            <HelpCircle className="w-[17px] h-[17px]" strokeWidth={2} />
          </button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-neutral-200 mx-2.5" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className={clsx(
                'flex items-center gap-2 py-1 pl-1 pr-2 rounded-lg transition-colors duration-150',
                showProfile ? 'bg-neutral-100' : 'hover:bg-neutral-100'
              )}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-[30px] h-[30px] rounded-full object-cover border border-neutral-200" />
              ) : (
                <div className="w-[30px] h-[30px] rounded-full bg-gradient-brand flex items-center justify-center">
                  <span className="text-white font-semibold text-[11px]">{initials}</span>
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-semibold text-neutral-900 leading-tight max-w-[140px] truncate">{displayName}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-neutral-500 leading-tight max-w-[140px] truncate">{roleLabel}</p>
              </div>
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lift border border-neutral-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-[13px] font-semibold text-neutral-800 truncate">{displayName}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{displayEmail}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { navigate('/settings?tab=profile'); setShowProfile(false); }}
                    className="w-full px-4 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    Profile
                  </button>
                  <button
                    onClick={() => { navigate('/settings?tab=general'); setShowProfile(false); }}
                    className="w-full px-4 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-neutral-400" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-neutral-100 py-1">
                  <button
                    onClick={() => navigate('/logout')}
                    className="w-full px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
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
