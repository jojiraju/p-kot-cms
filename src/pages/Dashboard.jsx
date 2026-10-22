import { Link } from 'react-router-dom';
import { ShoppingBag, IndianRupee, MessageSquare, Clock } from 'lucide-react';
import { useCollection, fmtMoney, fmtDate, toDate, ORDER_STATUSES } from '../lib/api';
import { PageHead, StatusBadge, DataState, Empty } from '../components/ui';

const sumBy = (orders, currency) =>
  orders.filter((o) => o.status !== 'cancelled' && (o.currency || 'INR') === currency).reduce((s, o) => s + Number(o.total || 0), 0);

export default function Dashboard() {
  const o = useCollection('orders');
  const m = useCollection('messages');
  const orders = o.items;
  const messages = m.items;

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: 0 };
  });
  orders.forEach((x) => {
    const d = toDate(x.createdAt);
    if (!d) return;
    const day = days.find((s) => d >= s.date && d < new Date(s.date.getTime() + 864e5));
    if (day) day.count += 1;
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const usd = sumBy(orders, 'USD');

  const stats = [
    { label: 'Total orders', value: orders.length, icon: ShoppingBag, tone: 'amber' },
    { label: 'Pending (new)', value: orders.filter((x) => x.status === 'new').length, icon: Clock, tone: 'orange' },
    { label: 'Revenue', value: fmtMoney(sumBy(orders, 'INR')), sub: usd ? `+ ${fmtMoney(usd, 'USD')}` : null, icon: IndianRupee, tone: 'green' },
    { label: 'Unread messages', value: messages.filter((x) => x.status === 'unread').length, icon: MessageSquare, tone: 'rose' },
  ];

  return (
    <>
      <PageHead title="Dashboard" subtitle="A live look at orders and enquiries across the store." />
      <DataState loading={o.loading || m.loading} error={o.error || m.error}>
        <div className="stats">
          {stats.map(({ label, value, sub, icon: Icon, tone }) => (
            <div key={label} className={`card stat tone-${tone}`}>
              <div className="stat-icon"><Icon size={20} /></div>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                {sub && <span className="muted">{sub}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          <section className="card">
            <h3>Orders · last 7 days</h3>
            <div className="bars">
              {days.map((d) => (
                <div key={d.label + d.date} className="bar-col">
                  <span className="bar-val">{d.count}</span>
                  <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>Order status</h3>
            <div className="status-list">
              {ORDER_STATUSES.map((s) => {
                const n = orders.filter((x) => x.status === s).length;
                return (
                  <div key={s} className="status-row">
                    <StatusBadge status={s} />
                    <div className="meter"><i className={`fill badge-${s}`} style={{ width: `${orders.length ? (n / orders.length) * 100 : 0}%` }} /></div>
                    <b>{n}</b>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid-2">
          <section className="card">
            <div className="card-head"><h3>Recent orders</h3><Link to="/orders">View all</Link></div>
            {orders.length === 0 ? <Empty text="No orders yet." /> : orders.slice(0, 5).map((x) => (
              <div key={x.id} className="row-item">
                <div><strong>{x.name}</strong><small>{x.productName} · {x.quantity} × {x.weight}</small></div>
                <div className="right"><b>{fmtMoney(x.total, x.currency)}</b><StatusBadge status={x.status} /></div>
              </div>
            ))}
          </section>
          <section className="card">
            <div className="card-head"><h3>Recent messages</h3><Link to="/messages">View all</Link></div>
            {messages.length === 0 ? <Empty text="No messages yet." /> : messages.slice(0, 5).map((x) => (
              <div key={x.id} className="row-item">
                <div><strong>{x.subject}</strong><small>{x.name} · {fmtDate(x.createdAt)}</small></div>
                <StatusBadge status={x.status} />
              </div>
            ))}
          </section>
        </div>
      </DataState>
    </>
  );
}
