// Drop this into the storefront (p-kot-spices/src/lib/pkotCms.js) and `npm i firebase` there.
// Use the SAME Firebase project as the CMS. Add the NEXT_PUBLIC_FIREBASE_* vars to the storefront's .env.local.
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const app = getApps()[0] || initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

/**
 * Call from checkout (and BuyNowModal) right before opening WhatsApp:
 *   await saveOrder({ product, weight, quantity, currency, total, ...formData });
 */
export const saveOrder = ({ product, weight, quantity, currency, total, name, phone, address, city, pincode }) =>
  addDoc(collection(db, 'orders'), {
    productId: product.id,
    productName: product.name,
    weight,
    quantity,
    currency,
    total: Number(String(total).replace(/,/g, '')),
    name, phone, address, city, pincode,
    status: 'new',
    createdAt: serverTimestamp(),
  });

/** Call from the contact form's handleSubmit: await saveMessage(formState); */
export const saveMessage = ({ name, email, subject, message }) =>
  addDoc(collection(db, 'messages'), { name, email, subject, message, status: 'pending', createdAt: serverTimestamp() });
