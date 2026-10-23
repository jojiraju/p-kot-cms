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

/** Products are shown on the website unless switched to inactive in the CMS. */
export const isActive = (p) => p?.active !== false;

/** Percentage off (0-100) set on a product; 0 means no discount. Prices are stored undiscounted. */
export const discountPercent = (p) => {
  const n = Number(p?.discountPercent);
  return n > 0 && n < 100 ? n : 0;
};
/** Price after the product's discount, rounded to a whole number. */
export const discounted = (price, p) => Math.round(Number(price) * (1 - discountPercent(p) / 100));

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

/**
 * Prices for an order: { total, original, saved, percent, unit, unitWas }.
 * Orders placed after discounts existed store their own `originalTotal` and `discountPercent`. Older ones
 * don't, so the list price is rebuilt from the product and kept only if its discount reproduces the order total.
 */
export function orderPricing(order, product, weights = []) {
  const total = Number(order.total) || 0;
  const qty = Number(order.quantity) || 1;
  let original = Number(order.originalTotal) || total;
  let percent = Number(order.discountPercent) || 0;
  if (!Number(order.originalTotal) && product && discountPercent(product)) {
    const key = order.currency === 'INR' ? 'priceINR' : 'priceUSD';
    const pack = product.sellBy === 'pack' ? (product.packs || []).find((k) => k.label === order.weight) : null;
    const factor = weights.find((w) => w.label === order.weight)?.value;
    const list = pack ? Number(pack[key]) : factor ? Number(product[key]) * factor : 0;
    if (list > 0 && Math.round(discounted(list, product)) * qty === Math.round(total)) {
      original = list * qty;
      percent = discountPercent(product);
    }
  }
  const saved = Math.max(0, original - total);
  return { total, original, saved, percent: saved ? percent : 0, unit: Number(order.unitPrice) || total / qty, unitWas: original / qty };
}

/**
 * Customers are derived from orders and keyed by phone number. `orders` is newest first (as the
 * collection is), so the first order seen supplies the latest name, address and date.
 */
export function buildCustomers(orders, users = []) {
  const map = new Map();
  orders.forEach((o) => {
    const key = String(o.phone || o.id);
    const c = map.get(key) || { key, phone: o.phone, name: o.name, email: o.email || '', account: false, city: o.city, address: o.address, pincode: o.pincode, orders: [], inr: 0, usd: 0, last: o.createdAt, first: o.createdAt };
    c.orders.push(o);
    c.email = c.email || o.email || '';
    if (o.uid) c.account = true;
    c.first = o.createdAt;
    // Cancelled orders don't count as spend.
    if (o.status !== 'cancelled') (o.currency === 'USD' ? (c.usd += Number(o.total || 0)) : (c.inr += Number(o.total || 0)));
    map.set(key, c);
  });
  const list = [...map.values()];
  // Sign-ups: attach each account to the customer whose orders carry its uid, or list it on its own until it orders.
  const byUid = new Map();
  list.forEach((c) => c.orders.forEach((o) => o.uid && byUid.set(o.uid, c)));
  users.forEach((u) => {
    const c = byUid.get(u.id);
    if (c) {
      c.email = c.email || u.email || '';
      c.phone = c.phone || u.phone || '';
      c.account = true;
    } else {
      list.push({ key: `u:${u.id}`, phone: u.phone || '', name: u.name || u.email || 'Customer', email: u.email || '', account: true, city: '', address: '', pincode: '', orders: [], inr: 0, usd: 0, last: null, first: u.createdAt || null });
    }
  });
  return list;
}
export const fmtSpent = (c) => [c.inr && fmtMoney(c.inr), c.usd && fmtMoney(c.usd, 'USD')].filter(Boolean).join(' + ') || '—';

/**
 * Payment details the website shows customers (UPI and bank), kept in one document: settings/payment.
 * `settings` is null until it has been saved once.
 */
export const PAYMENT_DEFAULTS = { upiId: 'jojirajuvarghese@oksbi', accountName: 'JOJI RAJU VARGHESE', bankName: 'SBI', accountNumber: '67241207811', ifsc: 'SBIN0070710', note: '' };
export function usePaymentSettings() {
  const [state, setState] = useState({ settings: null, loading: true, error: null });
  useEffect(() => onSnapshot(
    doc(db, 'settings', 'payment'),
    (snap) => setState({ settings: snap.exists() ? snap.data() : null, loading: false, error: null }),
    (error) => setState({ settings: null, loading: false, error }),
  ), []);
  return state;
}
export const savePaymentSettings = (data) => setDoc(doc(db, 'settings', 'payment'), { ...data, updatedAt: serverTimestamp() }, { merge: true });

/** The public copy of an order that the website's payment page reads: amount and item, no personal details. */
const paymentCopy = (o) => ({ total: Number(o.total) || 0, currency: o.currency || 'INR', productName: o.productName || '', weight: o.weight || '', quantity: Number(o.quantity) || 1, status: o.status || 'new', paid: !!o.paid });
/** Creates or refreshes it, so orders placed before it existed get one too. */
export const syncPayment = (o) => setDoc(doc(db, 'payments', o.id), { ...paymentCopy(o), updatedAt: serverTimestamp() }, { merge: true });
export const markPaid = (order, paid) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'orders', order.id), { paid, paidAt: paid ? serverTimestamp() : null, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'payments', order.id), { ...paymentCopy(order), paid, updatedAt: serverTimestamp() }, { merge: true });
  return batch.commit();
};
export const deleteOrder = (id) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'orders', id));
  batch.delete(doc(db, 'payments', id));
  return batch.commit();
};

/** Short, readable order number (letters and digits) taken from the order's document id, e.g. PK-9YINODZ1. */
export const orderNo = (id = '') => `PK-${String(id).slice(0, 8).toUpperCase()}`;

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
    tx.set(doc(db, 'payments', orderId), { ...paymentCopy(order), status, updatedAt: serverTimestamp() }, { merge: true });
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
