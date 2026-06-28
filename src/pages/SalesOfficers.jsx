import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, Mail, MapPin, Phone, Plus, TrendingUp, UserPlus, Users, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import { clearCreateError, createSalesOfficer, fetchSalesOfficers, fetchVendorsByOfficer } from '../store/salesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';

const Field = ({ label, ...props }) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
    <input
      {...props}
      className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
    />
  </div>
);

const CreateOfficerModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { createStatus, createError } = useSelector((state) => state.sales);
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '', location: '' });
  const [success, setSuccess] = useState(false);

  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const close = () => {
    dispatch(clearCreateError());
    setSuccess(false);
    setForm({ username: '', email: '', password: '', full_name: '', phone: '', location: '' });
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    const res = await dispatch(createSalesOfficer(form));
    if (res.meta.requestStatus === 'fulfilled') {
      setSuccess(true);
      setTimeout(close, 1200);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-neutral-950/35 backdrop-blur-sm" type="button" onClick={close} aria-label="Close modal" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">Add Sales Officer</h2>
              <p className="text-xs font-medium text-neutral-500">Create a new sales role account</p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-xl p-2 text-neutral-400 transition hover:bg-rose-50 hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Sales officer created
            </div>
          )}
          {createError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{createError}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="John Doe" />
            <Field label="Username" value={form.username} onChange={set('username')} placeholder="john_sales" required />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" required />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91..." />
            <Field label="Location" value={form.location} onChange={set('location')} placeholder="Mumbai" />
          </div>
          <button
            type="submit"
            disabled={createStatus === 'loading' || success}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-sm font-bold tracking-wide text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createStatus === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Sales Officer'}
          </button>
        </form>
      </div>
    </div>
  );
};

const SalesOfficers = () => {
  const dispatch = useDispatch();
  const { officers, officersStatus, officersError, vendorsByOfficer, vendorsByOfficerStatus } = useSelector((state) => state.sales);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (officersStatus === 'idle') dispatch(fetchSalesOfficers());
  }, [dispatch, officersStatus]);

  useEffect(() => {
    (officers || []).forEach((officer) => {
      const id = officer._id || officer.id;
      if (id && !vendorsByOfficer[id] && vendorsByOfficerStatus[id] !== 'loading') {
        dispatch(fetchVendorsByOfficer(id));
      }
    });
  }, [dispatch, officers, vendorsByOfficer, vendorsByOfficerStatus]);

  const rows = useMemo(() => (officers || []).map((officer) => {
    const id = officer._id || officer.id;
    const name = officer.full_name || officer.username || 'Sales Officer';
    const vendorTotal = vendorsByOfficer[id]?.total ?? vendorsByOfficer[id]?.vendors?.length ?? 0;
    return {
      id,
      name,
      username: officer.username || '-',
      email: officer.email || '-',
      phone: officer.phone || '-',
      location: officer.location || '-',
      vendors: Number(vendorTotal || 0),
      status: 'active',
    };
  }), [officers, vendorsByOfficer]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.name, row.username, row.email, row.phone, row.location].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [rows, searchTerm]);

  return (
    <>
      <PremiumResourcePage
        eyebrow="Sales Operations"
        title="Sales"
        description="Manage sales officers, contact details, and vendor assignment coverage from a refined admin surface."
        actionLabel="Add Sales Officer"
        actionIcon={Plus}
        onAction={() => setModalOpen(true)}
        metrics={[
          { label: 'Sales Officers', value: formatNumber(rows.length), detail: 'Team members', icon: Users, tone: 'magenta' },
          { label: 'Assigned Vendors', value: formatNumber(rows.reduce((sum, row) => sum + row.vendors, 0)), detail: 'Vendor coverage', icon: TrendingUp, tone: 'emerald' },
          { label: 'Active Officers', value: formatNumber(rows.length), detail: 'Available accounts', icon: CheckCircle, tone: 'magenta' },
        ]}
        rows={filteredRows}
        columns={[
          {
            key: 'name',
            title: 'Officer',
            render: (value, row) => (
              <div>
                <p className="text-sm font-bold text-neutral-950">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-neutral-500">@{row.username}</p>
              </div>
            ),
          },
          { key: 'email', title: 'Email', render: (value) => <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-neutral-400" />{value}</span> },
          { key: 'phone', title: 'Phone', render: (value) => <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-neutral-400" />{value}</span> },
          { key: 'location', title: 'Location', render: (value) => <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-neutral-400" />{value}</span> },
          { key: 'vendors', title: 'Vendors', render: (value) => <PremiumBadge tone="magenta">{formatNumber(value)}</PremiumBadge> },
          { key: 'status', title: 'Status', render: (value) => <PremiumBadge tone="emerald" dot>{value}</PremiumBadge> },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search officers by name, email, phone, or location..."
        filters={[
          { label: 'Team', value: 'all', onChange: () => {}, options: [{ value: 'all', label: 'All Officers' }] },
          { label: 'Status', value: 'active', onChange: () => {}, options: [{ value: 'active', label: 'Active' }] },
        ]}
        emptyMessage={officersStatus === 'loading' ? 'Loading sales officers...' : officersError ? `Error: ${officersError}` : 'No sales officers found'}
        rowKey={(row) => row.id}
      />
      <CreateOfficerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default SalesOfficers;
