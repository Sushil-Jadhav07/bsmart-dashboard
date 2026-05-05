import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Search, Film, Eye } from 'lucide-react';
import Table from '../components/Table.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { useSelector } from 'react-redux';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { useNavigate } from 'react-router-dom';

const Prompts = () => {
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load prompts');
      const list = Array.isArray(data?.data) ? data.data : [];
      setItems(list);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load prompts');
      setStatus('failed');
    }
  };

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((t) =>
      String(t?.promote_reel_id || t?._id || '').toLowerCase().includes(q) ||
      String(t?.caption || '').toLowerCase().includes(q) ||
      String(t?.user_id?.username || '').toLowerCase().includes(q),
    );
  }, [items, searchTerm]);

  const handleDelete = async () => {
    const id = confirmDelete?.promote_reel_id || confirmDelete?._id;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete prompt');
      setItems((prev) => prev.filter((x) => (x.promote_reel_id || x._id) !== id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e.message || 'Failed to delete prompt');
      setConfirmDelete(null);
    }
  };

  const columns = [
    {
      key: 'caption',
      title: 'Prompt/Reel',
      render: (_, row) => (
        <div className="flex items-start gap-2">
          <Film className="w-4 h-4 mt-0.5 text-violet-500" />
          <div>
            <p className="font-medium text-neutral-800 truncate max-w-[360px]">{row.caption || '(no caption)'}</p>
            <p className="text-xs text-neutral-500">@{row?.user_id?.username || 'unknown'}</p>
          </div>
        </div>
      ),
    },
    { key: 'likes_count', title: 'Likes', render: (v) => formatNumber(v || 0) },
    { key: 'comments_count', title: 'Comments', render: (v) => formatNumber(v || 0) },
    { key: 'createdAt', title: 'Created', render: (v) => formatDateTime(v) },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/promote/${row?.promote_reel_id || row?._id}`)}
            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmDelete(row)}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Promote</h1>
        <p className="text-neutral-500 mt-2 text-sm">Manage promoted reel content.</p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by ID, caption, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
        <Table
          columns={columns}
          data={filtered}
          searchable={false}
          pagination={true}
          pageSize={10}
          emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading promote reels...' : 'No promote reels found')}
        />
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Promote Reel"
        description="Are you sure you want to delete this promote reel?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default Prompts;
