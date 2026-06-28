import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users as UsersIcon,
  UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { fetchUsers, deleteUserById } from '../store/usersSlice.js';
import Button from '../components/Button.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { roleOptions, statusOptions } from '../data/usersData.jsx';
import { capitalize, formatDate, formatNumber } from '../utils/helpers.jsx';

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y5RkFGQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTQ0RTYzIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VXNlcjwvdGV4dD48L3N2Zz4=';

const normalizeRole = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return 'member';
  if (key.includes('admin')) return 'admin';
  if (key.includes('vendor')) return 'vendor';
  return 'member';
};

const normalizeStatus = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return 'active';
  if (key.includes('suspend')) return 'suspended';
  if (key.includes('inactive') || key.includes('disabled') || key.includes('blocked')) return 'inactive';
  return 'active';
};

const isToday = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const Toast = ({ message, onClose, variant = 'success' }) => (
  <div
    className={clsx(
      'fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 shadow-soft',
      variant === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    )}
  >
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="text-xs font-semibold opacity-70 transition hover:opacity-100">
        Close
      </button>
    </div>
  </div>
);


const RoleBadge = ({ role }) => {
  const normalized = normalizeRole(role);
  return (
    <span
      className={clsx(
        'inline-flex min-w-[72px] justify-center rounded-md border px-2 py-1 text-xs font-medium capitalize',
        normalized === 'admin' && 'border-primary/15 bg-primary/10 text-primary',
        normalized === 'vendor' && 'border-rose-200 bg-rose-50 text-rose-700',
        normalized === 'member' && 'border-primary/10 bg-rose-50/80 text-primary'
      )}
    >
      {capitalize(normalized)}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const active = normalized === 'active';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize',
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-rose-500')} />
      {normalized}
    </span>
  );
};

const UserAvatar = ({ user }) => {
  const hasCustomAvatar = user.avatar && user.avatar !== AVATAR_PLACEHOLDER;
  return (
    <div className="relative h-10 w-10 shrink-0 rounded-full border border-neutral-200 bg-white p-0.5">
      {hasCustomAvatar ? (
        <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
          {avatarInitial(user.name)}
        </div>
      )}
      <span
        className={clsx(
          'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white',
          user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-400'
        )}
      />
    </div>
  );
};

const ActionMenu = ({ user, onView, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        aria-label={`Actions for ${user.name}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg border border-neutral-200 shadow-lg py-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(user); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-400" />
              View profile
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(user); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete user
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const SortHeader = ({ label, active, direction, onClick, align = 'left' }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 transition hover:text-primary',
      align === 'right' && 'justify-end'
    )}
  >
    {label}
    <ArrowUpDown className={clsx('h-3 w-3 transition', active ? 'text-primary' : 'text-neutral-300 group-hover:text-primary/70', active && direction === 'desc' && 'rotate-180')} />
  </button>
);

const Users = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((s) => s.users);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'joinedDate', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, user: null });
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', variant: 'success' });

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const users = useMemo(() => {
    return (items || []).map((u) => {
      const base = u && u.user ? u.user : u || {};
      const id = base._id || base.id || base.user_id || base.uuid || '';
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
      const role = normalizeRole(base.role || base.type || base.user_type || base.accountType);
      const rawStatus = base.status || (base.is_active === false || base.active === false ? 'suspended' : 'active');
      const userStatus = normalizeStatus(rawStatus);
      const coins =
        (base.wallet && typeof base.wallet.balance === 'number' ? base.wallet.balance : undefined) ||
        base.coins ||
        base.balance ||
        0;
      const joinedDate = base.createdAt || base.created_at || new Date().toISOString();
      return { id, name, email, avatar, role, status: userStatus, coins, joinedDate };
    });
  }, [items]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === 'active').length;
    const suspended = users.filter((user) => user.status === 'suspended' || user.status === 'inactive').length;
    const admins = users.filter((user) => user.role === 'admin').length;
    return {
      total: users.length,
      active,
      suspended,
      newToday: users.filter((user) => isToday(user.joinedDate)).length,
      admins,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
      const matchesRole = roleFilter === 'all' || user.role === normalizeRole(roleFilter);
      const matchesStatus = statusFilter === 'all' || user.status === normalizeStatus(statusFilter);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (sortConfig.key === 'joinedDate') {
        const comparison = new Date(aValue || 0) - new Date(bValue || 0);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      if (typeof aValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const comparison = String(aValue || '').localeCompare(String(bValue || ''));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredUsers, sortConfig]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const visibleUsers = sortedUsers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchTerm, statusFilter]);

  const setSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const requestDelete = (user) => setConfirmModal({ isOpen: true, type: 'delete', user });

  const handleConfirm = () => {
    const { type, user } = confirmModal;
    if (type !== 'delete' || !user?.id) {
      setConfirmModal({ isOpen: false, type: null, user: null });
      return;
    }

    setDeleting(true);
    dispatch(deleteUserById(user.id))
      .unwrap()
      .then(() => {
        setToast({ message: 'User deleted successfully', variant: 'success' });
        setTimeout(() => setToast({ message: '', variant: 'success' }), 2500);
        dispatch(fetchUsers());
      })
      .catch((err) => {
        const msg = typeof err === 'string' ? err : err?.message || 'Failed to delete user';
        setToast({ message: msg, variant: 'error' });
        setTimeout(() => setToast({ message: '', variant: 'success' }), 4000);
      })
      .finally(() => {
        setDeleting(false);
        setConfirmModal({ isOpen: false, type: null, user: null });
      });
  };

  const emptyMessage = error ? `Error: ${error}` : status === 'loading' ? 'Loading users...' : 'No users found';

  const statCards = [
    { label: 'Total Users', value: stats.total, icon: UsersIcon, color: 'text-primary bg-primary/10' },
    { label: 'Active Now', value: stats.active, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'text-rose-600 bg-rose-50' },
    { label: 'New Today', value: stats.newToday, icon: ShieldCheck, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">User Management</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Users</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage your user base, track account health, and control permissions.</p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            size="sm"
            className="flex-shrink-0"
            disabled={status === 'loading'}
            onClick={() => window.location.assign('/users/create-admin')}
          >
            {status === 'loading' ? 'Loading...' : 'Add New Admin'}
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{formatNumber(stat.value)}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div className="flex gap-2">
              <Dropdown value={roleFilter} onChange={(val) => setRoleFilter(val)} options={roleOptions} />
              <Dropdown value={statusFilter} onChange={(val) => setStatusFilter(val)} options={statusOptions} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5">
                    <SortHeader label="User Profile" active={sortConfig.key === 'name'} direction={sortConfig.direction} onClick={() => setSort('name')} />
                  </th>
                  <th className="px-4 py-2.5">
                    <SortHeader label="Role" active={sortConfig.key === 'role'} direction={sortConfig.direction} onClick={() => setSort('role')} />
                  </th>
                  <th className="px-4 py-2.5">
                    <SortHeader label="Status" active={sortConfig.key === 'status'} direction={sortConfig.direction} onClick={() => setSort('status')} />
                  </th>
                  {/* <th className="px-4 py-2.5">
                    <SortHeader label="Balance" active={sortConfig.key === 'coins'} direction={sortConfig.direction} onClick={() => setSort('coins')} />
                  </th> */}
                  <th className="px-4 py-2.5">
                    <SortHeader label="Joined" active={sortConfig.key === 'joinedDate'} direction={sortConfig.direction} onClick={() => setSort('joinedDate')} />
                  </th>
                  <th className="px-4 py-2.5 w-12 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleUsers.length > 0 ? (
                  visibleUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-primary transition-colors">
                              {user.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-neutral-400">{user.email || 'No email available'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      {/* <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-neutral-700">{formatNumber(user.coins)}</span>
                      </td> */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500">{formatDate(user.joinedDate)}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          user={user}
                          onView={(selectedUser) => navigate(`/users/${selectedUser.id}`)}
                          onDelete={requestDelete}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-16 text-center">
                      <Search className="w-5 h-5 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sortedUsers.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedUsers.length)} of {formatNumber(sortedUsers.length)}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, user: null })}
        onConfirm={handleConfirm}
        title="Delete User"
        description={`Are you sure you want to delete ${confirmModal.user?.name || 'this user'}? This action cannot be undone.`}
        confirmText="Delete Account"
        confirmVariant="danger"
        loading={deleting}
      />

      {!!toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: '', variant: 'success' })}
        />
      )}
    </>
  );
};

export default Users;