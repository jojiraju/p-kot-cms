import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, orderBy, query, updateDoc, deleteDoc, setDoc, writeBatch, runTransaction, serverTimestamp,
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

/**
 * Stock is a packet count per size. Weight products (priced per kg) keep it in `weightStock`
 * ({ '400g': 12 }), fixed-pack products on each `packs[i].stock`. A size without a number is untracked.
 */
export const LOW_STOCK = 5;
/** [{ label, stock }] for every size whose packets are counted. */
export const trackedSizes = (p) => {
  const rows = p?.sellBy === 'pack'
    ? (p.packs || []).map((k) => [k.label, k.stock])
    : Object.entries(p?.weightStock || {});
  return rows.filter(([, n]) => typeof n === 'number').map(([label, stock]) => ({ label, stock }));
};
/** True while at least one size can still be ordered (untracked sizes count as available). */
const anySizeLeft = (stocks) => stocks.length === 0 || stocks.some((n) => typeof n !== 'number' || n > 0);
/** 'out' | 'low' | 'in' for a product. */
export const stockState = (p) => {
  if (p?.inStock === false) return 'out';
  const sizes = trackedSizes(p);
  if (!sizes.length) return 'in';
  const all = p.sellBy === 'pack' ? (p.packs || []).map((k) => k.stock) : Object.values(p.weightStock || {});
  if (!anySizeLeft(all)) return 'out';
  return sizes.some((z) => z.stock <= LOW_STOCK) ? 'low' : 'in';
};

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
// Stock is held once an order is confirmed, and released when it goes back to new or is cancelled.
const HOLDS_STOCK = new Set(['confirmed', 'shipped', 'delivered']);

/**
 * Where an order's stock lives: the packet count for the size ordered. Returns { tracked: false } when that
 * size isn't counted.
 */
function stockTarget(product, order) {
  if (!product) return { tracked: false };
  const need = Number(order.quantity) || 0;
  const what = `${product.name} ${order.weight}`;
  const fmt = (n) => `${n} pack${n === 1 ? '' : 's'}`;
  if (product.sellBy === 'pack') {
    const packs = product.packs || [];
    const i = packs.findIndex((k) => k.label === order.weight);
    if (i < 0 || typeof packs[i].stock !== 'number') return { tracked: false };
    return {
      tracked: true, need, avail: packs[i].stock, what, fmt,
      patch: (next, restoring) => {
        const np = packs.map((k, j) => (j === i ? { ...k, stock: next } : k));
        return { packs: np, inStock: anySizeLeft(np.map((k) => k.stock)) && (restoring || product.inStock !== false) };
      },
    };
  }
  const counts = product.weightStock || {};
  if (typeof counts[order.weight] !== 'number') return { tracked: false };
  return {
    tracked: true, need, avail: counts[order.weight], what, fmt,
    patch: (next, restoring) => {
      const nc = { ...counts, [order.weight]: next };
      return { weightStock: nc, inStock: anySizeLeft(Object.values(nc)) && (restoring || product.inStock !== false) };
    },
  };
}

/**
 * Change an order's status and adjust product stock in one transaction, so two admins (or two tabs)
 * can never double-deduct or oversell. `stockDeducted` on the order records what was taken.
 */
export function setOrderStatus(orderId, status) {
  return runTransaction(db, async (tx) => {
    const orderRef = doc(db, 'orders', orderId);
    const order = (await tx.get(orderRef)).data();
    if (!order) throw new Error('Order no longer exists.');

    const productId = order.productId || slugify(order.productName || '');
    const productRef = productId ? doc(db, 'products', productId) : null;
    const productSnap = productRef ? await tx.get(productRef) : null;
    const target = stockTarget(productSnap?.exists() ? productSnap.data() : null, order);

    const patch = { status, updatedAt: serverTimestamp() };
    const wantHold = HOLDS_STOCK.has(status);
    if (target.tracked && target.need > 0 && wantHold && !order.stockDeducted) {
      if (target.avail < target.need) {
        throw new Error(`Only ${target.fmt(target.avail)} of ${target.what} left; this order needs ${target.fmt(target.need)}.`);
      }
      tx.update(productRef, { ...target.patch(target.avail - target.need, false), updatedAt: serverTimestamp() });
      patch.stockDeducted = target.need;
    } else if (target.tracked && !wantHold && order.stockDeducted) {
      tx.update(productRef, { ...target.patch(target.avail + order.stockDeducted, true), updatedAt: serverTimestamp() });
      patch.stockDeducted = 0;
    }
    tx.update(orderRef, patch);
  });
}

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
