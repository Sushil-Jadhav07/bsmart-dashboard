import React, { useEffect, useState } from 'react';
import { Eye, Trash2, Users as UsersIcon, Search, Plus, Filter, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, deleteUserById } from '../store/usersSlice.js';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { roleOptions, statusOptions } from '../data/usersData.jsx';
import { formatNumber, formatDate, getStatusColor, getRoleColor, capitalize } from '../utils/helpers.jsx';
import { clsx } from 'clsx';

function StatCard({ label, value, trend, trendUp, icon: Icon, color = 'blue' }) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-3 rounded-xl', colorStyles[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full', 
            trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          )}>
            {trendUp ? '+' : ''}{trend}%
            <ArrowUpRight className={clsx('w-3 h-3', !trendUp && 'rotate-90')} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

const Users = () => {
  const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VXNlcjwvdGV4dD48L3N2Zz4='
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((s) => s.users);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, user: null });

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    const mapped = (items || []).map((u) => {
      const base = u && u.user ? u.user : u || {};
      const id = base.id || base._id || base.uuid || '';
      const name =
        base.full_name ||
        base.fullName ||
        (base.first_name && base.last_name ? `${base.first_name} ${base.last_name}` : undefined) ||
        base.name ||
        base.username ||
        base.email ||
        'Unknown';
      const email = base.email || '';
      const avatar = base.avatar_url || base.avatar || base.image || base.photo || AVATAR_PLACEHOLDER;
      const role = base.role || base.type || 'member';
      const status = base.status || (base.active === false ? 'suspended' : 'active');
      const coins =
        (base.wallet && typeof base.wallet.balance === 'number' ? base.wallet.balance : undefined) ||
        base.coins ||
        base.balance ||
        0;
      const joinedDate = base.createdAt || base.created_at || new Date().toISOString();
      return { id, name, email, avatar, role, status, coins, joinedDate };
    });
    setUsers(mapped);
  }, [items]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAction = (type, user) => {
    setConfirmModal({ isOpen: true, type, user });
  };

  const handleConfirm = () => {
    const { type, user } = confirmModal;
    
    if (type === 'delete') {
      dispatch(deleteUserById(user.id))
        .unwrap()
        .then(() => {
          // Success, redux state will update automatically
        })
        .catch((err) => {
          console.error('Failed to delete user:', err);
        });
    }
    
    setConfirmModal({ isOpen: false, type: null, user: null });
  };

  const columns = [
    {
      key: 'name',
      title: 'User Profile',
      render: (value, row) => (
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={row.avatar} 
              alt={value}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <span className={clsx(
              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
              row.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-300'
            )} />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      className: 'hidden sm:table-cell',
      render: (value) => (
        <span className={clsx(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize',
          getRoleColor(value).replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-')
        )}>
          {capitalize(value)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <div className="flex items-center gap-1.5">
           <span className={clsx(
              'w-1.5 h-1.5 rounded-full',
              value === 'active' ? 'bg-emerald-500' : 'bg-red-500'
            )} />
           <span className="text-sm text-neutral-600 capitalize">{value}</span>
        </div>
      )
    },
    {
      key: 'coins',
      title: 'Balance',
      className: 'hidden md:table-cell',
      render: (value) => (
        <span className="font-mono text-sm font-medium text-neutral-600">{formatNumber(value)}</span>
      )
    },
    {
      key: 'joinedDate',
      title: 'Joined',
      className: 'hidden lg:table-cell',
      render: (value) => <span className="text-sm text-neutral-500">{formatDate(value)}</span>
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/users/${row.id}`)}
            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleAction('delete', row)}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete User"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const getConfirmMessage = () => {
    const { type, user } = confirmModal;
    if (type === 'delete') {
      return `Are you sure you want to delete ${user?.name}? This action cannot be undone.`;
    }
    return '';
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Users</h1>
          <p className="text-neutral-500 mt-2 text-sm max-w-md leading-relaxed">
            Manage your user base, track growth, and handle permissions efficiently from a single dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
            
            <Button
                variant="primary"
                icon={Plus}
                className="shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
                disabled={status === 'loading'}
                onClick={() => window.location.assign('/users/create-admin')}
            >
            {status === 'loading' ? 'Loading…' : 'Add New Admin'}
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
            label="Total Users" 
            value={formatNumber(users.length)} 
            trend="12" 
            trendUp={true} 
            icon={UsersIcon}
            color="blue"
        />
        <StatCard 
            label="Active Now" 
            value={formatNumber(users.filter(u => u.status === 'active').length)} 
            trend="4" 
            trendUp={true} 
            icon={Eye}
            color="green"
        />
         <StatCard 
            label="Suspended" 
            value={formatNumber(users.filter(u => u.status === 'suspended').length)} 
            trend="0" 
            trendUp={true} 
            icon={Trash2}
            color="rose"
        />
         <StatCard 
            label="New Today" 
            value="12" 
            trend="8" 
            trendUp={true} 
            icon={ArrowUpRight}
            color="violet"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
             <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-neutral-400"
                />
             </div>
             <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    options={roleOptions}
                    className="w-36 flex-shrink-0"
                />
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={statusOptions}
                    className="w-36 flex-shrink-0"
                />
             </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
            <Table
                columns={columns}
                data={filteredUsers}
                searchable={false}
                pagination={true}
                pageSize={10}
                emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading users…' : 'No users found')}
                className="min-w-full"
            />
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, user: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? 'Delete User' : 'Confirm Action'}
        description={getConfirmMessage()}
        confirmText={confirmModal.type === 'delete' ? 'Delete Account' : 'Confirm'}
        confirmVariant={confirmModal.type === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default Users;
