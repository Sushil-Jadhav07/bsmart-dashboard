import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPolicies, togglePolicyStatus } from '../store/policiesSlice.js';
import { clsx } from 'clsx';
import {
  FileText, Shield, RefreshCw, Pencil, Globe, FileMinus,
  Clock, Scale, AlertCircle, Loader2,
} from 'lucide-react';

const POLICY_META = [
  {
    key: 'terms',
    title: 'Terms & Conditions',
    description: 'Legal terms governing use of the B-smart platform, user rights and obligations.',
    icon: FileText,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    description: 'How user data is collected, stored, processed and protected on the platform.',
    icon: Shield,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    bar: 'bg-violet-500',
  },
  {
    key: 'refund',
    title: 'Refund Policy',
    description: 'Conditions, timelines and procedures for requesting refunds and cancellations.',
    icon: RefreshCw,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
];

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-pulse">
      <div className="h-1 bg-neutral-200 w-full" />
      <div className="px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-100 rounded w-3/4" />
            <div className="h-3 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-2/3" />
          </div>
        </div>
        <div className="h-px bg-neutral-100" />
        <div className="flex gap-2">
          <div className="flex-1 h-9 rounded-xl bg-neutral-100" />
          <div className="w-10 h-9 rounded-xl bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

export default function Policies() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items = {}, status = 'idle', error = null, toggleLoading = false } = useSelector((s) => s.policies) ?? {};

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPolicies());
  }, [dispatch, status]);

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Never saved';

  const handleToggle = (key, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    dispatch(togglePolicyStatus({ type: key, status: newStatus }));
  };

  const handleRetry = () => dispatch(fetchPolicies());

  const isLoading = status === 'loading';
  const publishedCount = POLICY_META.filter(({ key }) => items[key]?.status === 'published').length;
  const draftCount = POLICY_META.filter(({ key }) => items[key]?.status !== 'published').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">Legal Documents</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage your platform policies and legal pages</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-soft">
            <Scale className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
          <div>
            <p className="text-lg font-bold text-neutral-900 leading-none">{publishedCount}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Published</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-neutral-300" />
          <div>
            <p className="text-lg font-bold text-neutral-900 leading-none">{draftCount}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Draft</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
          <div>
            <p className="text-lg font-bold text-neutral-900 leading-none">{POLICY_META.length}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Total docs</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {status === 'failed' && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-700">{error || 'Failed to load policies'}</p>
            <button
              onClick={handleRetry}
              className="text-[12px] text-red-600 underline underline-offset-2 mt-0.5 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Policy cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading && !Object.keys(items).length
          ? POLICY_META.map(({ key }) => <CardSkeleton key={key} />)
          : POLICY_META.map(({ key, title, description, icon: Icon, iconBg, iconColor, bar }) => {
              const p = items[key];
              const isPublished = p?.status === 'published';
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Top color bar */}
                  <div className={clsx('h-1 w-full', bar)} />

                  {/* Body */}
                  <div className="px-5 pt-5 pb-4 flex-1 flex flex-col gap-4">
                    {/* Icon + title */}
                    <div className="flex items-start gap-3">
                      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
                        <Icon className={clsx('w-5 h-5', iconColor)} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-neutral-900 leading-tight">
                          {p?.title || title}
                        </h3>
                        <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">{description}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={clsx(
                        'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border',
                        isPublished
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                      )}>
                        {isPublished
                          ? <><Globe className="w-3 h-3" /> Published</>
                          : <><FileMinus className="w-3 h-3" /> Draft</>
                        }
                      </span>
                      <div className="text-right">
                        {p?.version && (
                          <p className="text-[10px] text-neutral-400">v{p.version}</p>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Clock className="w-3 h-3" />
                          {fmtDate(p?.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-neutral-100" />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/policies/${key}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-gradient-brand hover:text-white hover:border-transparent transition-all duration-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(key, p?.status)}
                        disabled={toggleLoading || !p}
                        className={clsx(
                          'px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-all duration-200',
                          isPublished
                            ? 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100',
                          (toggleLoading || !p) && 'opacity-50 cursor-not-allowed'
                        )}
                        title={isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {toggleLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : isPublished
                          ? <FileMinus className="w-4 h-4" />
                          : <Globe className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Scale className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-700 leading-relaxed">
          Published documents are visible to users in the app. Draft documents are saved but not publicly visible.
          Click <strong>Edit</strong> to open the full document editor with formatting tools.
        </p>
      </div>
    </div>
  );
}
