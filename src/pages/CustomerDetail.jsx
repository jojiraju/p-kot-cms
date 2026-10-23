import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MessageCircle, Phone } from 'lucide-react';
import { useCollection, buildCustomers, fmtSpent, fmtDate, fmtMoney, orderNo } from '../lib/api';
import { PageHead, DataState, StatusBadge, Empty } from '../components/ui';

export default function CustomerDetail() {
  const { key } = useParams();
  const { items, loading, error } = useCollection('orders');
  const users = useCollection('users', { sortByCreated: false }).items;
  const c = useMemo(() => buildCustomers(items, users).find((x) => x.key === key), [items, users, key]);

  return (
    <>
      <PageHead title="Customer" subtitle={c ? [c.name, c.phone || c.email].filter(Boolean).join(' · ') : undefined}>
        <Link to="/customers" className="btn"><ArrowLeft size={16} /> Back to customers</Link>
      </PageHead>

      <DataState loading={loading} error={error}>
        {!c ? <div className="card empty">Customer not found.</div> : <CustomerView c={c} />}
      </DataState>
    </>
  );
}

function CustomerView({ c }) {
  const navigate = useNavigate();
  const phoneDigits = String(c.phone || '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1');
  const active = c.orders.filter((o) => o.status !== 'cancelled').length;
  const pending = c.orders.filter((o) => o.status === 'new').length;

  return (
    <div className="msg-page">
      <div className="od-main">
        <section className="card">
          <div className="od-head">
            <div className="od-cust">
              <div className="avatar">{c.name?.[0]?.toUpperCase()}</div>
              <div>
                <h2 className="od-no">{c.name}</h2>
                <span className="od-date"><CalendarDays size={15} /> Customer since {c.first ? fmtDate(c.first) : '—'}</span>
              </div>
            </div>
          </div>
          <div className="cu-stats">
            <div><small>Orders</small><b>{c.orders.length}</b></div>
            <div><small>Total spent</small><b>{fmtSpent(c)}</b></div>
            <div><small>Active orders</small><b>{active}</b></div>
            <div><small>Awaiting confirmation</small><b>{pending}</b></div>
          </div>
        </section>

        <section className="card">
          <h3>Order history</h3>
          {c.orders.length === 0 ? <Empty text="No orders." /> : (
            <table className="od-items cu-orders">
              <thead><tr><th>Order</th><th>Product</th><th className="r">Total</th><th className="r">Status</th></tr></thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                    <td><strong>{orderNo(o.id)}</strong><small>{fmtDate(o.createdAt)}</small></td>
                    <td>{o.productName}<small>{o.quantity} × {o.weight}</small></td>
                    <td className="r"><b>{fmtMoney(o.total, o.currency)}</b></td>
                    <td className="r"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside className="od-side">
        <section className="card">
          <h3>Contact</h3>
          <dl className="od-rows">
            <dt>Name</dt><dd>{c.name}</dd>
            <dt>Phone</dt><dd>{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—'}</dd>
            <dt>Email</dt><dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</dd>
            <dt>Account</dt><dd>{c.account ? 'Registered on the website' : 'Guest (ordered before accounts)'}</dd>
          </dl>
          {c.phone && (
            <div className="od-contact">
              <a className="btn" href={`tel:${c.phone}`}><Phone size={16} /> Call</a>
              <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${phoneDigits}`}><MessageCircle size={16} /> WhatsApp</a>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Latest delivery address</h3>
          <dl className="od-rows">
            <dt>Address</dt><dd>{c.address || '—'}</dd>
            <dt>City</dt><dd>{c.city || '—'}</dd>
            <dt>Pincode</dt><dd>{c.pincode || '—'}</dd>
          </dl>
        </section>
      </aside>
    </div>
  );
}
