importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config is duplicated here because service workers can't import .env
// These will be replaced at build time or set manually
firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG_API_KEY || '',
  authDomain: self.__FIREBASE_CONFIG_AUTH_DOMAIN || '',
  projectId: self.__FIREBASE_CONFIG_PROJECT_ID || '',
  storageBucket: self.__FIREBASE_CONFIG_STORAGE_BUCKET || '',
  messagingSenderId: self.__FIREBASE_CONFIG_MESSAGING_SENDER_ID || '',
  appId: self.__FIREBASE_CONFIG_APP_ID || '',
});

const messaging = firebase.messaging();

// Handle background FCM messages
messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = payload?.notification?.title || 'New Support Query';
  const body = payload?.notification?.body || data.message || '';

  self.registration.showNotification(title, {
    body,
    icon: '/bsmart_logo.png',
    badge: '/bsmart_logo.png',
    data: { link: data.link || '/customer-queries' },
  });
});

// Navigate to the query when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/customer-queries';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'FCM_NAVIGATE', link });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(self.location.origin + link);
    })
  );
});
