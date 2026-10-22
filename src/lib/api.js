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

export const slugify = (t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const addCategories = (names) => {
  const batch = writeBatch(db);
  names.forEach((name) => batch.set(doc(db, 'categories', slugify(name)), { name, createdAt: serverTimestamp() }, { merge: true }));
  return batch.commit();
};

/** Rename a category and re-point every product that uses it. */
export async function renameCategory(oldId, oldName, newName, products, description = '') {
  const batch = writeBatch(db);
  const newId = slugify(newName);
  if (newId !== oldId) batch.delete(doc(db, 'categories', oldId));
  batch.set(doc(db, 'categories', newId), { name: newName, description, updatedAt: serverTimestamp() }, { merge: true });
  products.filter((p) => p.category === oldName).forEach((p) => batch.update(doc(db, 'products', p.id), { category: newName }));
  await batch.commit();
}

export const saveCategory = (name, description) =>
  setDoc(doc(db, 'categories', slugify(name)), { name, description, createdAt: serverTimestamp() }, { merge: true });

/** Quantity options. Product prices are per kg, so `value` is the share of a kg (250 g -> 0.25). */
export const quantityValue = (amount, unit) => Math.round((unit === 'g' ? Number(amount) / 1000 : Number(amount)) * 10000) / 10000;
export const quantityLabel = (amount, unit) => `${Number(amount)}${unit}`;
export const DEFAULT_QUANTITIES = [[100, 'g'], [250, 'g'], [500, 'g'], [1, 'kg'], [5, 'kg']];

export const saveQuantity = (amount, unit) => {
  const label = quantityLabel(amount, unit);
  return setDoc(doc(db, 'quantities', slugify(label)), { label, amount: Number(amount), unit, value: quantityValue(amount, unit), createdAt: serverTimestamp() }, { merge: true });
};
/** Change an existing option; the label is the document id, so a changed size moves to a new document. */
export const replaceQuantity = async (oldId, amount, unit) => {
  const label = quantityLabel(amount, unit);
  const newId = slugify(label);
  const batch = writeBatch(db);
  if (newId !== oldId) batch.delete(doc(db, 'quantities', oldId));
  batch.set(doc(db, 'quantities', newId), { label, amount: Number(amount), unit, value: quantityValue(amount, unit), createdAt: serverTimestamp() }, { merge: true });
  await batch.commit();
};
export const seedQuantities = () => {
  const batch = writeBatch(db);
  DEFAULT_QUANTITIES.forEach(([amount, unit]) => {
    const label = quantityLabel(amount, unit);
    batch.set(doc(db, 'quantities', slugify(label)), { label, amount, unit, value: quantityValue(amount, unit), createdAt: serverTimestamp() }, { merge: true });
  });
  return batch.commit();
};

export const errMessage = (e) =>
  e?.code === 'permission-denied' ? 'Permission denied: publish the latest firestore.rules in the Firebase console, and make sure you are logged in as an admin.' : e?.message || 'Something went wrong.';

export async function seedProducts(products) {
  const batch = writeBatch(db);
  products.forEach((p) =>
    batch.set(doc(db, 'products', p.id), { ...p, inStock: true, createdAt: serverTimestamp() }, { merge: true }),
  );
  await batch.commit();
}

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
export const MESSAGE_STATUSES = ['pending', 'resolved'];
// Older messages were stored as unread/read/replied; treat replied as resolved and the rest as pending.
export const messageStatus = (m) => (m?.status === 'resolved' || m?.status === 'replied' ? 'resolved' : 'pending');

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
