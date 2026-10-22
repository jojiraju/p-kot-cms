import { Link } from 'react-router-dom';
import { ShoppingBag, IndianRupee, MessageSquare, Clock, Plus, ArrowRight, TrendingUp, TrendingDown, Inbox } from 'lucide-react';
import { useCollection, fmtMoney, fmtDate, toDate, ORDER_STATUSES, messageStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusBadge, DataState } from '../components/ui';

const STATUS_COLOR = { new: '#f9a825', confirmed: '#64b5f6', shipped: '#ce93d8', delivered: '#7cb342', cancelled: '#ef5a7a' };
const DAY = 864e5;

const sumBy = (orders, currency) =>
  orders.filter((o) => o.status !== 'cancelled' && (o.currency || 'INR') === currency).reduce((s, o) => s + Number(o.total || 0), 0);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const initial = (t) => (t || '?').trim()[0]?.toUpperCase();

function Donut({ segments, total }) {
  const r = 56;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Orders by status">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        {segments.filter((s) => s.count > 0).map((s) => {
          const len = (s.count / total) * C;
          const el = (
            <circle key={s.status} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="butt"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-center"><strong>{total}</strong><small>orders</small></div>
    </div>
  );
}

const Trend = ({ now, prev }) => {
  if (!prev && !now) return null;
  const pct = prev ? Math.round(((now - prev) / prev) * 100) : 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return <span className={`trend ${up ? 'up' : 'down'}`}><Icon size={14} /> {up ? '+' : ''}{pct}% vs previous 7 days</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const o = useCollection('orders');
  const m = useCollection('messages');
  const orders = o.items;
  const messages = m.items;

  const today = startOfDay(new Date());
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY);
    return { date: d, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), full: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count: 0 };
  });
  let prevWeek = 0;
  orders.forEach((x) => {
    const d = toDate(x.createdAt);
    if (!d) return;
    const day = days.find((s) => d >= s.date && d < new Date(s.date.getTime() + DAY));
    if (day) day.count += 1;
    else if (d >= new Date(today.getTime() - 13 * DAY) && d < days[0].date) prevWeek += 1;
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const weekTotal = days.reduce((s, d) => s + d.count, 0);

  const pending = orders.filter((x) => x.status === 'new').length;
  const unread = messages.filter((x) => messageStatus(x) === 'pending').length;
  const usd = sumBy(orders, 'USD');
  const ordersToday = days[6].count;

  const stats = [
    { label: 'Total orders', value: orders.length, sub: `${ordersToday} today`, icon: ShoppingBag, tone: 'amber' },
    { label: 'Pending (new)', value: pending, sub: pending ? 'Needs your attention' : 'All handled', icon: Clock, tone: 'orange' },
    { label: 'Revenue', value: fmtMoney(sumBy(orders, 'INR')), sub: usd ? `+ ${fmtMoney(usd, 'USD')}` : 'Excludes cancelled', icon: IndianRupee, tone: 'green' },
    { label: 'Pending messages', value: unread, sub: `${messages.length} total`, icon: MessageSquare, tone: 'rose' },
  ];
  const segments = ORDER_STATUSES.map((s) => ({ status: s, color: STATUS_COLOR[s], count: orders.filter((x) => x.status === s).length }));

  return (
    <DataState loading={o.loading || m.loading} error={o.error || m.error}>
      <section className="hero">
        <div>
          <span className="hero-eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>Welcome back, {user.displayName}</h1>
          <p>
            {pending || unread
              ? `You have ${pending} new order${pending === 1 ? '' : 's'} and ${unread} pending message${unread === 1 ? '' : 's'} waiting.`
              : 'You are all caught up. Nothing needs attention right now.'}
          </p>
        </div>
        <div className="hero-actions">
          <Link to="/orders" className="btn primary">View orders <ArrowRight size={16} /></Link>
          <Link to="/products/new" className="btn"><Plus size={16} /> Add product</Link>
        </div>
      </section>

      <div className="stats">
        {stats.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className={`card stat tone-${tone}`}>
            <div className="stat-icon"><Icon size={22} /></div>
            <div className="stat-body">
              <small>{label}</small>
              <strong>{value}</strong>
              <span className="stat-sub">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 wide-left">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Orders · last 7 days</h3>
              <span className="chart-total">{weekTotal} order{weekTotal === 1 ? '' : 's'}</span>
            </div>
            <Trend now={weekTotal} prev={prevWeek} />
          </div>
          <div className="plot">
            {days.map((d) => (
              <div key={d.date} className="bar-col" title={`${d.full}: ${d.count} order${d.count === 1 ? '' : 's'}`}>
                <span className="bar-val">{d.count}</span>
                <div className={`bar ${d.count === 0 ? 'zero' : ''}`} style={{ height: `${(d.count / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="plot-labels">
            {days.map((d, i) => <small key={d.date} className={i === 6 ? 'today' : ''}>{d.label}</small>)}
          </div>
        </section>

        <section className="card">
          <h3>Order status</h3>
          <div className="status-wrap">
            <Donut segments={segments} total={orders.length} />
            <ul className="legend">
              {segments.map((s) => (
                <li key={s.status}>
                  <i style={{ background: s.color }} />
                  <span>{s.status}</span>
                  <b>{s.count}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h3>Recent orders</h3><Link to="/orders">View all</Link></div>
          {orders.length === 0 ? (
            <div className="mini-empty"><Inbox size={28} /><span>No orders yet.</span></div>
          ) : orders.slice(0, 5).map((x) => (
            <div key={x.id} className="row-item">
              <div className="row-avatar">{initial(x.name)}</div>
              <div className="row-main"><strong>{x.name}</strong><small>{x.productName} · {x.quantity} × {x.weight}</small></div>
              <div className="right"><b>{fmtMoney(x.total, x.currency)}</b><StatusBadge status={x.status} /></div>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-head"><h3>Recent messages</h3><Link to="/messages">View all</Link></div>
          {messages.length === 0 ? (
            <div className="mini-empty"><Inbox size={28} /><span>No messages yet.</span></div>
          ) : messages.slice(0, 5).map((x) => (
            <div key={x.id} className="row-item">
              <div className="row-avatar">{initial(x.name)}</div>
              <div className="row-main"><strong>{x.subject}</strong><small>{x.name} · {fmtDate(x.createdAt)}</small></div>
              <StatusBadge status={messageStatus(x)} />
            </div>
          ))}
        </section>
      </div>
    </DataState>
  );
}
