/* Firebase Cloud Messaging service worker: shows push notifications when the CMS tab is closed.
   The web config is passed in the registration URL (see src/lib/push.js). */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});
const messaging = firebase.messaging();

// The Cloud Function sends data-only messages, so we draw the notification ourselves.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  self.registration.showNotification(d.title || 'P-KOT Spices', {
    body: d.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) return open.focus().then((c) => c.navigate(url));
      return clients.openWindow(url);
    }),
  );
});
