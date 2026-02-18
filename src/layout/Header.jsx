import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
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
import Button from '../components/Button.jsx';

const Header = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const dateOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  const notifications = [
    { id: 1, title: 'New post published', message: 'Content #12345 is live', time: '5 min ago', unread: true },
    { id: 2, title: 'User suspended', message: 'Account @spam_user has been suspended', time: '1 hour ago', unread: true },
    { id: 3, title: 'System update', message: 'Platform updated to v2.5.0', time: '3 hours ago', unread: false }
  ];

  return (
    <header 
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white border-b border-neutral-200 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-20' : 'left-64'
      )}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search anything..."
            icon={Search}
            className="w-full"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Date Filter */}
          <div className="hidden md:flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm text-neutral-600 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {dateOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-neutral-200" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-neutral-800">Notifications</h3>
                  <button className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={clsx(
                        'px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors border-b border-neutral-100 last:border-0',
                        notification.unread && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                          notification.unread ? 'bg-primary' : 'bg-neutral-300'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800">{notification.title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-neutral-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50">
                  <button className="text-sm text-primary hover:underline w-full text-center">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AD</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="font-semibold text-sm text-neutral-800">Admin User</p>
                  <p className="text-xs text-neutral-500">admin@instagram.com</p>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
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
