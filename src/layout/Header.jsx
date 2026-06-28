import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clsx } from 'clsx';
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  X,
  Search,
  LifeBuoy,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
  deleteNotification
} from '../store/notificationsSlice.js';
import { getNotificationIcon, getNotificationDotColor, formatNotifTime } from '../utils/notificationHelpers.js';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/posts': 'Posts',
  '/reels': 'Reels',
  '/tweets': 'Tweets',
  '/promote': 'Promote',
  '/ads': 'Ads',
  '/vendors': 'Vendors',
  '/vendor-packages': 'Vendor Packages',
  '/sales': 'Sales',
  '/wallets': 'Wallets',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles).find((key) => pathname.startsWith(key + '/'));
  return match ? pageTitles[match] : 'Dashboard';
}

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-[68px] bg-white/85 backdrop-blur-xl border-b border-neutral-200/70 z-30">
      <div className="h-full flex items-center justify-between gap-4 pl-16 pr-4 lg:px-7">

        {/* Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-[17px] sm:text-lg font-bold tracking-tight text-neutral-900 truncate">{pageTitle}</h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 leading-tight truncate">B-smart admin console</p>
          </div>
        </div>

        {/* Center search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search the console…"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/80 pl-10 pr-14 text-sm text-neutral-700 placeholder:text-neutral-400 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">⌘K</kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">

          {/* Support */}
          <button
            onClick={() => navigate('/notifications')}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-neutral-600 hover:text-primary hover:bg-primary/[0.06] transition-colors"
          >
            <LifeBuoy className="w-[18px] h-[18px]" />
            <span className="hidden lg:inline">Support</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                if (!showNotifications) dispatch(fetchNotifications());
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className={clsx(
                'relative p-2.5 rounded-xl transition-all duration-200',
                showNotifications
                  ? 'bg-neutral-100 text-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
              )}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
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

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-neutral-200 mx-2" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className={clsx(
                'flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-all duration-200',
                showProfile ? 'bg-neutral-100' : 'hover:bg-neutral-100'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center ring-2 ring-white shadow-sm">
                <span className="text-white font-semibold text-xs">{initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-semibold text-neutral-800 leading-tight max-w-[140px] truncate">{displayName}</p>
                <p className="text-[11px] text-neutral-400 leading-tight max-w-[140px] truncate">{displayEmail}</p>
              </div>
              <ChevronDown className={clsx(
                'w-3.5 h-3.5 text-neutral-400 hidden md:block transition-transform duration-200',
                showProfile && 'rotate-180'
              )} />
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
