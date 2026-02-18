import React, { useEffect, useState } from 'react';
import { Eye, Ban, Trash2, Users as UsersIcon, Search } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { roleOptions, statusOptions } from '../data/usersData.jsx';
import { formatNumber, formatDate, getStatusColor, getRoleColor, capitalize } from '../utils/helpers.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../store/usersSlice.js';

const Users = () => {
  const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VXNlcjwvdGV4dD48L3N2Zz4='
  const dispatch = useDispatch();
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
      setUsers(users.filter(u => u.id !== user.id));
    } else if (type === 'suspend') {
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
          : u
      ));
    }
    
    setConfirmModal({ isOpen: false, type: null, user: null });
  };

  const columns = [
    {
      key: 'name',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img 
            src={row.avatar} 
            alt={value}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-neutral-800">{value}</p>
            <p className="text-xs text-neutral-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (value) => (
        <Badge variant="default" className={getRoleColor(value)}>
          {capitalize(value)}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <Badge variant="default" className={getStatusColor(value)}>
          {capitalize(value)}
        </Badge>
      )
    },
    {
      key: 'coins',
      title: 'Coins',
      render: (value) => (
        <span className="font-medium text-neutral-800">{formatNumber(value)}</span>
      )
    },
    {
      key: 'joinedDate',
      title: 'Joined',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Eye}
            onClick={() => handleAction('view', row)}
          >
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Ban}
            onClick={() => handleAction('suspend', row)}
          >
            {row.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Trash2}
            onClick={() => handleAction('delete', row)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const getConfirmMessage = () => {
    const { type, user } = confirmModal;
    if (type === 'delete') {
      return `Are you sure you want to delete ${user?.name}? This action cannot be undone.`;
    }
    if (type === 'suspend') {
      const action = user?.status === 'suspended' ? 'unsuspend' : 'suspend';
      return `Are you sure you want to ${action} ${user?.name}?`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Users</h1>
          <p className="text-neutral-500 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button
          variant="primary"
          icon={UsersIcon}
          disabled={status === 'loading'}
          onClick={() => window.location.assign('/users/create-admin')}
        >
          {status === 'loading' ? 'Loading…' : 'Add Admin'}
        </Button>
      </div>

      {/* Filters */}
      <Card padding="small">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              fullWidth
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="small">
          <p className="text-sm text-neutral-500">Total Users</p>
          <p className="text-2xl font-bold text-neutral-800 mt-1">{users.length}</p>
        </Card>
        <Card padding="small">
          <p className="text-sm text-neutral-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {users.filter(u => u.status === 'active').length}
          </p>
        </Card>
        <Card padding="small">
          <p className="text-sm text-neutral-500">Suspended</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {users.filter(u => u.status === 'suspended').length}
          </p>
        </Card>
        <Card padding="small">
          <p className="text-sm text-neutral-500">New Today</p>
          <p className="text-2xl font-bold text-primary mt-1">12</p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredUsers}
          searchable={false}
          pagination={true}
          pageSize={10}
          emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading users…' : 'No users found')}
        />
      </Card>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, user: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? 'Delete User' : 'Suspend User'}
        description={getConfirmMessage()}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmVariant={confirmModal.type === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default Users;
