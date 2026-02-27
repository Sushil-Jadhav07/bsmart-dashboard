import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Trash2, Image, Film } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { formatNumber, formatDateTime, getStatusColor, capitalize } from '../utils/helpers.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdCategories, fetchAdsAdmin, deleteAdById } from '../store/adsSlice.js';
import { useNavigate } from 'react-router-dom';

const Ads = () => {
  const THUMB_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+QWQ8L3RleHQ+PC9zdmc+'
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error, categories } = useSelector((s) => s.ads);
  const [ads, setAds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, ad: null });

  const statusChips = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    dispatch(fetchAdCategories());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAdsAdmin({ page, limit, status: statusFilter, category: categoryFilter }));
  }, [dispatch, page, limit, statusFilter, categoryFilter]);

  useEffect(() => {
    const getThumbnailUrl = (m) => {
      if (!m) return '';
      if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl;
      if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl;
      if (Array.isArray(m.thumbnails) && m.thumbnails[0]?.fileUrl) return m.thumbnails[0].fileUrl;
      if (m.thumbnails?.fileUrl) return m.thumbnails.fileUrl;
      if (m.thumbnail_url) return m.thumbnail_url;
      return '';
    };

    const mapped = (items || []).map((ad) => {
      const id = ad._id || ad.ad_id || ad.id || '';
      const title = ad.title || ad.headline || ad.caption || 'Untitled ad';
      const creator =
        ad.vendor?.business_name ||
        ad.vendor?.user?.username ||
        ad.user?.full_name ||
        ad.user?.username ||
        ad.creator?.username ||
        'Unknown';
      const categoryRaw = ad.category || ad.targeting_rules?.category_label || '';
      const category =
        typeof categoryRaw === 'string'
          ? categoryRaw
          : (categoryRaw?.label || categoryRaw?.name || categoryRaw?.title || '');
      const mediaItem = Array.isArray(ad.media) ? ad.media[0] : null;
      const mediaType = mediaItem?.media_type || mediaItem?.type || mediaItem?.mime_type || '';
      const isVideo = String(mediaType).toLowerCase().includes('video');
      const thumb = getThumbnailUrl(mediaItem);
      const thumbnail = isVideo
        ? (thumb || THUMB_PLACEHOLDER)
        : (thumb || mediaItem?.fileUrl || mediaItem?.url || THUMB_PLACEHOLDER);
      const coinsReward = ad.coins_reward ?? ad.reward_config?.coins_per_view ?? 0;
      const views = ad.views_count ?? ad.views ?? ad.view_count ?? 0;
      const status = ad.status || 'pending';
      const createdAt = ad.createdAt || ad.created_at || new Date().toISOString();
      return {
        id,
        adId: id,
        title,
        creator,
        category,
        thumbnail,
        type: isVideo ? 'video' : 'image',
        coinsReward,
        views,
        status,
        createdAt,
      };
    });

    setAds(mapped);
  }, [items]);

  const filteredAds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((a) => {
      return (
        (a.adId || '').toLowerCase().includes(q) ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.creator || '').toLowerCase().includes(q)
      );
    });
  }, [ads, searchTerm]);

  const categoryOptions = useMemo(() => {
    const mapped = (categories || []).map((c) => {
      const value = c?.value || c?.id || c?._id || c?.slug || c?.name || c?.label || '';
      const label = c?.label || c?.name || c?.title || String(value || 'Category');
      return { value: String(value), label };
    }).filter((o) => o.value);

    const unique = [];
    const seen = new Set();
    for (const o of mapped) {
      if (seen.has(o.value)) continue;
      seen.add(o.value);
      unique.push(o);
    }
    return [{ value: 'all', label: 'All Categories' }, ...unique];
  }, [categories]);

  const handleAction = (type, ad) => {
    if (type === 'view') {
      navigate(`/ads/${ad.id}`);
      return;
    }
    setConfirmModal({ isOpen: true, type, ad });
  };

  const handleConfirm = () => {
    const { type, ad } = confirmModal;

    if (type === 'delete') {
      const id = ad.id;
      dispatch(deleteAdById(id))
        .unwrap()
        .then(() => {
          setAds(ads.filter((a) => a.id !== id));
        })
        .catch(() => {
        })
        .finally(() => {
          setConfirmModal({ isOpen: false, type: null, ad: null });
        });
      return;
    }

    setConfirmModal({ isOpen: false, type: null, ad: null });
  };

  const columns = [
    {
      key: 'adId',
      title: 'Ad',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <img
              src={row.thumbnail || THUMB_PLACEHOLDER}
              alt={value}
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => { e.target.src = THUMB_PLACEHOLDER; }}
            />
            {row.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-neutral-800 truncate max-w-[220px]">{row.title}</p>
              {row.type === 'video' ? (
                <Film className="w-4 h-4 text-secondary flex-shrink-0" />
              ) : (
                <Image className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-neutral-500 truncate max-w-[220px]">{row.creator}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      render: (value) => (
        <span className="text-sm text-neutral-700">{value || '-'}</span>
      )
    },
    {
      key: 'coinsReward',
      title: 'Reward',
      render: (value) => formatNumber(value)
    },
    {
      key: 'views',
      title: 'Views',
      render: (value) => formatNumber(value ?? 0)
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
      key: 'createdAt',
      title: 'Created',
      render: (value) => formatDateTime(value)
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
    const { type, ad } = confirmModal;
    if (type === 'delete') {
      return `Are you sure you want to delete ${ad?.adId}? This action cannot be undone.`;
    }
    return '';
  };

  const canPrev = page > 1 && status !== 'loading';
  const canNext = ads.length >= limit && status !== 'loading';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Ads</h1>
          <p className="text-neutral-500 mt-1">Manage advertisements</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusChips.map((option) => (
          <button
            key={option.value}
            onClick={() => { setStatusFilter(option.value); setPage(1); }}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              statusFilter === option.value
                ? 'bg-gradient-brand text-white shadow-soft'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary hover:text-primary'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card padding="small">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by ad ID, title, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              options={categoryOptions}
              className="w-48"
            />
            <Select
              value={String(limit)}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              options={[
                { value: '10', label: '10 / page' },
                { value: '20', label: '20 / page' },
                { value: '50', label: '50 / page' },
              ]}
              className="w-32"
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={filteredAds}
          searchable={false}
          pagination={false}
          pageSize={limit}
          emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading ads…' : 'No ads found')}
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">Page {page}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="ghost" size="sm" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, ad: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? 'Delete Ad' : 'Confirm Action'}
        description={getConfirmMessage()}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmVariant={confirmModal.type === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default Ads;
