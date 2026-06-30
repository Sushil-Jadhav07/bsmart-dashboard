import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { API_BASE_WITH_PATH } from './apiBase.js'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let messaging = null

const isConfigured = Object.values(firebaseConfig).every(Boolean)

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  messaging = getMessaging(app)
}

/** Get FCM token and register it with the backend */
export const registerFCMToken = async (authToken) => {
  if (!messaging) return null
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    const fcmToken = await getToken(messaging, vapidKey ? { vapidKey } : {})
    if (!fcmToken) return null

    await fetch(`${API_BASE_WITH_PATH}/users/fcm-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: fcmToken }),
    })

    return fcmToken
  } catch (e) {
    console.warn('[FCM] Failed to register token:', e.message)
    return null
  }
}

/**
 * Listen for foreground FCM messages.
 * onNotification(payload) is called with the message data.
 * Returns an unsubscribe function.
 */
export const onFCMMessage = (onNotification) => {
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    const data = payload?.data || {}
    onNotification(data)
  })
}

export { messaging }
