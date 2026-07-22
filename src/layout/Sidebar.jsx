import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Bell,
  TrendingUp,
  PackageCheck,
  MessagesSquare,
  Film,
  Sparkles,
  LogOut,
  LifeBuoy,
  Inbox,
  MessageSquare,
  HelpCircle,
  Scale,
  Gift,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import logoIcon from '../assets/bsmart_logo.png';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { path: '/posts', label: 'Moments', icon: Image },
      { path: '/reels', label: 'bSparks', icon: Film },
      { path: '/tweets', label: 'Buzz', icon: MessagesSquare },
      { path: '/promote', label: 'Boosts', icon: Sparkles },
      { path: '/ads', label: 'Spotlights', icon: Megaphone },
    ],
  },
  {
    label: 'Business',
    items: [
      { path: '/users', label: 'Users', icon: Users },
      { path: '/vendors', label: 'Vendors', icon: Briefcase },
      { path: '/vendor-packages', label: 'Packages', icon: PackageCheck },
      { path: '/sales', label: 'Sales', icon: TrendingUp },
      { path: '/wallets', label: 'Vault', icon: Wallet },
    ],
  },
  {
    label: 'Help & Ticket',
    items: [
      { path: '/inquiries', label: 'Inquiry', icon: Inbox },
      { path: '/customer-queries', label: 'Customer Queries', icon: MessageSquare },
      { path: '/faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
  {
    label: 'Promotions',
    items: [
      { path: '/gift-cards', label: 'Gift Cards', icon: Gift },
    ],
  },
  {
    label: 'Legal',
    items: [
      { path: '/policies', label: 'Legal Docs', icon: Scale },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useSelector((s) => s.notifications.unreadCount);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-white shadow-soft border border-neutral-200 text-neutral-700"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#0B0817]/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full z-50 flex w-[260px] flex-col',
          'bg-[#15101F] text-white',
          'border-r border-white/[0.06]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="h-[68px] flex items-center gap-3 flex-shrink-0 px-5 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-lg">
            <img src={logoIcon} alt="B-smart" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[17px] font-bold tracking-tight text-white">B-smart</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Admin CRM</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar-dark">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className={clsx(groupIdx > 0 && 'mt-5')}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  const isNotif = item.path === '/notifications';

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group',
                        isActive
                          ? 'bg-gradient-brand text-white shadow-[0_10px_24px_-8px_rgba(232,25,78,0.6)]'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/90" />
                      )}
                      <Icon className={clsx(
                        'w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200',
                        !isActive && 'group-hover:scale-110'
                      )} />
                      <span className="text-[13.5px] font-medium whitespace-nowrap flex-1">
                        {item.label}
                      </span>
                      {isNotif && unreadCount > 0 && (
                        <span className={clsx(
                          'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none',
                          isActive ? 'bg-white/25 text-white' : 'bg-primary text-white'
                        )}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Support card */}
        <div className="px-3 pb-3 flex-shrink-0">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.07] p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand">
                <LifeBuoy className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-white">Need help?</p>
                <p className="text-[11px] text-white/45">Support & live chat</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="mt-3 w-full rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-[12.5px] font-semibold py-2 transition-colors"
            >
              Open Support
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 flex-shrink-0 border-t border-white/[0.06] pt-3">
          <button
            onClick={() => navigate('/logout')}
            className="flex items-center w-full gap-3 rounded-xl px-3 py-2.5 text-white/55 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="text-[13.5px] font-medium">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
