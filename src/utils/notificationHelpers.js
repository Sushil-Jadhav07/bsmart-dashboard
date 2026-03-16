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
    payout: '💳',
    admin: '🛡️'
  }
  return icons[type] || '🔔'
}

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
