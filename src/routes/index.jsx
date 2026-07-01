import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Users from '../pages/Users.jsx';
import Posts from '../pages/Posts.jsx';
import Reels from '../pages/Reels.jsx';
import Tweets from '../pages/Tweets.jsx';
import TweetDetails from '../pages/TweetDetails.jsx';
import Prompts from '../pages/Prompts.jsx';
import PromoteDetails from '../pages/PromoteDetails.jsx';
import Wallets from '../pages/Wallets.jsx';
import WalletDetails from '../pages/WalletDetails.jsx';
import Settings from '../pages/Settings.jsx';
import ProtectedLayout from '../layout/ProtectedLayout.jsx';
import Login from '../pages/Login.jsx';
import Logout from '../pages/Logout.jsx';
import PublicOnlyLayout from '../layout/PublicOnlyLayout.jsx';
import AdminCreate from '../pages/AdminCreate.jsx';
import Vendors from '../pages/Vendors.jsx';
import VendorDetails from '../pages/VendorDetails.jsx';
import PostDetails from '../pages/PostDetails.jsx';
import ReelDetails from '../pages/ReelDetails.jsx';
import UserDetails from '../pages/UserDetails.jsx';
import Ads from '../pages/Ads.jsx';
import AdDetails from '../pages/AdDetails.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import AdminUsers from '../pages/AdminUsers.jsx';
import AdminPosts from '../pages/AdminPosts.jsx';
import AdminVendors from '../pages/AdminVendors.jsx';
import AdminAds from '../pages/AdminAds.jsx';
import Notifications from '../pages/Notifications.jsx';
import SalesOfficers from '../pages/SalesOfficers.jsx';
import VendorPackages from '../pages/VendorPackages.jsx';
import Inquiries from '../pages/Inquiries.jsx';
import CustomerQueries from '../pages/CustomerQueries.jsx';
import CustomerQueriesDetails from '../pages/CustomerQueriesDetails.jsx';
import FAQ from '../pages/FAQ.jsx';


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
        element: <Posts forcedType="post" title="Posts" />
      },
      {
        path: '/posts/:id',
        element: <PostDetails />
      },
      {
        path: '/reels',
        element: <Reels />
      },
      {
        path: '/reels/:id',
        element: <ReelDetails />
      },
      {
        path: '/tweets',
        element: <Tweets />
      },
      {
        path: '/tweets/:id',
        element: <TweetDetails />
      },
      {
        path: '/promote',
        element: <Prompts />
      },
      {
        path: '/promote/:id',
        element: <PromoteDetails />
      },
      {
        path: '/prompts',
        element: <Prompts />
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
        path: '/wallets/:id',
        element: <WalletDetails />
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
        element: <Navigate to="/admin/dashboard" replace />
      },
      {
        path: '/admin/ads',
        element: <AdminAds />
      },
      {
        path: '/notifications',
        element: <Notifications />
      },
      {
        path: '/sales',
        element: <SalesOfficers />
      },
      {
        path: '/vendor-packages',
        element: <VendorPackages />
      },
      {
        path: '/inquiries',
        element: <Inquiries />
      },
      {
        path: '/customer-queries',
        element: <CustomerQueries />
      },
      {
        path: '/customer-queries/:id',
        element: <CustomerQueriesDetails />
      },
      {
        path: '/faq',
        element: <FAQ />
      },
    ]
  },
  {
    path: '/login',
    element: <PublicOnlyLayout><Login /></PublicOnlyLayout>
  },
  {
    path: '/logout',
    element: <Logout />
  }
]);

export default router;