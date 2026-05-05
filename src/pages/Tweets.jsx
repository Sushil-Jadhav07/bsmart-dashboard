import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Search, Eye } from 'lucide-react';
import Table from '../components/Table.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { useSelector } from 'react-redux';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { useNavigate } from 'react-router-dom';

const Tweets = () => {
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
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/feed?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load tweets');
      const tweets = Array.isArray(data?.tweets) ? data.tweets : [];
      setItems(tweets);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load tweets');
      setStatus('failed');
    }
  };

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((t) =>
      String(t?._id || '').toLowerCase().includes(q) ||
      String(t?.content || '').toLowerCase().includes(q) ||
      String(t?.author?.username || '').toLowerCase().includes(q),
    );
  }, [items, searchTerm]);

  const handleDelete = async () => {
    if (!confirmDelete?._id) return;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${confirmDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete tweet');
      setItems((prev) => prev.filter((x) => x._id !== confirmDelete._id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e.message || 'Failed to delete tweet');
      setConfirmDelete(null);
    }
  };

  const columns = [
    {
      key: 'content',
      title: 'Tweet',
      render: (_, row) => (
        <div>
          <p className="font-medium text-neutral-800 truncate max-w-[360px]">{row.content || '(no text)'}</p>
          <p className="text-xs text-neutral-500">@{row?.author?.username || 'unknown'}</p>
        </div>
      ),
    },
    { key: 'likesCount', title: 'Likes', render: (v) => formatNumber(v || 0) },
    { key: 'commentsCount', title: 'Comments', render: (v) => formatNumber(v || 0) },
    { key: 'createdAt', title: 'Created', render: (v) => formatDateTime(v) },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/tweets/${row._id}`)}
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
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Tweets</h1>
        <p className="text-neutral-500 mt-2 text-sm">Manage tweet content.</p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by tweet ID, content, or owner..."
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
          emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading tweets...' : 'No tweets found')}
        />
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Tweet"
        description="Are you sure you want to delete this tweet?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default Tweets;
