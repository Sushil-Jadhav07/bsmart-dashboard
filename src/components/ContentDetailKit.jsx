import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Hash,
  Heart,
  History,
  Loader2,
  Maximize2,
  MessageSquareText,
  Play,
  Quote,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatRelativeTime } from '../utils/helpers.jsx';

// ─── Small building blocks ─────────────────────────────────────────────────

const INITIAL_TONES = [
  'bg-pink-100 text-[#C81345]',
  'bg-purple-100 text-[#8E35B5]',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
];
export const initialsOf = (name) => String(name || '?').replace(/^@/, '').split(/[\s._]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const toneOf = (name) => INITIAL_TONES[[...String(name || '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % INITIAL_TONES.length];

export const Initials = ({ name, src, size = 'h-9 w-9 text-[11px]', solid = false }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className={clsx(size, 'flex-shrink-0 rounded-full object-cover')} />;
  return (
    <span className={clsx(size, 'flex flex-shrink-0 items-center justify-center rounded-full font-bold', solid ? 'bg-[#C81345] text-white' : toneOf(name))}>
      {initialsOf(name)}
    </span>
  );
};

const PILL_TONES = {
  pink: 'bg-pink-100 text-[#C81345]',
  purple: 'bg-purple-100 text-[#8E35B5]',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  grey: 'bg-neutral-100 text-neutral-600',
  lavender: 'bg-[#E9EBFA] text-neutral-700',
};

export const Pill = ({ tone = 'lavender', dot = false, className, children }) => (
  <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', PILL_TONES[tone], className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

export const IconBtn = ({ icon: Icon, title, onClick, href }) => {
  const cls = 'flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:text-neutral-900 hover:shadow-sm';
  if (href) return <a href={href} target="_blank" rel="noreferrer" download title={title} aria-label={title} className={cls}><Icon className="h-3.5 w-3.5" /></a>;
  return <button type="button" onClick={onClick} title={title} aria-label={title} className={cls}><Icon className="h-3.5 w-3.5" /></button>;
};

export const Panel = ({ icon: Icon, iconClass = 'text-[#C81345]', title, badge, actions, children, className, bodyClass = 'px-5 pb-5' }) => (
  <section className={clsx('rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(16,24,40,0.3)]', className)}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className={clsx('h-4 w-4 flex-shrink-0', iconClass)} />}
          <h2 className="truncate font-display text-[15px] font-bold tracking-tight text-neutral-900">{title}</h2>
          {badge}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

// ─── Top bar ───────────────────────────────────────────────────────────────

export const DetailTopBar = ({ backLabel, onBack, chips = null, onDelete, deleteLabel = 'Delete' }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <button type="button" onClick={onBack} className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-600 transition-colors hover:text-neutral-900">
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {backLabel}
    </button>
    <div className="flex items-center gap-2.5">
      {chips}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-[13px] font-bold text-[#C81345] transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-[0_8px_18px_-10px_rgba(200,19,69,0.6)]"
        >
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </button>
      )}
    </div>
  </div>
);

export const LoadingState = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-24 text-neutral-400">
    <Loader2 className="h-8 w-8 animate-spin" />
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export const ErrorState = ({ title, message }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
      <AlertTriangle className="h-6 w-6 text-red-500" />
    </div>
    <p className="font-semibold text-neutral-800">{title}</p>
    <p className="text-sm text-neutral-400">{message}</p>
  </div>
);

// ─── Media ─────────────────────────────────────────────────────────────────

export const Lightbox = ({ images, index, onClose, onIndex }) => {
  useEffect(() => {
    if (index < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndex]);

  if (index < 0 || !images[index]) return null;
  const many = images.length > 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      {many && <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white">{index + 1} / {images.length}</div>}
      {many && (
        <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length); }} className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <img src={images[index]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
      {many && (
        <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length); }} className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

// Main image with arrows + dots, and a row of "Slide N" thumbnails underneath.
export const MediaCarousel = ({ images, onExpand }) => {
  const [active, setActive] = useState(0);
  const [size, setSize] = useState(null);
  const current = images[active];
  const many = images.length > 1;

  useEffect(() => { setActive(0); }, [images.length]);
  useEffect(() => { setSize(null); }, [current]);

  if (!images.length) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-400">No media</div>;
  }

  return (
    <div>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-900">
        <img src={current} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        <img
          src={current}
          alt=""
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onClick={() => onExpand?.(active)}
          className="relative h-full w-full cursor-zoom-in object-contain"
        />
        {size && (
          <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-700 shadow-sm">
            Original / {size.w} × {size.h}
          </span>
        )}
        {many && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => setActive((i) => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow transition hover:scale-110 hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next image" onClick={() => setActive((i) => (i + 1) % images.length)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow transition hover:scale-110 hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
              {images.map((_, i) => (
                <button key={i} type="button" aria-label={`Go to image ${i + 1}`} onClick={() => setActive(i)} className={clsx('h-1.5 rounded-full transition-all', i === active ? 'w-4 bg-[#E8194E]' : 'w-1.5 bg-white/70 hover:bg-white')} />
              ))}
            </div>
          </>
        )}
      </div>
      {many && (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {images.slice(0, 6).map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={clsx(
                'group/thumb relative aspect-[16/10] overflow-hidden rounded-lg border-2 transition',
                i === active ? 'border-[#E8194E] shadow-[0_6px_16px_-8px_rgba(232,25,78,0.7)]' : 'border-transparent opacity-80 hover:opacity-100'
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105" />
              <span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 text-[9.5px] font-bold text-neutral-700">Slide {i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const MediaActions = ({ url, onExpand }) => (
  <>
    {onExpand && <IconBtn icon={Maximize2} title="View full screen" onClick={onExpand} />}
    {url && <IconBtn icon={Download} title="Open original file" href={url} />}
  </>
);

// 9:16 player centred on a blurred copy of its poster.
export const VideoStage = ({ videoUrl, posterUrl, durationLabel }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative flex h-[460px] items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
      {posterUrl && <img src={posterUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />}
      <div className="relative aspect-[9/16] h-full overflow-hidden rounded-lg bg-black shadow-2xl">
        {playing && videoUrl ? (
          <video src={videoUrl} poster={posterUrl || undefined} className="h-full w-full object-contain" controls autoPlay playsInline />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} disabled={!videoUrl} className="group absolute inset-0 flex flex-col items-center justify-center gap-3">
            {posterUrl && <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-[#E8194E]/80">
              <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
            </span>
            <span className="relative text-[12px] font-semibold text-white/90">{videoUrl ? 'Play video' : 'Video unavailable'}</span>
          </button>
        )}
        {!playing && durationLabel && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10.5px] font-bold text-white">{durationLabel}</span>
        )}
      </div>
    </div>
  );
};

// ─── Caption ───────────────────────────────────────────────────────────────

const RichText = ({ text }) => text.split(/(\s+)/).map((part, i) => {
  if (/^#[\p{L}\p{N}_]+/u.test(part)) return <span key={i} className="font-semibold text-[#C81345]">{part}</span>;
  if (/^@[\w.]+/.test(part)) return <span key={i} className="font-semibold text-[#8E35B5]">{part}</span>;
  return part;
});

export const CaptionPanel = ({ title = 'Post Caption', caption, footer = null }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked; nothing to do */ }
  };
  return (
    <Panel
      icon={Quote}
      iconClass="text-[#C81345] fill-[#C81345]"
      title={title}
      actions={caption ? (
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600 transition hover:text-[#C81345]">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      ) : null}
    >
      <div className="rounded-xl bg-[#F1F3FC] px-4 py-3 text-[13.5px] leading-relaxed text-neutral-700">
        {caption ? <p className="whitespace-pre-wrap break-words"><RichText text={caption} /></p> : <p className="italic text-neutral-400">No caption provided</p>}
      </div>
      {footer}
    </Panel>
  );
};

// ─── Info + metrics ────────────────────────────────────────────────────────

export const InfoPanel = ({ title, status, creator, rows, onViewCreator, footer }) => (
  <Panel title={title} actions={status ? <Pill tone={status.tone} dot>{status.label}</Pill> : null}>
    {creator && (
      <div className="flex items-center gap-3 rounded-xl bg-[#F1F3FC] p-3">
        <Initials name={creator.name} src={creator.avatar} size="h-11 w-11 text-[13px]" solid />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[14px] font-bold text-neutral-900">{creator.name}</p>
          {creator.handle && <p className="truncate text-[12px] text-neutral-500">@{creator.handle}</p>}
          {creator.meta && <p className="truncate text-[11px] font-semibold text-neutral-600">{creator.meta}</p>}
        </div>
      </div>
    )}
    <dl className="mt-4 space-y-3">
      {rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== '').map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">{row.label}</dt>
          <dd className={clsx(
            'min-w-0 truncate text-right text-[12.5px] text-neutral-700',
            row.chip && 'rounded-md bg-[#E9EBFA] px-2 py-0.5 font-mono text-[11px] font-bold text-neutral-800'
          )} title={typeof row.value === 'string' ? row.value : undefined}>
            {row.icon && <row.icon className="mr-1 inline h-3.5 w-3.5 text-[#C81345]" />}
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
    {onViewCreator && (
      <button type="button" onClick={onViewCreator} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#E9EBFA] text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)]">
        <User className="h-4 w-4" /> View Creator CRM Profile
      </button>
    )}
    {footer}
  </Panel>
);

const TILE_TONES = {
  pink: { icon: 'text-[#E8194E]', sub: 'text-[#E8194E]' },
  purple: { icon: 'text-[#8E35B5]', sub: 'text-[#8E35B5]' },
  dark: { icon: 'text-neutral-700', sub: 'text-neutral-700' },
  green: { icon: 'text-emerald-600', sub: 'text-emerald-600' },
};

export const MetricsPanel = ({ title = 'Engagement Metrics', tag = 'Live sync', tiles, bar }) => (
  <Panel title={title} actions={tag ? <span className="text-[10px] font-bold uppercase tracking-wide text-[#C81345]">{tag}</span> : null}>
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map((tile) => {
        const tone = TILE_TONES[tile.tone] || TILE_TONES.pink;
        return (
          <div key={tile.label} className="group rounded-xl bg-[#F1F3FC] p-3 transition hover:-translate-y-0.5 hover:bg-[#E9EBFA]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">{tile.label}</p>
              {tile.icon && <tile.icon className={clsx('h-4 w-4 transition-transform group-hover:scale-110', tone.icon)} />}
            </div>
            <p className="mt-1 font-display text-[22px] font-extrabold leading-tight text-neutral-900">{tile.value}</p>
            {tile.sub && <p className={clsx('text-[10.5px] font-bold', tone.sub)}>{tile.sub}</p>}
          </div>
        );
      })}
    </div>
    {bar && (
      <div className="mt-2.5 rounded-xl bg-[#F1F3FC] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-800">{bar.label}</p>
          <p className="text-[11px] font-bold text-[#C81345]">{bar.value}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5] transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, bar.pct || 0))}%` }} />
        </div>
      </div>
    )}
  </Panel>
);

// ─── Tags + people ─────────────────────────────────────────────────────────

export const HashtagsPanel = ({ tags }) => (
  <Panel icon={Hash} title="Hashtags" actions={<span className="text-[10px] font-bold uppercase tracking-wide text-[#C81345]">{tags.length} tags</span>}>
    {tags.length ? (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="rounded-lg bg-pink-100 px-2.5 py-1 text-[12px] font-semibold text-[#C81345] transition hover:-translate-y-0.5 hover:bg-pink-200">
            #{String(tag).replace(/^#/, '')}
          </span>
        ))}
      </div>
    ) : <p className="text-[12.5px] italic text-neutral-400">No hashtags</p>}
  </Panel>
);

export const PeoplePanel = ({ people }) => {
  const navigate = useNavigate();
  return (
    <Panel icon={UserPlus} iconClass="text-[#8E35B5]" title="People Tagged" actions={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{people.length} accounts</span>}>
      {people.length ? (
        <div className="space-y-2">
          {people.map((person, i) => {
            const id = person.user_id?._id || person.user_id || '';
            return (
              <div key={`${person.username}-${i}`} className="flex items-center gap-2.5 rounded-xl bg-[#F1F3FC] px-3 py-2 transition hover:bg-[#E9EBFA]">
                <Initials name={person.username} size="h-7 w-7 text-[10px]" />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#8E35B5]">@{person.username || 'user'}</p>
                {id && (
                  <button type="button" onClick={() => navigate(`/users/${id}`)} className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600 transition hover:text-[#C81345]">
                    View
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : <p className="text-[12.5px] italic text-neutral-400">Nobody tagged</p>}
    </Panel>
  );
};

// ─── Comments ──────────────────────────────────────────────────────────────

const commentId = (c) => String(c?.comment_id || c?._id || c?.id || c?.reply_id || '');
const commentAuthor = (c) => c?.user?.full_name || c?.user?.username || c?.username || 'User';

// Accepts either nested `replies` or a flat list linked by `parent_id`.
export const buildThreads = (comments) => {
  const list = Array.isArray(comments) ? comments : [];
  const childrenOf = new Map();
  list.forEach((c) => {
    if (!c?.parent_id) return;
    const key = String(c.parent_id);
    childrenOf.set(key, [...(childrenOf.get(key) || []), c]);
  });
  return list
    .filter((c) => !c?.parent_id)
    .map((c) => ({ ...c, replies: Array.isArray(c.replies) && c.replies.length ? c.replies : (childrenOf.get(commentId(c)) || []) }));
};

const CommentCard = ({ comment, isAuthor, onDelete, nested = false }) => {
  const name = commentAuthor(comment);
  return (
    <div className={clsx('group/comment rounded-xl px-3.5 py-3 transition', nested ? 'bg-white ring-1 ring-[#E4E7F5]' : 'bg-[#F1F3FC] hover:bg-[#ECEEFA]')}>
      <div className="flex gap-2.5">
        <Initials name={name} src={comment.user?.avatar_url} size="h-8 w-8 text-[10.5px]" solid={isAuthor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-bold text-neutral-900">{name}</p>
            {isAuthor && <span className="rounded bg-pink-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#C81345]">Creator / Author</span>}
            {comment.createdAt && <span className="flex-shrink-0 text-[11px] text-neutral-500">{formatRelativeTime(comment.createdAt)}</span>}
            {onDelete && (
              <button type="button" onClick={() => onDelete(comment)} title="Delete" aria-label="Delete" className="ml-auto rounded-md p-1 text-neutral-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover/comment:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-700"><RichText text={String(comment.text || comment.comment || '')} /></p>
          {Number(comment.likes_count) > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600">
              <Heart className="h-3 w-3 fill-[#E8194E] text-[#E8194E]" /> {comment.likes_count}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const THREAD_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
];

export const CommunityPanel = ({ comments, authorId, authorHandle, onDeleteComment, onDeleteReply, loading }) => {
  const [filter, setFilter] = useState('all');
  const threads = useMemo(() => buildThreads(comments), [comments]);
  const total = threads.reduce((sum, t) => sum + 1 + t.replies.length, 0);
  const isAuthor = (c) => (authorId && String(c?.user?.id || c?.user?._id || c?.user_id || '') === String(authorId))
    || (authorHandle && c?.user?.username === authorHandle);
  const visible = filter === 'unanswered' ? threads.filter((t) => !t.replies.length) : threads;

  return (
    <Panel
      icon={MessageSquareText}
      title="Community Moderation"
      badge={<Pill tone="lavender" className="normal-case">{total} thread items</Pill>}
      actions={(
        <div className="flex items-center gap-1">
          {THREAD_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={clsx(
                'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition',
                filter === f.value ? 'bg-pink-100 text-[#C81345]' : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              Filter: {f.label}
            </button>
          ))}
        </div>
      )}
    >
      {loading ? (
        <div className="space-y-2"><div className="h-16 animate-pulse rounded-xl bg-neutral-100" /><div className="h-16 animate-pulse rounded-xl bg-neutral-100" /></div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <MessageSquareText className="h-6 w-6 text-neutral-300" />
          <p className="text-[12.5px] text-neutral-400">{threads.length ? 'Every comment has a reply' : 'No comments yet'}</p>
        </div>
      ) : (
        <div className="max-h-[640px] space-y-2.5 overflow-y-auto pr-1">
          {visible.map((thread, i) => (
            <div key={commentId(thread) || i} className="space-y-2">
              <CommentCard comment={thread} isAuthor={isAuthor(thread)} onDelete={onDeleteComment} />
              {thread.replies.length > 0 && (
                <div className="ml-8 space-y-2 border-l-2 border-[#E4E7F5] pl-3">
                  {thread.replies.map((reply, ri) => (
                    <CommentCard key={commentId(reply) || ri} comment={reply} isAuthor={isAuthor(reply)} onDelete={onDeleteReply} nested />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

// ─── Moderation status (from content reports) ──────────────────────────────

const REASON_LABEL = (value) => String(value || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// The report list endpoint can't filter by content id, so this loads the most
// recent 100 reports of the type and matches the id here.
export const ModerationPanel = ({ contentType, contentId }) => {
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const [state, setState] = useState({ status: 'idle', reports: [] });

  useEffect(() => {
    if (!token || !contentId) return undefined;
    let cancelled = false;
    setState({ status: 'loading', reports: [] });
    fetch(`${API_BASE_WITH_PATH}/content-reports/admin?content_type=${contentType}&limit=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) throw new Error();
        const reports = (Array.isArray(json?.reports) ? json.reports : [])
          .filter((r) => String(r.content_id?._id || r.content_id || '') === String(contentId));
        setState({ status: 'succeeded', reports });
      })
      .catch(() => { if (!cancelled) setState({ status: 'failed', reports: [] }); });
    return () => { cancelled = true; };
  }, [token, contentType, contentId]);

  const pending = state.reports.filter((r) => r.status === 'pending');
  const actioned = state.reports.filter((r) => r.status === 'action_taken');
  const latest = state.reports[0];
  const reasons = state.reports.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {});
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0];
  const flagged = pending.length > 0;

  return (
    <Panel title="Moderation Status" actions={flagged ? <ShieldAlert className="h-4 w-4 text-[#C81345]" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}>
      {state.status === 'loading' ? (
        <div className="h-16 animate-pulse rounded-xl bg-neutral-100" />
      ) : state.status === 'failed' ? (
        <p className="rounded-xl bg-neutral-50 px-3 py-3 text-[12.5px] text-neutral-500">Reports couldn't be loaded.</p>
      ) : (
        <div className={clsx('flex items-center gap-3 rounded-xl p-3', flagged ? 'bg-rose-50' : 'bg-[#F1F3FC]')}>
          <span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', flagged ? 'bg-rose-100 text-rose-600' : 'bg-white text-[#C81345] shadow-sm')}>
            {flagged ? <ShieldAlert className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-neutral-900">{flagged ? 'Needs review' : 'Safe for Platform'}</p>
            <p className="text-[11.5px] text-neutral-500">{flagged ? `${pending.length} open report${pending.length === 1 ? '' : 's'} awaiting a decision` : 'No open user reports'}</p>
          </div>
        </div>
      )}
      <dl className="mt-3 divide-y divide-neutral-100">
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Flag status</dt>
          <dd className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-neutral-900">
            <span className={clsx('h-1.5 w-1.5 rounded-full', flagged ? 'bg-rose-500' : 'bg-emerald-500')} />
            {pending.length} Active Report{pending.length === 1 ? '' : 's'}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Total reports</dt>
          <dd className="text-[12.5px] font-bold text-neutral-900">{state.reports.length}{actioned.length ? ` · ${actioned.length} actioned` : ''}</dd>
        </div>
        {topReason && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Top reason</dt>
            <dd className="text-[12.5px] font-bold text-neutral-900">{REASON_LABEL(topReason)}</dd>
          </div>
        )}
        {latest?.createdAt && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Last reported</dt>
            <dd className="text-[12.5px] font-bold text-neutral-900">{formatRelativeTime(latest.createdAt)}</dd>
          </div>
        )}
      </dl>
      <button type="button" onClick={() => navigate('/reports/content')} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#E9EBFA] text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)]">
        <History className="h-4 w-4" /> View Report History
      </button>
    </Panel>
  );
};

// ─── Shared number formatting for tiles ────────────────────────────────────

export const ratio = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);
export const pctLabel = (value, suffix) => (value === null || !Number.isFinite(value) ? null : `${value.toFixed(1)}% ${suffix}`);
