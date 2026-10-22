import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db, auth } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const pushSupported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

// The service worker cannot read Vite env vars, so the public web config travels in its URL.
const swUrl = () =>
  '/firebase-messaging-sw.js?' +
  new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  });

/** Registers this browser for push and stores its token so the Cloud Function can reach it. Returns the token or null. */
export async function registerPushToken() {
  if (!VAPID_KEY || !pushSupported() || !(await isSupported())) return null;
  const registration = await navigator.serviceWorker.register(swUrl());
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return null;
  await setDoc(doc(db, 'adminTokens', token), {
    token,
    uid: auth.currentUser?.uid || null,
    userAgent: navigator.userAgent.slice(0, 200),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return token;
}

/**
 * Asks for permission (must be called from a click) and registers for push.
 * Resolves { permission, push } where push says whether closed-tab push is active.
 */
export async function enableNotifications() {
  if (!pushSupported()) return { permission: 'unsupported', push: false };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, push: false };
  let push = false;
  try { push = Boolean(await registerPushToken()); } catch { /* live alerts still work */ }
  return { permission, push };
}
