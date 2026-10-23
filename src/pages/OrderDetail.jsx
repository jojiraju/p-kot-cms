import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, ClipboardList, Wallet, PackageCheck, MessageCircle, Phone, Trash2, Truck, ThumbsUp } from 'lucide-react';
import { useCollection, updateItem, deleteOrder, setOrderStatus, orderNo, orderPricing, usePaymentSettings, markPaid, syncPayment, fmtDate, fmtMoney, DEFAULT_QUANTITIES, quantityLabel, quantityValue, ORDER_STATUSES } from '../lib/api';
import { PageHead, DataState, Select, Field, ConfirmModal } from '../components/ui';
import { notify } from '../lib/notify';

// Progress shown above the order; cancelled orders get their own banner instead.
const STEPS = ORDER_STATUSES.filter((s) => s !== 'cancelled');
// What the customer is told for each status; sent by the admin through WhatsApp.
const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');

const STATUS_LINE = {
  new: 'we have received your order and will confirm it shortly.',
  confirmed: 'your order has been confirmed and is being prepared.',
  shipped: 'your order has been shipped and is on its way to you.',
  delivered: 'your order has been delivered. We hope you enjoy it!',
  cancelled: 'your order has been cancelled. Please contact us if you have any questions.',
};
const STEP_ICON = { new: ClipboardList, confirmed: ThumbsUp, shipped: Truck, delivered: PackageCheck };

export default function OrderDetail() {
  const { id } = useParams();
  const { items, loading, error } = useCollection('orders');
  const o = items.find((x) => x.id === id);

  return (
    <>
      <PageHead title="Order" subtitle={o ? `${orderNo(o.id)} · ${o.name}` : undefined}>
        <Link to="/orders" className="btn"><ArrowLeft size={16} /> Back to orders</Link>
      </PageHead>

      <DataState loading={loading} error={error}>
        {!o ? <div className="card empty">Order not found.</div> : <OrderView key={o.id} o={o} />}
      </DataState>
    </>
  );
}

function OrderView({ o }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(o.notes || '');
  const [confirmDel, setConfirmDel] = useState(false);
  // The status the admin just picked, while the stock-adjusting update is still running.
  const [pending, setPending] = useState(null);
  // Admin's edits to the customer message; null means use the generated text for the current status.
  const [custom, setCustom] = useState(null);

  const money = (n) => fmtMoney(n, o.currency);
  const qty = Number(o.quantity) || 1;
  const product = useCollection('products', { sortByCreated: false }).items.find((p) => p.id === o.productId);
  const cmsWeights = useCollection('quantities', { sortByCreated: false }).items;
  const weights = (cmsWeights.length ? cmsWeights : DEFAULT_QUANTITIES.map(([a, u]) => ({ label: quantityLabel(a, u), value: quantityValue(a, u) }))).map((w) => ({ label: w.label, value: Number(w.value) }));
  const { total, original, saved, percent, unit, unitWas } = orderPricing(o, product, weights);
  const phoneDigits = String(o.phone || '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1');
  const shown = pending || o.status;
  const stepAt = STEPS.indexOf(shown);

  const changeStatus = async (v) => {
    if (v === o.status || pending) return;
    setPending(v);
    // On success keep showing the picked status until the live order catches up (see the effect below), so it never flips back.
    if (!(await notify(setOrderStatus(o.id, v), `Order marked ${v}`))) setPending(null);
  };
  useEffect(() => { if (pending && o.status === pending) setPending(null); }, [o.status, pending]);

  const defaultMsg = [
    `Hi ${o.name}, ${STATUS_LINE[o.status] || STATUS_LINE.new}`,
    '',
    `Order: ${orderNo(o.id)}`,
    `Item: ${o.productName} (${qty} × ${o.weight})`,
    `Total: ${money(total)}`,
    '',
    'Thank you for shopping with P-KOT Spices.',
  ].join('\n');
  const message = custom ?? defaultMsg;
  useEffect(() => { setCustom(null); }, [o.status]);

  const { settings: pay } = usePaymentSettings();
  // Make sure the website's payment page has a public copy of this order (older orders never got one).
  useEffect(() => { syncPayment(o).catch(() => {}); }, [o.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const payLink = SITE ? `${SITE}/pay/${o.id}` : '';
  const bank = pay?.accountNumber ? [`Bank: ${pay.bankName || ''}`.trim(), `A/C name: ${pay.accountName}`, `A/C no: ${pay.accountNumber}`, `IFSC: ${pay.ifsc}`] : [];
  const payMsg = pay ? [
    `Hi ${o.name}, thank you for your order ${orderNo(o.id)}.`,
    '',
    `*Amount to pay: ${money(total)}*`,
    '',
    `UPI ID: ${pay.upiId}`,
    ...(bank.length ? ['', ...bank] : []),
    ...(payLink ? ['', `Pay with QR code: ${payLink}`] : []),
    '',
    pay.note || 'After paying, please send the payment screenshot here.',
  ].join('\n') : '';
  const togglePaid = async () => {
    if (pending) return;
    setPending('paid');
    await notify(markPaid(o, !o.paid), o.paid ? 'Marked as unpaid' : 'Marked as paid');
    setPending(null);
  };

  const remove = async () => {
    setConfirmDel(false);
    // Put any held stock back on the shelf before the order disappears.
    const run = async () => { if (o.stockDeducted) await setOrderStatus(o.id, 'cancelled'); await deleteOrder(o.id); };
    if (await notify(run(), 'Order deleted')) navigate('/orders');
  };

  return (
    <div className="msg-page">
      {pending && (
        <div className="page-busy" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Updating order…</span>
        </div>
      )}
      <div className="od-main">
        <section className="card">
          <div className="od-head">
            <div>
              <h2 className="od-no">{orderNo(o.id)}</h2>
              <span className="od-date"><CalendarDays size={15} /> Placed {fmtDate(o.createdAt)}</span>
            </div>
            <div className="msg-status">
              <Select
                compact
                isSearchable={false}
                options={ORDER_STATUSES}
                value={shown}
                onChange={changeStatus}
                isDisabled={!!pending}
              />
            </div>
          </div>
          {shown === 'cancelled' ? (
            <div className="od-cancelled">This order was cancelled. Any stock it held goes back to the product.</div>
          ) : (
            <div className="od-steps">
              {STEPS.map((s, i) => {
                const Icon = STEP_ICON[s];
                const state = i < stepAt ? 'done' : i === stepAt ? 'current' : '';
                return (
                  <div key={s} className={`od-step ${state}`}>
                    <span className="od-dot">{i < stepAt ? <Check size={18} /> : <Icon size={18} />}</span>
                    <span className="od-step-name">{s}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="od-head">
            <h3>Payment</h3>
            <span className={`od-paid ${o.paid ? 'yes' : ''}`}>{o.paid ? 'Paid' : 'Not paid'}</span>
          </div>
          {pay ? (
            <p className="muted od-note">Send the customer your UPI and bank details{payLink ? ', with a link to a page showing the QR code for this amount' : ''}.</p>
          ) : (
            <p className="muted od-note">Payment details are not set up yet. <Link to="/settings/payment">Add them in Settings → Payment</Link>.</p>
          )}
          {pay && !payLink && <p className="muted od-note">Set VITE_SITE_URL to include the QR payment page link in the message.</p>}
          <div className="drawer-actions">
            <a className={`btn primary ${pay ? '' : 'disabled'}`} target="_blank" rel="noreferrer" href={pay ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(payMsg)}` : undefined} aria-disabled={!pay}>
              <Wallet size={16} /> Send payment details
            </a>
            <button type="button" className="btn" onClick={togglePaid}>{o.paid ? 'Mark as unpaid' : 'Mark as paid'}</button>
          </div>
        </section>

        <section className="card">
          <h3>Notify customer</h3>
          <p className="muted od-note">Message for the current status ({o.status}). Edit it if you like, then send it from your WhatsApp.</p>
          <textarea rows="7" value={message} onChange={(e) => setCustom(e.target.value)} />
          <div className="drawer-actions">
            <a className="btn primary" target="_blank" rel="noreferrer" href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`}>
              <MessageCircle size={16} /> Send on WhatsApp
            </a>
            {custom !== null && <button type="button" className="btn" onClick={() => setCustom(null)}>Reset message</button>}
          </div>
        </section>

        <section className="card">
          <h3>Order items</h3>
          <table className="od-items">
            <thead><tr><th>Product</th><th>Size</th><th className="r">Qty</th><th className="r">Price</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>{o.productName}</strong></td>
                <td>{o.weight}</td>
                <td className="r">{qty}</td>
                <td className="r">
                  {saved > 0 && <s>{money(unitWas)}</s>}
                  <b>{money(unit)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="od-sum">
            <div><span>Subtotal</span><span>{money(original)}</span></div>
            {saved > 0 && (
              <div className="save">
                <span>Discount{percent > 0 && <span className="od-off">{percent}% off</span>}</span>
                <span>-{money(saved)}</span>
              </div>
            )}
            <div><span>Shipping</span><span>Free</span></div>
            <div className="grand"><span>Total</span><span>{money(total)}</span></div>
          </div>
        </section>

        <section className="card">
          <h3>Internal notes</h3>
          <Field label="Only visible in the CMS">
            <textarea rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment received, courier tracking…" />
          </Field>
          <div className="drawer-actions">
            <button className="btn primary" onClick={() => notify(updateItem('orders', o.id, { notes }), 'Notes saved')}>Save notes</button>
          </div>
        </section>
      </div>

      <aside className="od-side">
        <section className="card">
          <h3>Customer</h3>
          <div className="od-cust">
            <div className="avatar">{o.name?.[0]?.toUpperCase()}</div>
            <div><strong>{o.name}</strong><a href={`tel:${o.phone}`}>{o.phone}</a></div>
          </div>
          <div className="od-contact">
            <a className="btn" href={`tel:${o.phone}`}><Phone size={16} /> Call</a>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${phoneDigits}`}><MessageCircle size={16} /> WhatsApp</a>
          </div>
        </section>

        <section className="card">
          <h3>Delivery address</h3>
          <dl className="od-rows">
            <dt>Address</dt><dd>{o.address || '—'}</dd>
            <dt>City</dt><dd>{o.city || '—'}</dd>
            <dt>Pincode</dt><dd>{o.pincode || '—'}</dd>
            <dt>Phone</dt><dd><a href={`tel:${o.phone}`}>{o.phone}</a></dd>
            {o.email && <><dt>Email</dt><dd><a href={`mailto:${o.email}`}>{o.email}</a></dd></>}
          </dl>
        </section>

        <section className="card">
          <h3>Order info</h3>
          <dl className="od-rows">
            <dt>Order no.</dt><dd>{orderNo(o.id)}</dd>
            <dt>Placed</dt><dd>{fmtDate(o.createdAt)}</dd>
            <dt>Currency</dt><dd>{o.currency}</dd>
            <dt>Stock held</dt><dd>{o.stockDeducted ? `${o.stockDeducted} pack${o.stockDeducted === 1 ? '' : 's'}` : 'No'}</dd>
          </dl>
          <button className="btn danger" style={{ marginTop: 16 }} onClick={() => setConfirmDel(true)}><Trash2 size={16} /> Delete order</button>
        </section>
      </aside>

      <ConfirmModal
        open={confirmDel}
        title="Delete order?"
        message="This order will be permanently removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  );
}
