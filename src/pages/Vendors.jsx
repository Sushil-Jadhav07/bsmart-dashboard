import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, Eye, ShieldAlert, Trash2, UserCheck } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteVendorById, fetchVendors, processVendorProfile, setVendorValidatedOptimistic } from '../store/vendorsSlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import { capitalize, formatNumber } from '../utils/helpers.jsx';

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 shadow-soft">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="text-xs font-semibold opacity-70 transition hover:opacity-100">Close</button>
    </div>
  </div>
);

const resolveProfileByVendorId = (profileMap, vendor) => {
  if (!vendor) return null;
  const vendorId = vendor._id;
  const userId = vendor?.user?._id || vendor?.user?.id;
  return profileMap[vendorId] || (userId ? profileMap[userId] : null) || null;
};

const isProfileComplete = (profile) => !!profile && ['company_name', 'business_email', 'business_phone', 'address', 'country'].every((key) => {
  const value = profile?.[key];
  return value !== null && value !== undefined && String(value).trim() !== '';
});

const Vendors = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, profilesByVendorId, status, error, updating } = useSelector((state) => state.vendors);
  const { items: allUsers = [], status: usersStatus } = useSelector((state) => state.users);
  const authUser = useSelector((state) => state.auth.user);
  const adminId = authUser?.id || authUser?._id || authUser?.uuid || authUser?.user_id || null;
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, vendor: null });

  useEffect(() => {
    dispatch(fetchVendors());
    if (usersStatus === 'idle') dispatch(fetchUsers());
  }, [dispatch, usersStatus]);

  const usersMap = useMemo(() => {
    const map = new Map();
    (allUsers || []).forEach((u) => {
      const base = u && u.user ? u.user : u || {};
      const id = base._id || base.id || base.user_id || base.uuid || '';
      if (id) {
        map.set(id, {
          username: base.username || '',
          fullName: base.full_name || base.fullName || base.name || '',
          phone: base.phone || '',
          role: base.role || '',
        });
      }
    });
    return map;
  }, [allUsers]);

  const rows = useMemo(() => {
    return (items || []).map((vendor) => {
      const user = vendor.user || {};
      const profile = resolveProfileByVendorId(profilesByVendorId || {}, vendor);
      const complete = isProfileComplete(profile);
      const vendorId = vendor._id;
      const userId = user._id || user.id || null;
      const enriched = usersMap.get(userId) || {};
      return {
        id: userId || vendorId,
        vendorId,
        business: vendor.business_name || profile?.company_name || 'Vendor',
        username: enriched.username || user.username || 'unknown',
        fullName: enriched.fullName || user.full_name || user.name || '-',
        phone: enriched.phone || user.phone || profile?.business_phone || '-',
        role: enriched.role || user.role || 'vendor',
        validated: !!vendor.validated,
        profile: complete ? 'complete' : 'incomplete',
      };
    });
  }, [items, profilesByVendorId, usersMap]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.business, row.username, row.fullName, row.phone, row.role].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'validated' ? row.validated : !row.validated);
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const handleToggle = async (row) => {
    if (row.profile !== 'complete' && !row.validated) {
      setToast('Cannot validate: vendor profile is incomplete');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    const nextAction = row.validated ? 'reject' : 'approve';
    dispatch(setVendorValidatedOptimistic({ id: row.vendorId, validated: !row.validated }));
    try {
      await dispatch(processVendorProfile({ id: row.id, action: nextAction, rejection_reason: nextAction === 'reject' ? 'Admin unvalidated' : undefined })).unwrap();
      setToast(row.validated ? 'Vendor unvalidated' : 'Vendor validated');
      setTimeout(() => setToast(''), 2500);
    } catch {
      dispatch(setVendorValidatedOptimistic({ id: row.vendorId, validated: row.validated }));
    }
  };

  return (
    <>
      <PremiumResourcePage
        eyebrow="Vendor Operations"
        title="Vendors"
        description="Validate vendor readiness, inspect profiles, and manage vendor access from a premium review queue."
        metrics={[
          { label: 'Total Vendors', value: formatNumber(rows.length), detail: 'Vendor accounts', icon: Briefcase, tone: 'magenta' },
          { label: 'Validated', value: formatNumber(rows.filter((row) => row.validated).length), detail: 'Approved vendors', icon: CheckCircle2, tone: 'emerald' },
          { label: 'Pending', value: formatNumber(rows.filter((row) => !row.validated).length), detail: 'Awaiting validation', icon: ShieldAlert, tone: 'rose' },
          { label: 'Complete Profiles', value: formatNumber(rows.filter((row) => row.profile === 'complete').length), detail: 'Ready for review', icon: UserCheck, tone: 'magenta' },
        ]}
        rows={filteredRows}
        columns={[
          {
            key: 'business',
            title: 'Business',
            render: (value, row) => (
              <button
                type="button"
                onClick={() => navigate(`/vendors/${row.id}`)}
                className="min-w-0 text-left group/cell block w-full"
              >
                <p className="truncate text-sm font-bold text-neutral-950 group-hover/cell:text-primary transition-colors">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-neutral-500">@{row.username}</p>
              </button>
            ),
          },
          { key: 'fullName', title: 'Owner' },
          { key: 'phone', title: 'Phone' },
          { key: 'role', title: 'Role', render: (value) => <PremiumBadge tone="magenta">{capitalize(value)}</PremiumBadge> },
          { key: 'profile', title: 'Profile', render: (value) => <PremiumBadge tone={value === 'complete' ? 'emerald' : 'rose'} dot>{value}</PremiumBadge> },
          { key: 'validated', title: 'Status', render: (value) => <PremiumBadge tone={value ? 'emerald' : 'rose'} dot>{value ? 'Validated' : 'Not Validated'}</PremiumBadge> },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search vendors, owners, phone, or role..."
        filters={[
          {
            label: 'Validation',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Vendors' },
              { value: 'validated', label: 'Validated' },
              { value: 'invalidated', label: 'Not Validated' },
            ],
          },
          {
            label: 'Profile',
            value: 'all',
            onChange: () => {},
            options: [{ value: 'all', label: 'All Profiles' }],
          },
        ]}
        actions={[
          { label: 'View details', icon: Eye, onClick: (row) => navigate(`/vendors/${row.id}`) },
          {
            label: 'Toggle validation',
            icon: CheckCircle2,
            onClick: (row) => {
              if (!adminId || !isAdmin || updating[row.vendorId] || status === 'loading') return;
              handleToggle(row);
            },
          },
          { label: 'Delete', icon: Trash2, tone: 'rose', onClick: (row) => setConfirmModal({ isOpen: true, vendor: row }) },
        ]}
        emptyMessage={status === 'loading' ? 'Loading vendors...' : error ? `Error: ${error}` : 'No vendors found'}
        rowKey={(row) => row.vendorId}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, vendor: null })}
        onConfirm={() => {
          if (!confirmModal.vendor) return;
          dispatch(deleteVendorById(confirmModal.vendor.vendorId || confirmModal.vendor.id)).finally(() => setConfirmModal({ isOpen: false, vendor: null }));
        }}
        title="Delete Vendor"
        description={`Are you sure you want to delete ${confirmModal.vendor?.business || 'this vendor'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Vendors;
