import React, { useEffect, useState } from 'react';
import { Eye, Trash2, Image, Film, Search, Filter, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { filterOptions } from '../data/postsData.jsx';
import { formatNumber, formatDateTime, getStatusColor, capitalize } from '../utils/helpers.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts, deletePostById } from '../store/postsSlice.js';
import { useNavigate } from 'react-router-dom';

const Posts = () => {
  const THUMB_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+UG9zdDwvdGV4dD48L3N2Zz4='
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((s) => s.posts);
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, post: null });

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  useEffect(() => {
    const mapped = (items || []).map((p) => {
      const id = p.post_id || p._id || p.id || p.uuid || '';
      const owner =
        (p.user_id && (p.user_id.full_name || p.user_id.username)) ||
        p.username ||
        'Unknown';
      const mediaItem = Array.isArray(p.media) ? p.media[0] : null;
      const isVideo = !!(mediaItem && mediaItem.type === 'video');
      const videoUrl = isVideo ? (mediaItem?.fileUrl || '') : '';
      const getThumbnailUrl = (m) => {
        if (!m) return '';
        if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl;
        if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl;
        return '';
      };
      const videoThumb = isVideo ? getThumbnailUrl(mediaItem) : '';
      const thumbnail = isVideo
        ? (videoThumb || THUMB_PLACEHOLDER)
        : (getThumbnailUrl(mediaItem) || mediaItem?.fileUrl || THUMB_PLACEHOLDER);
      const type = isVideo ? 'reel' : 'post';
      const likes = p.likes_count ?? p.likes ?? p.likesCount ?? 0;
      const comments = Array.isArray(p.comments) ? p.comments.length : (p.commentsCount ?? 0);
      const status = 'active';
      const createdAt = p.createdAt || p.created_at || new Date().toISOString();
      return {
        id,
        postId: id,
        owner,
        thumbnail,
        videoUrl,
        type,
        likes,
        comments,
        status,
        createdAt,
      };
    });
    setPosts(mapped);
  }, [items]);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.postId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.owner.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && post.type === filter;
  });

  const handleAction = (type, post) => {
    if (type === 'view') {
      navigate(`/posts/${post.id}`);
      return;
    }
    setConfirmModal({ isOpen: true, type, post });
  };

  const handleConfirm = () => {
    const { type, post } = confirmModal;
    
    if (type === 'delete') {
      const id = post.id;
      dispatch(deletePostById(id))
        .unwrap()
        .then(() => {
          setPosts(posts.filter(p => p.id !== id));
        })
        .catch(() => {
        })
        .finally(() => {
          setConfirmModal({ isOpen: false, type: null, post: null });
        });
      return;
    }
    
    setConfirmModal({ isOpen: false, type: null, post: null });
  };

  const columns = [
    {
      key: 'postId',
      title: 'Content',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <img
              src={row.thumbnail || THUMB_PLACEHOLDER}
              alt={value}
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => { e.target.src = THUMB_PLACEHOLDER; }}
            />
            {row.type === 'reel' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-neutral-800 truncate max-w-[160px]">{value}</p>
              {row.type === 'reel' ? (
                <Film className="w-4 h-4 text-secondary flex-shrink-0" />
              ) : (
                <Image className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-neutral-500">{row.owner}</p>
          </div>
        </div>
      )
    },
    {
      key: 'likes',
      title: 'Likes',
      className: 'hidden sm:table-cell',
      render: (value) => formatNumber(value)
    },
    {
      key: 'comments',
      title: 'Comments',
      className: 'hidden sm:table-cell',
      render: (value) => formatNumber(value)
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
      className: 'hidden lg:table-cell',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction('view', row)}
            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction('delete', row)}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const getConfirmMessage = () => {
    const { type, post } = confirmModal;
    if (type === 'delete') {
      return `Are you sure you want to delete ${post?.postId}? This action cannot be undone.`;
    }
    return '';
  };

  const totalPosts = posts.filter(p => p.type === 'post').length;
  const totalReels = posts.filter(p => p.type === 'reel').length;
  const totalLikes = posts.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (Number(p.comments) || 0), 0);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Posts & Reels</h1>
          <p className="text-neutral-500 mt-2 text-sm max-w-md leading-relaxed">
            Review content performance, spot trends, and take action quickly across the platform.
          </p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Image className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">
              +8% <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{formatNumber(posts.length)}</p>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Total Content</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Image className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">
              +4% <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{formatNumber(totalPosts)}</p>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Posts</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-violet-50 text-violet-600">
              <Film className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">
              +6% <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{formatNumber(totalReels)}</p>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Reels</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600">
              +10% <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{formatNumber(totalLikes + totalComments)}</p>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Engagement</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  filter === option.value
                    ? 'bg-gradient-brand text-white shadow-soft'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary hover:text-primary'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by post ID or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={filteredPosts}
            searchable={false}
            pagination={true}
            pageSize={10}
            emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading posts…' : 'No posts found')}
            className="min-w-full"
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, post: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? 'Delete Content' : 'Confirm Action'}
        description={getConfirmMessage()}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmVariant={confirmModal.type === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default Posts;
