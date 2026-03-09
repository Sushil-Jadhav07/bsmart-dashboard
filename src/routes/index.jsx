import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layout/MainLayout.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Users from '../pages/Users.jsx';
import Posts from '../pages/Posts.jsx';
import Wallets from '../pages/Wallets.jsx';
import Settings from '../pages/Settings.jsx';
import ProtectedLayout from '../layout/ProtectedLayout.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import Logout from '../pages/Logout.jsx';
import PublicOnlyLayout from '../layout/PublicOnlyLayout.jsx';
import AdminCreate from '../pages/AdminCreate.jsx';
import Vendors from '../pages/Vendors.jsx';
import VendorDetails from '../pages/VendorDetails.jsx';
import PostDetails from '../pages/PostDetails.jsx';
import UserDetails from '../pages/UserDetails.jsx';
import Ads from '../pages/Ads.jsx';
import AdDetails from '../pages/AdDetails.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import AdminUsers from '../pages/AdminUsers.jsx';
import AdminPosts from '../pages/AdminPosts.jsx';
import AdminVendors from '../pages/AdminVendors.jsx';
import AdminProducts from '../pages/AdminProducts.jsx';
import AdminAds from '../pages/AdminAds.jsx';
import Notifications from '../pages/Notifications.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedLayout><MainLayout /></ProtectedLayout>,
    children: [
      {
        path: '/',
        element: <Dashboard />
      },
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/users',
        element: <Users />
      },
      {
        path: '/users/create-admin',
        element: <AdminCreate />
      },
      {
        path: '/users/:id',
        element: <UserDetails />
      },
      {
        path: '/posts',
        element: <Posts />
      },
      {
        path: '/posts/:id',
        element: <PostDetails />
      },
      {
        path: '/ads',
        element: <Ads />
      },
      {
        path: '/ads/:id',
        element: <AdDetails />
      },
      {
        path: '/vendors',
        element: <Vendors />
      },
      {
        path: '/vendors/:id',
        element: <VendorDetails />
      },
      {
        // reports removed
      },
      {
        path: '/wallets',
        element: <Wallets />
      },
      {
        path: '/settings',
        element: <Settings />
      }
      ,
      {
        path: '/admin/dashboard',
        element: <AdminDashboard />
      },
      {
        path: '/admin/users',
        element: <AdminUsers />
      },
      {
        path: '/admin/posts',
        element: <AdminPosts />
      },
      {
        path: '/admin/vendors',
        element: <AdminVendors />
      },
      {
        path: '/admin/products',
        element: <AdminProducts />
      },
      {
        path: '/admin/ads',
        element: <AdminAds />
      },
      {
        path: '/notifications',
        element: <Notifications />
      }
    ]
  },
  {
    path: '/login',
    element: <PublicOnlyLayout><Login /></PublicOnlyLayout>
  },
  {
    path: '/register',
    element: <PublicOnlyLayout><Register /></PublicOnlyLayout>
  },
  {
    path: '/logout',
    element: <Logout />
  }
]);

export default router;
