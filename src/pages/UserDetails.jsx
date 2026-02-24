import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchUserById, fetchUsers, deleteUserById } from '../store/usersSlice.js'
import { formatDateTime, capitalize } from '../utils/helpers.jsx'
import {
  ChevronLeft, Mail, Phone, Calendar, Users, Image as ImageIcon,
  Film, Heart, MessageCircle, ShieldCheck, UserCircle,
  CheckCircle, XCircle, Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmModal } from '../components/Modal.jsx'

const baseUrl = 'https://bsmart.asynk.store'

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjQzRDNEM0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+'

const getThumbnailUrl = (m) => {
  if (!m) return ''
  if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl
  if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl
  return ''
}

function Divider() {
  return <div className="h-px bg-neutral-100 mx-6" />
}

function SectionLabel({ children, icon: Icon, iconColor }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Icon && <Icon className={clsx('w-3 h-3', iconColor || 'text-neutral-300')} />}
      <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">{children}</p>
    </div>
  )
}

function StatBox({ label, value, color = 'text-neutral-900' }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2">
      <p className={clsx('text-xl font-bold leading-none', color)}>{value ?? 0}</p>
      <p className="text-[10px] text-neutral-400 mt-1 text-center leading-tight">{label}</p>
    </div>
  )
}

function PostCard({ post, onClick }) {
  const media = Array.isArray(post.media) ? post.media[0] : null
  const isVideo = media?.type === 'video'
  const thumb = getThumbnailUrl(media) || media?.fileUrl || ''
  const likes = post.likes_count ?? post.likes?.length ?? 0
  const comments = post.comments_count ?? post.comments?.length ?? 0

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-neutral-100 aspect-square cursor-pointer"
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isVideo ? <Film className="w-6 h-6 text-neutral-400" /> : <ImageIcon className="w-6 h-6 text-neutral-400" />}
        </div>
      )}
      {/* overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-1 text-white text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-white" /> {likes}
        </div>
        <div className="flex items-center gap-1 text-white text-xs font-semibold">
          <MessageCircle className="w-3.5 h-3.5 fill-white" /> {comments}
        </div>
      </div>
      {isVideo && (
        <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-md p-0.5">
          <Film className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  )
}

export default function UserDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const token = useSelector((s) => s.auth.token)
  // const { current, currentStatus, currentError } = useSelector((s) => s.users)

  // user detail page needs both /api/users/:id (profile) AND the list item which has summary+posts
  // We fetch /api/users/:id for profile info, and find the matching item from the list for summary+posts
  const listItems = useSelector((s) => s.users.items)

  const [userDetail, setUserDetail] = useState(null)
  const [userDetailLoading, setUserDetailLoading] = useState(true)
  const [userDetailError, setUserDetailError] = useState(null)

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // The list item (from /api/users) has summary + posts
  const listItem = useMemo(() => {
    return (listItems || []).find((item) => {
      const u = item?.user || item
      return u._id === id || u.id === id
    })
  }, [listItems, id])

  // Fetch /api/users/:id for detailed profile
  useEffect(() => {
    if (!id || !token) return
    setUserDetailLoading(true)
    setUserDetailError(null)
    fetch(`${baseUrl}/api/users/${id}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUserDetail(data?.data || data)
        setUserDetailLoading(false)
      })
      .catch((e) => {
        setUserDetailError(e.message || 'Failed to load user')
        setUserDetailLoading(false)
      })
  }, [id, token])

  // If list is empty, fetch it so we get summary+posts
  useEffect(() => {
    if (!listItems || listItems.length === 0) {
      dispatch(fetchUsers())
    }
  }, [dispatch, listItems])

  const profile = useMemo(() => {
    const u = userDetail || {}
    const listUser = listItem?.user || {}
    return {
      id: u._id || u.id || id,
      full_name: u.full_name || listUser.full_name || 'Unknown',
      username: u.username || listUser.username || '',
      email: u.email || '',
      phone: u.phone || listUser.phone || '',
      bio: u.bio || '',
      role: u.role || listUser.role || 'member',
      avatar_url: u.avatar_url || listUser.avatar_url || '',
      followers_count: u.followers_count ?? listUser.followers_count ?? 0,
      following_count: u.following_count ?? listUser.following_count ?? 0,
      is_active: u.is_active !== undefined ? u.is_active : true,
      validated: u.validated ?? listUser.validated ?? false,
      createdAt: u.createdAt || listUser.createdAt || '',
      updatedAt: u.updatedAt || listUser.updatedAt || '',
    }
  }, [userDetail, listItem, id])

  const summary = listItem?.summary || {}
  const posts = Array.isArray(listItem?.posts) ? listItem.posts : []

  const isLoading = userDetailLoading
  const error = userDetailError

  const roleStyles = {
    admin: 'bg-neutral-900 text-white',
    vendor: 'bg-violet-50 text-violet-600',
    member: 'bg-rose-50 text-rose-500',
  }

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deleteUserById(profile.id))
      .unwrap()
      .then(() => navigate('/users', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Users
        </button>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className={clsx(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full',
              roleStyles[profile.role] || 'bg-neutral-100 text-neutral-600'
            )}>
              <ShieldCheck className="w-3 h-3" />
              {capitalize(profile.role)}
            </span>
          )}
          <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
             <div className="h-40 bg-neutral-100 rounded-3xl animate-pulse" />
             <div className="h-64 bg-neutral-100 rounded-3xl animate-pulse" />
          </div>
          <div className="bg-neutral-100 rounded-3xl h-[500px] animate-pulse" />
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && error && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load user</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* ── Main layout ── */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* LEFT ── Activity + Content */}
          <div className="space-y-6">
            
            {/* Activity Summary */}
            {listItem && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 pt-5 pb-1">
                  <SectionLabel>Activity Summary</SectionLabel>
                </div>
                <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
                  <StatBox label="Posts" value={summary.posts_count} />
                  <StatBox label="Reels" value={summary.reels_count} />
                  <StatBox label="Total Likes" value={summary.likes_count_total} color="text-rose-500" />
                </div>
                <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
                  <StatBox label="Comments" value={summary.comments_count_total} color="text-blue-500" />
                  <StatBox label="Views" value={summary.views_count_total} />
                  <StatBox label="Unique Views" value={summary.unique_views_count_total} />
                </div>
              </div>
            )}

            {/* Content Grid */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 flex items-center justify-between">
                <SectionLabel icon={ImageIcon}>User Content</SectionLabel>
                <span className="text-[10px] text-neutral-300 font-medium -mt-3">{posts.length} items</span>
              </div>
              
              {posts.length > 0 ? (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {posts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onClick={() => navigate(`/posts/${post._id}`)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-10 text-center">
                  <ImageIcon className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-300">No content found</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT ── Profile Card */}
          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm lg:sticky lg:top-6">

            {/* Avatar + name */}
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="relative mb-4">
                <img
                  src={profile.avatar_url || AVATAR_PLACEHOLDER}
                  alt={profile.full_name}
                  onError={(e) => { e.target.src = AVATAR_PLACEHOLDER }}
                  className="w-24 h-24 rounded-full object-cover bg-neutral-100 border-4 border-white shadow-sm"
                />
                <span className={clsx(
                  'absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white',
                  profile.is_active ? 'bg-green-400' : 'bg-neutral-300'
                )} />
              </div>
              <h1 className="font-bold text-neutral-900 text-xl leading-tight">{profile.full_name}</h1>
              {profile.username && (
                <p className="text-sm text-neutral-400 mt-1">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-xs text-neutral-500 mt-3 leading-relaxed max-w-[240px]">{profile.bio}</p>
              )}
              
              {profile.validated && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified Account
                </div>
              )}
            </div>

            <Divider />

            {/* Followers / Following */}
            <div className="grid grid-cols-2 divide-x divide-neutral-100">
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-lg font-bold text-neutral-900 leading-none">{profile.followers_count}</p>
                <p className="text-[10px] text-neutral-400 mt-1">Followers</p>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-lg font-bold text-neutral-900 leading-none">{profile.following_count}</p>
                <p className="text-[10px] text-neutral-400 mt-1">Following</p>
              </div>
            </div>

            <Divider />

            {/* Contact + meta */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-3">
                <SectionLabel>Contact Info</SectionLabel>
                {profile.email ? (
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0 text-neutral-400">
                        <Mail className="w-4 h-4" />
                    </div>
                    <span className="truncate">{profile.email}</span>
                  </div>
                ) : (
                    <p className="text-xs text-neutral-300 italic">No email provided</p>
                )}
                {profile.phone ? (
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                     <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0 text-neutral-400">
                        <Phone className="w-4 h-4" />
                    </div>
                    <span>{profile.phone}</span>
                  </div>
                ) : (
                    <p className="text-xs text-neutral-300 italic">No phone provided</p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                 <SectionLabel>Metadata</SectionLabel>
                 <div className="space-y-2">
                    {profile.createdAt && (
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Calendar className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
                        Joined {formatDateTime(profile.createdAt)}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className={clsx(
                        'w-2 h-2 rounded-full',
                        profile.is_active ? 'bg-green-500' : 'bg-neutral-300'
                        )} />
                        Status: <span className="font-medium text-neutral-700">{profile.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-[10px] font-mono text-neutral-300 break-all pt-1">ID: {profile.id}</p>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${profile.full_name}? This will remove all their posts and data. This cannot be undone.`}
        confirmText="Delete User"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
