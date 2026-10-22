import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useCollection, fmtDate, fmtMoney, downloadCsv } from '../lib/api';
import { PageHead, SearchBox, DataState, Empty } from '../components/ui';

// Customers are derived from orders, keyed by phone number.
export default function Customers() {
  const { items, loading, error } = useCollection('orders');
  const [q, setQ] = useState('');

  const customers = useMemo(() => {
    const map = new Map();
    items.forEach((o) => {
      const key = String(o.phone || o.id);
      const c = map.get(key) || { phone: o.phone, name: o.name, city: o.city, orders: 0, inr: 0, usd: 0, last: o.createdAt };
      c.orders += 1;
      if (o.status !== 'cancelled') (o.currency === 'USD' ? (c.usd += Number(o.total || 0)) : (c.inr += Number(o.total || 0)));
      map.set(key, c); // items are newest-first, so the first seen keeps the latest name/city/date
    });
    return [...map.values()];
  }, [items]);

  const rows = customers.filter((c) => `${c.name} ${c.phone} ${c.city}`.toLowerCase().includes(q.toLowerCase()));
  const spent = (c) => [c.inr && fmtMoney(c.inr), c.usd && fmtMoney(c.usd, 'USD')].filter(Boolean).join(' + ') || '—';

  return (
    <>
      <PageHead title="Customers" subtitle={`${customers.length} unique customers, built from order history.`}>
        <SearchBox value={q} onChange={setQ} />
        <button className="btn" onClick={() => downloadCsv('customers.csv', rows.map((c) => ({ name: c.name, phone: c.phone, city: c.city, orders: c.orders, spent: spent(c) })))}>
          <Download size={16} /> Export CSV
        </button>
      </PageHead>
      <DataState loading={loading} error={error}>
        <div className="card table-card">
          {rows.length === 0 ? <Empty text="No customers yet." /> : (
            <table className="static">
              <thead><tr><th>Customer</th><th>Phone</th><th>City</th><th>Orders</th><th>Total spent</th><th>Last order</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.phone}>
                    <td data-label="Customer"><div className="who-cell"><div className="avatar sm">{c.name?.[0]?.toUpperCase()}</div><strong>{c.name}</strong></div></td>
                    <td data-label="Phone">{c.phone}</td>
                    <td data-label="City">{c.city}</td>
                    <td data-label="Orders">{c.orders}</td>
                    <td data-label="Spent"><b>{spent(c)}</b></td>
                    <td data-label="Last order">{fmtDate(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DataState>
    </>
  );
}
