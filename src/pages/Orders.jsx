import { useMemo, useState } from 'react';
import { Download, Trash2, MessageCircle } from 'lucide-react';
import { useCollection, updateItem, removeItem, setOrderStatus, fmtDate, fmtMoney, downloadCsv, ORDER_STATUSES } from '../lib/api';
import { PageHead, SearchBox, Chips, Drawer, StatusBadge, DataState, Empty, Field, ConfirmModal } from '../components/ui';
import { notify } from '../lib/notify';

export default function Orders() {
  const { items, loading, error } = useCollection('orders');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const counts = useMemo(() => {
    const c = { all: items.length };
    ORDER_STATUSES.forEach((s) => (c[s] = items.filter((o) => o.status === s).length));
    return c;
  }, [items]);

  const rows = items.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    const hay = `${o.name} ${o.phone} ${o.productName} ${o.city} ${o.id}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const selected = items.find((o) => o.id === selectedId);

  const open = (o) => { setSelectedId(o.id); setNotes(o.notes || ''); };
  const exportCsv = () =>
    downloadCsv('orders.csv', rows.map((o) => ({
      id: o.id, date: fmtDate(o.createdAt), status: o.status, customer: o.name, phone: o.phone,
      product: o.productName, weight: o.weight, quantity: o.quantity, total: o.total, currency: o.currency,
      address: o.address, city: o.city, pincode: o.pincode, notes: o.notes,
    })));
  const remove = async () => {
    setConfirmDel(false);
    const { id, stockDeducted } = selected;
    // Put any held stock back on the shelf before the order disappears.
    const run = async () => { if (stockDeducted) await setOrderStatus(id, 'cancelled'); await removeItem('orders', id); };
    if (await notify(run(), 'Order deleted')) setSelectedId(null);
  };

  return (
    <>
      <PageHead title="Orders" subtitle="Track and fulfil orders placed from the storefront.">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, product…" />
        <button className="btn" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </PageHead>
      <Chips options={['all', ...ORDER_STATUSES]} value={filter} onChange={setFilter} counts={counts} />

      <DataState loading={loading} error={error}>
        <div className="card table-card">
          {rows.length === 0 ? <Empty text="No orders match." /> : (
            <table>
              <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} onClick={() => open(o)}>
                    <td data-label="Date">{fmtDate(o.createdAt)}</td>
                    <td data-label="Customer"><strong>{o.name}</strong><small>{o.phone}</small></td>
                    <td data-label="Product">{o.productName}</td>
                    <td data-label="Qty">{o.quantity} × {o.weight}</td>
                    <td data-label="Total"><b>{fmtMoney(o.total, o.currency)}</b></td>
                    <td data-label="Status"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DataState>

      <Drawer open={!!selected} title="Order details" onClose={() => setSelectedId(null)}>
        {selected && (
          <>
            <div className="detail-top">
              <StatusBadge status={selected.status} />
              <small className="muted">#{selected.id.slice(0, 8)} · {fmtDate(selected.createdAt)}</small>
            </div>
            <dl className="details">
              <dt>Product</dt><dd>{selected.productName}</dd>
              <dt>Quantity</dt><dd>{selected.quantity} × {selected.weight}</dd>
              <dt>Total</dt><dd><b>{fmtMoney(selected.total, selected.currency)}</b></dd>
              <dt>Customer</dt><dd>{selected.name}</dd>
              <dt>Phone</dt><dd><a href={`tel:${selected.phone}`}>{selected.phone}</a></dd>
              <dt>Address</dt><dd>{selected.address}, {selected.city} - {selected.pincode}</dd>
            </dl>
            <Field label="Status">
              <select value={selected.status} onChange={(e) => notify(setOrderStatus(selected.id, e.target.value), `Order marked ${e.target.value}`)}>
                {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Internal notes">
              <textarea rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment received, courier tracking…" />
            </Field>
            <div className="drawer-actions">
              <button className="btn primary" onClick={() => notify(updateItem('orders', selected.id, { notes }), 'Notes saved')}>Save notes</button>
              <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${String(selected.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`}>
                <MessageCircle size={16} /> WhatsApp
              </a>
              <button className="btn danger" onClick={() => setConfirmDel(true)}><Trash2 size={16} /></button>
            </div>
          </>
        )}
      </Drawer>

      <ConfirmModal
        open={confirmDel}
        title="Delete order?"
        message="This order will be permanently removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}
