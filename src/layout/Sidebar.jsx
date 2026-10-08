import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutGrid,
  Sparkles,
  Zap,
  Megaphone,
  AtSign,
  Star,
  Users,
  Store,
  Archive,
  ChartColumn,
  Lock,
  ReceiptText,
  HelpCircle,
  MessagesSquare,
  NotebookPen,
  Gift,
  Ticket,
  Bug,
  Flag,
  Scale,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  LifeBuoy,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import logoIcon from '../assets/bsmart_logo.png';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    label: 'Content',
    items: [
      { path: '/posts', label: 'Moments', icon: Sparkles },
      { path: '/reels', label: 'bSparks', icon: Zap },
      { path: '/tweets', label: 'Buzz', icon: Megaphone },
      { path: '/promote', label: 'Campaigns', icon: AtSign },
      { path: '/ads', label: 'Spotlights', icon: Star },
    ],
  },
  {
    label: 'Business',
    items: [
      { path: '/users', label: 'Users', icon: Users },
      { path: '/vendors', label: 'Vendors', icon: Store },
      { path: '/vendor-packages', label: 'Packages', icon: Archive },
      { path: '/sales', label: 'Sales', icon: ChartColumn },
      { path: '/wallets', label: 'Vault', icon: Lock },
      { path: '/transactions', label: 'Transaction History', icon: ReceiptText },
    ],
  },
  {
    label: 'Help & Ticket',
    items: [
      { path: '/inquiries', label: 'Inquiry', icon: HelpCircle },
      { path: '/customer-queries', label: 'Customer Queries', icon: MessagesSquare },
      { path: '/faq', label: 'FAQ', icon: NotebookPen },
    ],
  },
  {
    label: 'Promotions',
    items: [
      { path: '/gift-cards', label: 'Gift Cards', icon: Gift },
      { path: '/gift-card-orders', label: 'Gift Card Orders', icon: Ticket },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/reports/bugs', label: 'Bug Reports', icon: Bug },
      { path: '/reports/content', label: 'Content Reports', icon: Flag },
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
          'border-r border-white/[0.04]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0 px-4 pt-4 pb-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-[0_4px_14px_-4px_rgba(232,25,78,0.6)]">
            <img src={logoIcon} alt="B-smart" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[16px] font-bold tracking-tight text-white">B-smart</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">Admin CRM</p>
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
        <nav className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar-dark">
          {navGroups.map((group) => (
            <div key={group.label} className="mt-3.5">
              <p className="px-1 mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/35">
                {group.label}
              </p>
              <div className="space-y-px">
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
                        'flex items-center gap-2.5 rounded-lg px-3 py-[6px] transition-colors duration-150',
                        isActive
                          ? 'bg-gradient-to-r from-[#E8194E] to-[#833AB4] text-white shadow-[-4px_0_18px_-2px_rgba(232,25,78,0.7)]'
                          : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                      <span className={clsx('text-[13px] whitespace-nowrap flex-1', isActive ? 'font-semibold' : 'font-medium')}>
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
          <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.07] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-brand">
                <LifeBuoy className="w-4 h-4 text-white" strokeWidth={1.75} />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-white">Need help?</p>
                <p className="text-[11px] text-white/45">Support & live chat</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="mt-3 w-full rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-[12.5px] font-semibold py-1.5 transition-colors"
            >
              Open Support
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-3 flex-shrink-0 border-t border-white/[0.06] pt-2">
          <button
            onClick={() => navigate('/logout')}
            className="flex items-center w-full gap-2.5 rounded-lg px-3 py-[6px] text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            <span className="text-[13px] font-medium">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
