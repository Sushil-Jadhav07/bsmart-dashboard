import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchVendorById, patchVendorValidation, setVendorValidatedOptimistic, deleteVendorById } from '../store/vendorsSlice.js'
import { clsx } from 'clsx'
import { ChevronLeft, ShieldCheck, Trash2, Mail, Phone, Calendar, User, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime, capitalize } from '../utils/helpers.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjQzRDNEM0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+'

function SectionLabel({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Icon && <Icon className="w-3 h-3 text-neutral-300" />}
      <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">{children}</p>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-neutral-100 mx-6" />
}

export default function VendorDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const adminId = (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (id) dispatch(fetchVendorById(id))
  }, [dispatch, id])

  const vendor = useMemo(() => {
    const v = current || {}
    const user = v.user || {}
    return {
      id: v._id || v.id || id,
      business_name: v.business_name || 'Unknown Business',
      validated: !!v.validated,
      user: {
        id: user._id || user.id,
        username: user.username || '',
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        role: user.role || 'vendor',
        phone: user.phone || '',
        email: user.email || '',
      },
      createdAt: v.createdAt || '',
      updatedAt: v.updatedAt || '',
    }
  }, [current, id])

  const isLoading = currentStatus === 'loading'
  const error = currentError

  const handleToggleValidation = async () => {
    const next = !vendor.validated
    // Optimistic update locally if needed, but since we are on detail page, we can just wait for thunk
    try {
      await dispatch(
        patchVendorValidation({
          id: vendor.id,
          admin_user_id: adminId,
          validated: next,
        })
      ).unwrap()
      // Refetch to ensure sync
      dispatch(fetchVendorById(id))
      setToast(next ? 'Vendor validated' : 'Vendor unvalidated')
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      console.error('Failed to update validation', e)
    }
  }

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deleteVendorById(vendor.id))
      .unwrap()
      .then(() => navigate('/vendors', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  return (
    <div className="max-w-8xl mx-auto pb-10">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/vendors')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Vendors
        </button>
        <div className="flex items-center gap-2">
           <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete Vendor
          </button>
        </div>
      </div>

      {isLoading && (
         <div className="bg-neutral-100 rounded-3xl h-[400px] animate-pulse" />
      )}

      {!isLoading && error && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load vendor</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          
          {/* Cover / Header */}
          <div className="px-8 py-10 text-center border-b border-neutral-100 bg-neutral-50/30">
             <div className="relative inline-block mb-4">
                <img 
                  src={vendor.user.avatar_url || AVATAR_PLACEHOLDER} 
                  alt={vendor.business_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm bg-neutral-100"
                  onError={(e) => { e.target.src = AVATAR_PLACEHOLDER }}
                />
                <div className={clsx(
                  'absolute bottom-1 right-1 p-1.5 rounded-full border-2 border-white',
                  vendor.validated ? 'bg-green-500 text-white' : 'bg-neutral-300 text-white'
                )}>
                  {vendor.validated ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                </div>
             </div>
             <h1 className="text-2xl font-bold text-neutral-900">{vendor.business_name}</h1>
             <p className="text-neutral-500 mt-1 text-sm">@{vendor.user.username}</p>

             <div className="flex justify-center mt-6">
                <button
                  onClick={handleToggleValidation}
                  disabled={!!updating[vendor.id]}
                  className={clsx(
                    'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm',
                    vendor.validated 
                      ? 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                  )}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {vendor.validated ? 'Unvalidate Vendor' : 'Validate Vendor'}
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
             
             {/* User Info */}
             <div className="p-8 space-y-6">
               <SectionLabel icon={User}>User Information</SectionLabel>
               <div className="space-y-4">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">Full Name</p>
                    <p className="text-neutral-900 font-medium">{vendor.user.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">Phone</p>
                    <div className="flex items-center gap-2 text-neutral-900">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {vendor.user.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">Email</p>
                    <div className="flex items-center gap-2 text-neutral-900">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      {vendor.user.email || 'N/A'}
                    </div>
                  </div>
               </div>
             </div>

             {/* Metadata */}
             <div className="p-8 space-y-6">
               <SectionLabel icon={Calendar}>System Metadata</SectionLabel>
               <div className="space-y-4">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">Vendor ID</p>
                    <p className="font-mono text-xs text-neutral-600 bg-neutral-100 inline-block px-2 py-1 rounded">{vendor.id}</p>
                  </div>
                   <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">User ID</p>
                    <p className="font-mono text-xs text-neutral-600 bg-neutral-100 inline-block px-2 py-1 rounded">{vendor.user.id}</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-neutral-400 mb-1">Joined</p>
                    <p className="text-sm text-neutral-700">{formatDateTime(vendor.createdAt)}</p>
                  </div>
                  <div>
                     <p className="text-xs text-neutral-400 mb-1">Last Updated</p>
                     <p className="text-sm text-neutral-700">{formatDateTime(vendor.updatedAt)}</p>
                  </div>
               </div>
             </div>

          </div>

        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-neutral-900 text-white rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        description={`Are you sure you want to permanently delete ${vendor.business_name}? This cannot be undone.`}
        confirmText="Delete Vendor"
        confirmVariant="danger"
        loading={deleting}
      />

    </div>
  )
}
