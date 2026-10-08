export const getNotificationIcon = (type) => {
  const icons = {
    like: '❤️',
    comment: '💬',
    comment_like: '👍',
    comment_reply: '↩️',
    follow: '👤',
    mention: '@️',
    post_save: '🔖',
    post_tag: '🏷️',
    ad_comment: '💬',
    ad_like: '❤️',
    ad_approved: '✅',
    ad_rejected: '❌',
    vendor_approved: '✅',
    vendor_rejected: '❌',
    coins_credited: '💰',
    coins_debited: '💸',
    story_view: '👁️',
    login_alert: '🔐',
    order: '📦',
    order_placed: '🛍️',
    order_seller_new: '📦',
    order_status: '🚚',
    order_cancelled: '❌',
    order_refunded: '💰',
    order_payment_failed: '⚠️',
    order_refund_pending: '⏳',
    order_refund_failed: '🚨',
    payout: '💳',
    admin: '🛡️'
  }
  return icons[type] || '🔔'
}

// Backend notification links are written for the apps or an older admin panel;
// map the ones that have a page here. Returns null when there's nowhere to go.
const LINK_RULES = [
  [/^\/admin\/content-reports/, () => '/reports/content'],
  [/^\/admin\/bug-reports/, () => '/reports/bugs'],
  [/^\/admin\/gift-card-orders/, () => '/gift-card-orders'],
  [/^\/admin\/support-queries\/([a-f0-9]{24})/, (m) => `/customer-queries/${m[1]}`],
  [/^\/admin\/support-queries/, () => '/customer-queries'],
  [/^\/admin\/users\/([a-f0-9]{24})/, (m) => `/users/${m[1]}`],
  [/^\/ads\/([a-f0-9]{24})/, (m) => `/ads/${m[1]}`],
  [/^\/posts\/([a-f0-9]{24})/, (m) => `/posts/${m[1]}`],
  [/^\/tweets\/([a-f0-9]{24})/, (m) => `/tweets/${m[1]}`],
  [/^\/promote-reels\/([a-f0-9]{24})/, (m) => `/promote/${m[1]}`],
  [/^\/profile\/([a-f0-9]{24})/, (m) => `/users/${m[1]}`],
]
export const dashboardPathFor = (link) => {
  if (typeof link !== 'string') return null
  for (const [re, to] of LINK_RULES) {
    const m = link.match(re)
    if (m) return to(m)
  }
  return null
}

export const NOTIFICATION_GROUPS = {
  orders: { label: 'Orders & Refunds', match: (t) => t.startsWith('order') || t.startsWith('gift_card_order') || t === 'payout' },
  safety: { label: 'Reports & Safety', match: (t) => t.startsWith('content_') || t.startsWith('bug_report') },
  support: { label: 'Support', match: (t) => t.startsWith('support_') },
  vault: { label: 'Vault & Coins', match: (t) => t.startsWith('coins_') },
  account: { label: 'Accounts & Security', match: (t) => t === 'login_alert' || t.startsWith('vendor_') || t.startsWith('subscription_') || t === 'admin' },
  social: { label: 'Social activity', match: () => true },
}
export const groupOf = (type) => Object.entries(NOTIFICATION_GROUPS).find(([, g]) => g.match(String(type || '')))?.[0] || 'social'

export const CRITICAL_TYPES = new Set(['order_refund_failed', 'order_payment_failed'])
// Alerts that point at something still waiting on staff.
export const ACTION_TYPES = new Set(['order_refund_failed', 'order_refund_pending', 'content_report_admin', 'bug_report_admin', 'support_query', 'support_assign', 'gift_card_order_admin'])

const NOTIFICATION_LABELS = {
  content_report_admin: 'New content report',
  content_report_status: 'Report update',
  content_moderation_action: 'Moderation action',
  bug_report_admin: 'New bug report',
  bug_report_status: 'Bug report update',
  support_query: 'New support query',
  support_reply: 'Support reply',
  support_status: 'Support status',
  support_assign: 'Ticket assigned',
  gift_card_order_admin: 'New gift card order',
  gift_card_order: 'Gift card order',
  login_alert: 'Login alert',
  coins_credited: 'Coins credited',
  coins_debited: 'Coins debited',
  vendor_approved: 'Vendor approved',
  vendor_rejected: 'Vendor rejected',
  subscription_expiring: 'Subscription expiring',
  subscription_expired: 'Subscription expired',
  order_placed: 'Order placed',
  order_seller_new: 'New order',
  order_status: 'Order update',
  order_cancelled: 'Order cancelled',
  order_refunded: 'Refund processed',
  order_payment_failed: 'Payment failed',
  order_refund_pending: 'Refund pending',
  order_refund_failed: 'Refund failed',
}

export const getNotificationLabel = (type) =>
  NOTIFICATION_LABELS[type] || String(type || 'system').replace(/_/g, ' ')

export const getNotificationDotColor = (type) => {
  const colors = {
    like: 'bg-red-500',
    ad_like: 'bg-red-500',
    comment: 'bg-blue-500',
    comment_like: 'bg-blue-400',
    comment_reply: 'bg-blue-500',
    ad_comment: 'bg-blue-500',
    follow: 'bg-purple-500',
    post_save: 'bg-yellow-500',
    post_tag: 'bg-indigo-500',
    ad_approved: 'bg-green-500',
    vendor_approved: 'bg-green-500',
    ad_rejected: 'bg-red-600',
    vendor_rejected: 'bg-red-600',
    coins_credited: 'bg-green-500',
    coins_debited: 'bg-orange-500',
    story_view: 'bg-cyan-500',
    login_alert: 'bg-neutral-500',
    order: 'bg-teal-500',
    order_placed: 'bg-green-500',
    order_seller_new: 'bg-blue-500',
    order_status: 'bg-purple-500',
    order_cancelled: 'bg-red-600',
    order_refunded: 'bg-green-500',
    order_payment_failed: 'bg-red-600',
    order_refund_pending: 'bg-amber-500',
    order_refund_failed: 'bg-red-600',
    payout: 'bg-emerald-500',
    admin: 'bg-neutral-600'
  }
  return colors[type] || 'bg-primary'
}

export const formatNotifTime = (createdAt) => {
  const now = new Date()
  const then = new Date(createdAt)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}
