const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

/** Sends a data-only push to every browser an admin enabled notifications on. */
async function pushToAdmins({ title, body, url, tag }) {
  const db = getFirestore();
  const snap = await db.collection('adminTokens').get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title, body, url, tag },
    webpush: { headers: { Urgency: 'high', TTL: '3600' } },
  });

  // Drop tokens that are no longer valid (browser data cleared, permission revoked, ...).
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') dead.push(tokens[i]);
  });
  await Promise.all(dead.map((t) => db.collection('adminTokens').doc(t).delete()));
}

exports.notifyNewOrder = onDocumentCreated('orders/{id}', (event) => {
  const o = event.data && event.data.data();
  if (!o) return;
  return pushToAdmins({
    title: 'New order',
    body: `${o.name || 'A customer'} · ${o.productName || 'product'}${o.quantity ? ` · ${o.quantity} x ${o.weight || ''}` : ''}`,
    url: '/orders',
    tag: `order-${event.params.id}`,
  });
});

exports.notifyNewMessage = onDocumentCreated('messages/{id}', (event) => {
  const m = event.data && event.data.data();
  if (!m) return;
  return pushToAdmins({
    title: 'New message',
    body: `${m.name || 'Someone'}${m.subject ? `: ${m.subject}` : ''}`,
    url: `/messages/${event.params.id}`,
    tag: `message-${event.params.id}`,
  });
});
