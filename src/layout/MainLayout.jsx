import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { connectSocket, disconnectSocket, fetchNotifications, fetchUnreadCount } from '../store/notificationsSlice.js';

const MainLayout = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    const userId = user?._id || user?.id
    if (!token) {
      disconnectSocket()
      return
    }
    if (!userId) {
      console.warn('[Socket] No userId found in auth state', user)
      disconnectSocket()
      return
    }
    connectSocket(String(userId), dispatch)
    dispatch(fetchNotifications())
    dispatch(fetchUnreadCount())
    return () => {
      disconnectSocket()
    }
  }, [dispatch, token, user]);

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Sidebar />
      <Header />

      <main className="pt-[68px] min-h-screen lg:pl-[260px] transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-7 max-w-[1640px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
