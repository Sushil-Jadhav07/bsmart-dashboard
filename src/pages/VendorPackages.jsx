import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Package, Plus, Receipt, Sparkles, Trash2, Wallet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import PremiumResourcePage, { PremiumBadge } from '../components/PremiumResourcePage.jsx';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { adminCreatePackage, adminDeactivatePackage, adminFetchAllPurchases, adminUpdatePackage, fetchAllPackages, resetMutation } from '../store/vendorPackagesSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';

const EMPTY_FORM = {
  name: '',
  tier: 'basic',
  ads_allowed_min: 1,
  ads_allowed_max: 5,
  base_price: '',
  discount_percent: 0,
  final_price: '',
  coins_granted: '',
  validity_days: 30,
  description: '',
  features: '',
};

const fmtINR = (value) => value != null && value !== '' ? `₹${Number(value).toLocaleString('en-IN')}` : '-';

const PackageForm = ({ open, initial, onClose }) => {
  const dispatch = useDispatch();
  const { mutationStatus, mutationError } = useSelector((state) => state.vendorPackages);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setForm(initial ? {
      ...EMPTY_FORM,
      ...initial,
      features: Array.isArray(initial.features) ? initial.features.join('\n') : initial.features || '',
    } : EMPTY_FORM);
  }, [initial, open]);

  if (!open) return null;

  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      ads_allowed_min: Number(form.ads_allowed_min),
      ads_allowed_max: Number(form.ads_allowed_max),
      base_price: Number(form.base_price),
      discount_percent: Number(form.discount_percent || 0),
      final_price: Number(form.final_price || form.base_price),
      coins_granted: Number(form.coins_granted),
      validity_days: Number(form.validity_days),
      features: String(form.features || '').split('\n').map((item) => item.trim()).filter(Boolean),
    };
    if (initial?._id || initial?.id) {
      await dispatch(adminUpdatePackage({ packageId: initial._id || initial.id, payload }));
    } else {
      await dispatch(adminCreatePackage(payload));
    }
    dispatch(fetchAllPackages());
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? 'Edit Vendor Package' : 'Create Vendor Package'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {mutationError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{mutationError}</div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ['name', 'Package Name'],
            ['tier', 'Tier'],
            ['ads_allowed_min', 'Min Ads'],
            ['ads_allowed_max', 'Max Ads'],
            ['base_price', 'Base Price'],
            ['discount_percent', 'Discount %'],
            ['final_price', 'Final Price'],
            ['coins_granted', 'Coins Granted'],
            ['validity_days', 'Validity Days'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
              {key === 'tier' ? (
                <Dropdown
                  value={form[key]}
                  onChange={(val) => setForm((v) => ({ ...v, [key]: val }))}
                  options={['basic', 'standard', 'premium', 'enterprise'].map((tier) => ({ value: tier, label: tier }))}
                  size="lg"
                  fullWidth
                />
              ) : (
                <input value={form[key]} onChange={set(key)} type={key === 'name' ? 'text' : 'number'} required={['name', 'base_price', 'coins_granted'].includes(key)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
              )}
            </div>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={3} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Features</label>
          <textarea value={form.features} onChange={set('features')} rows={4} placeholder="One feature per line" className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={mutationStatus === 'loading'}>{initial ? 'Update Package' : 'Create Package'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const VendorPackages = () => {
  const dispatch = useDispatch();
  const { packages, packagesStatus, packagesError, adminPurchases, adminPurchasesTotal } = useSelector((state) => state.vendorPackages);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAllPackages());
    dispatch(adminFetchAllPurchases({ limit: 100 }));
  }, [dispatch]);

  const rows = useMemo(() => (packages || []).map((pkg) => ({
    id: pkg._id || pkg.id,
    name: pkg.name || 'Package',
    tier: pkg.tier || 'basic',
    ads: `${pkg.ads_allowed_min ?? 0}-${pkg.ads_allowed_max ?? 0}`,
    price: Number(pkg.final_price ?? pkg.base_price ?? 0),
    coins: Number(pkg.coins_granted ?? 0),
    validity: Number(pkg.validity_days ?? 0),
    status: pkg.is_active === false ? 'inactive' : 'active',
    createdAt: pkg.createdAt || pkg.created_at,
    raw: pkg,
  })), [packages]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.name, row.tier, row.ads].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesTier = tierFilter === 'all' || row.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter, tierFilter]);

  const purchases = adminPurchases || [];
  const revenue = purchases.reduce((sum, purchase) => sum + Number(purchase.amount_paid || purchase.final_price || purchase.base_price || 0), 0);

  const openCreate = () => {
    dispatch(resetMutation());
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    dispatch(resetMutation());
    setEditing(row.raw);
    setFormOpen(true);
  };

  return (
    <>
      <PremiumResourcePage
        eyebrow="Package Management"
        title="Vendor Packages"
        description="Create and manage vendor subscription packages, purchase history, ad limits and coin allocation."
        actionLabel="Create Package"
        actionIcon={Plus}
        onAction={openCreate}
        metrics={[
          { label: 'Packages', value: formatNumber(rows.length), detail: 'Configured tiers', icon: Package, tone: 'magenta' },
          { label: 'Active', value: formatNumber(rows.filter((row) => row.status === 'active').length), detail: 'Available to vendors', icon: Sparkles, tone: 'emerald' },
          { label: 'Purchases', value: formatNumber(adminPurchasesTotal || purchases.length), detail: 'Vendor purchases', icon: Receipt, tone: 'magenta' },
          { label: 'Revenue', value: fmtINR(revenue), detail: 'Recorded package sales', icon: Wallet, tone: 'rose' },
        ]}
        rows={filteredRows}
        columns={[
          {
            key: 'name',
            title: 'Package',
            render: (value, row) => (
              <div>
                <p className="text-sm font-bold text-neutral-950">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-neutral-500">{row.ads} ads allowed</p>
              </div>
            ),
          },
          { key: 'tier', title: 'Tier', render: (value) => <PremiumBadge tone="magenta">{value}</PremiumBadge> },
          { key: 'price', title: 'Price', render: (value) => fmtINR(value) },
          { key: 'coins', title: 'Coins', render: (value) => formatNumber(value) },
          { key: 'validity', title: 'Validity', render: (value) => `${formatNumber(value)} days` },
          { key: 'status', title: 'Status', render: (value) => <PremiumBadge tone={value === 'active' ? 'emerald' : 'rose'} dot>{value}</PremiumBadge> },
          { key: 'createdAt', title: 'Created', render: (value) => formatDateTime(value) },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search packages, tier, or ad range..."
        filters={[
          {
            label: 'Tier',
            value: tierFilter,
            onChange: setTierFilter,
            options: [
              { value: 'all', label: 'All Tiers' },
              { value: 'basic', label: 'Basic' },
              { value: 'standard', label: 'Standard' },
              { value: 'premium', label: 'Premium' },
              { value: 'enterprise', label: 'Enterprise' },
            ],
          },
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
        actions={[
          { label: 'Edit package', icon: Edit2, onClick: openEdit },
          { label: 'Deactivate', icon: Trash2, tone: 'rose', onClick: (row) => dispatch(adminDeactivatePackage(row.id)).then(() => dispatch(fetchAllPackages())) },
        ]}
        emptyMessage={packagesStatus === 'loading' ? 'Loading packages...' : packagesError ? `Error: ${packagesError}` : 'No packages found'}
        rowKey={(row) => row.id}
      />

      <PackageForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} />
    </>
  );
};

export default VendorPackages;
