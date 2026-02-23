import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Trash2, Image, Film } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Input from '../components/Input.jsx';
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
      const videoThumb =
        isVideo
          ? (mediaItem?.thumbnail ||
             mediaItem?.thumbUrl ||
             mediaItem?.poster ||
             '')
          : '';
      const thumbnail = isVideo
        ? (videoThumb || '')
        : (mediaItem?.fileUrl || THUMB_PLACEHOLDER);
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

  // Filter posts
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
          {row.type === 'reel' && !row.thumbnail && row.videoUrl ? (
            <video
              src={row.videoUrl}
              className="w-12 h-12 rounded-lg object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img 
              src={row.thumbnail || THUMB_PLACEHOLDER} 
              alt={value}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-neutral-800">{value}</p>
              {row.type === 'reel' ? (
                <Film className="w-4 h-4 text-secondary" />
              ) : (
                <Image className="w-4 h-4 text-primary" />
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
      render: (value) => formatNumber(value)
    },
    {
      key: 'comments',
      title: 'Comments',
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
    const { type, post } = confirmModal;
    if (type === 'delete') {
      return `Are you sure you want to delete ${post?.postId}? This action cannot be undone.`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Posts & Reels</h1>
          <p className="text-neutral-500 mt-1">Manage content across the platform</p>
        </div>
        <Button variant="primary" icon={Image} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading…' : 'Create Post'}
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
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

      {/* Search */}
      <Card padding="small">
        <Input
          placeholder="Search by post ID or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card padding="small">
          <p className="text-sm text-neutral-500">Total Posts</p>
          <p className="text-2xl font-bold text-neutral-800 mt-1">
            {posts.filter(p => p.type === 'post').length}
          </p>
        </Card>
        <Card padding="small">
          <p className="text-sm text-neutral-500">Total Reels</p>
          <p className="text-2xl font-bold text-secondary mt-1">
            {posts.filter(p => p.type === 'reel').length}
          </p>
        </Card>
        <Card padding="small">
          <p className="text-sm text-neutral-500">Hidden</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {posts.filter(p => p.status === 'hidden').length}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredPosts}
          searchable={false}
          pagination={true}
          pageSize={10}
          emptyMessage={error ? `Error: ${error}` : (status === 'loading' ? 'Loading posts…' : 'No posts found')}
        />
      </Card>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, post: null })}
        onConfirm={handleConfirm}
        title={confirmModal.type === 'delete' ? 'Delete Content' : 'Hide Content'}
        description={getConfirmMessage()}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmVariant={confirmModal.type === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default Posts;
