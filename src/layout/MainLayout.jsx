import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { connectSocket } from '../store/notificationsSlice.js';
import { fetchNotifications } from '../store/notificationsSlice.js';

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    if (user) {
      const userId = user.id || user._id;
      if (userId) {
        connectSocket(String(userId), dispatch);
      }
      dispatch(fetchNotifications());
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main 
        className={clsx(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-2 md:pl-20' : 'p-2 md:pl-64'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
