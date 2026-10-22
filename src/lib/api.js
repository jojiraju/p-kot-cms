import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, orderBy, query, updateDoc, deleteDoc, setDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/** Live-subscribe to a collection (newest first when it has createdAt). */
export function useCollection(name, { sortByCreated = true } = {}) {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  useEffect(() => {
    const ref = collection(db, name);
    const q = sortByCreated ? query(ref, orderBy('createdAt', 'desc')) : ref;
    return onSnapshot(
      q,
      (snap) => setState({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => setState({ items: [], loading: false, error }),
    );
  }, [name, sortByCreated]);
  return state;
}

export const updateItem = (col, id, data) => updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() });
export const removeItem = (col, id) => deleteDoc(doc(db, col, id));
export const saveProduct = (id, data) =>
  setDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });

export async function seedProducts(products) {
  const batch = writeBatch(db);
  products.forEach((p) =>
    batch.set(doc(db, 'products', p.id), { ...p, inStock: true, createdAt: serverTimestamp() }, { merge: true }),
  );
  await batch.commit();
}

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
export const MESSAGE_STATUSES = ['unread', 'read', 'replied'];

export const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);
export const fmtDate = (ts) =>
  toDate(ts)?.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '—';
export const fmtMoney = (n, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(Number(n) || 0);

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
