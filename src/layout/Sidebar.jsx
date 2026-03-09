import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Image,
  Megaphone,
  Briefcase,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Bell
} from 'lucide-react';
import { useSelector } from 'react-redux';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/posts', label: 'Posts', icon: Image },
  { path: '/ads', label: 'Ads', icon: Megaphone },
  { path: '/vendors', label: 'Vendors', icon: Briefcase },
  { path: '/wallets', label: 'Wallets', icon: Wallet },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings }
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const unreadCount = useSelector((s) => s.notifications.unreadCount);
  const authUser = useSelector((s) => s.auth.user);

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

  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const toggleCollapse = () => setCollapsed(!collapsed);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-soft border border-neutral-200"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          'fixed left-0 top-0 h-full bg-white border-r border-neutral-200 z-40 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'h-16 flex items-center border-b border-neutral-200',
          collapsed ? 'justify-center px-2' : 'px-6'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-neutral-800 whitespace-nowrap">
                B-smart
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive 
                    ? 'bg-gradient-brand text-white shadow-soft'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.label : ''}
              >
                <Icon className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  !isActive && 'group-hover:scale-110 transition-transform'
                )} />
                {!collapsed && (
                  <span className="font-medium whitespace-nowrap flex-1">{item.label}</span>
                )}
                {!collapsed && item.path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-primary text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-tight">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Button (Desktop only) */}
        <button
          onClick={toggleCollapse}
          className={clsx(
            'hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-neutral-200 shadow-soft items-center justify-center hover:border-primary hover:text-primary transition-colors',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Bottom Section */}
        <div className={clsx(
          'absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200',
          collapsed && 'px-2'
        )}>
          <div className={clsx(
            'flex items-center gap-3',
            collapsed && 'justify-center'
          )}>
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">{initials}</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-medium text-sm text-neutral-800 truncate">{displayName}</p>
                <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
