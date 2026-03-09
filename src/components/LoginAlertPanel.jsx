import React from 'react'
import { useSelector } from 'react-redux'
import { clsx } from 'clsx'
import { formatNotifTime } from '../utils/notificationHelpers.js'
import Card, { CardHeader, CardTitle, CardDescription } from './Card.jsx'

const LoginAlertPanel = () => {
  const items = useSelector((s) => s.notifications.items)
  const loginAlerts = items.filter(n => n.type === 'login_alert').slice(0, 8)

  if (loginAlerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔐</span>
          <div>
            <CardTitle>Recent Logins</CardTitle>
            <CardDescription>Live admin login alerts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <div className="space-y-0">
        {loginAlerts.map((alert) => (
          <div
            key={alert._id}
            className={clsx(
              'flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0',
            )}
          >
            <div className="flex items-center gap-2">
              {!alert.isRead && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
              <span className={clsx(
                'text-sm text-neutral-700',
                !alert.isRead && 'font-medium'
              )}>
                {alert.message}
              </span>
            </div>
            <span className="text-xs text-neutral-400 flex-shrink-0 ml-3">
              {formatNotifTime(alert.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default LoginAlertPanel
