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
        path: '/posts',
        element: <Posts />
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
