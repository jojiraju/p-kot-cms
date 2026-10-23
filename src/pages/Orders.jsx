import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { Download, Eye, Trash2 } from 'lucide-react';
import { useCollection, deleteOrder, setOrderStatus, orderNo, orderPricing, DEFAULT_QUANTITIES, quantityLabel, quantityValue, fmtDate, fmtMoney, toDate, downloadCsv, ORDER_STATUSES } from '../lib/api';
import { PageHead, SearchBox, Chips, StatusBadge, DataState, Empty, ConfirmModal } from '../components/ui';
import { tableStyles, tableTheme } from '../lib/tableStyles';
import TablePagination from '../components/TablePagination';
import { notify } from '../lib/notify';
import { useMediaQuery } from '../lib/useMediaQuery';

export default function Orders() {
  const navigate = useNavigate();
  const { items, loading, error } = useCollection('orders');
  const products = useCollection('products', { sortByCreated: false }).items;
  const cmsWeights = useCollection('quantities', { sortByCreated: false }).items;
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [del, setDel] = useState(null);
  const isMobile = useMediaQuery('(max-width: 760px)');

  const counts = useMemo(() => {
    const c = { all: items.length };
    ORDER_STATUSES.forEach((s) => (c[s] = items.filter((o) => o.status === s).length));
    return c;
  }, [items]);

  const rows = useMemo(
    () => items.filter((o) => (filter === 'all' || o.status === filter) && `${o.name} ${o.phone} ${o.productName} ${o.city} ${o.id} ${orderNo(o.id)}`.toLowerCase().includes(q.toLowerCase())),
    [items, filter, q],
  );

  const exportCsv = () =>
    downloadCsv('orders.csv', rows.map((o) => ({
      order: orderNo(o.id), date: fmtDate(o.createdAt), status: o.status, customer: o.name, phone: o.phone,
      product: o.productName, weight: o.weight, quantity: o.quantity, total: o.total, currency: o.currency,
      address: o.address, city: o.city, pincode: o.pincode, notes: o.notes,
    })));

  const weights = useMemo(
    () => (cmsWeights.length ? cmsWeights : DEFAULT_QUANTITIES.map(([a, u]) => ({ label: quantityLabel(a, u), value: quantityValue(a, u) }))).map((w) => ({ label: w.label, value: Number(w.value) })),
    [cmsWeights],
  );
  // Total with the list price struck through when the order was discounted.
  const totalCell = (o) => {
    const p = orderPricing(o, products.find((x) => x.id === o.productId), weights);
    return (
      <div className="dt-text">
        <b>{fmtMoney(p.total, o.currency)}</b>
        {p.saved > 0 && <small><s>{fmtMoney(p.original, o.currency)}</s> · {p.percent}% off</small>}
        {o.status !== 'cancelled' && <small style={o.paid ? { color: '#7bc043' } : undefined}>{o.paid ? 'Paid' : 'Not paid'}</small>}
      </div>
    );
  };

  // Phones get one stacked card per order instead of a wide table.
  const mobileColumns = useMemo(() => [
    {
      name: 'Orders',
      grow: 1,
      cell: (o) => (
        <div className="msg-card">
          <div className="avatar sm">{o.name?.[0]?.toUpperCase()}</div>
          <div className="msg-card-main">
            <div className="msg-card-top">
              <strong>{o.name}</strong>
              <StatusBadge status={o.status} />
            </div>
            <small>{orderNo(o.id)}</small>
            <span className="msg-card-subject">{o.productName} · {o.quantity} × {o.weight}</span>
            {totalCell(o)}
            {o.phone && <a className="msg-card-line" href={`tel:${o.phone}`} onClick={(e) => e.stopPropagation()}>{o.phone}</a>}
            <small>{fmtDate(o.createdAt)}</small>
          </div>
          <button type="button" className="pcard-btn danger" title="Delete" aria-label="Delete order" onClick={(e) => { e.stopPropagation(); setDel(o); }}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [products, weights]);

  const columns = useMemo(() => [
    {
      name: 'Order',
      width: '130px',
      sortable: true,
      sortFunction: (a, b) => a.id.localeCompare(b.id),
      cell: (o) => <strong>{orderNo(o.id)}</strong>,
    },
    {
      name: 'Customer',
      grow: 1.3,
      sortable: true,
      sortFunction: (a, b) => (a.name || '').localeCompare(b.name || ''),
      cell: (o) => (
        <div className="who-cell">
          <div className="avatar sm">{o.name?.[0]?.toUpperCase()}</div>
          <div className="dt-text"><strong>{o.name}</strong><small>{o.phone}</small></div>
        </div>
      ),
    },
    {
      name: 'Product',
      grow: 1.4,
      sortable: true,
      sortFunction: (a, b) => (a.productName || '').localeCompare(b.productName || ''),
      cell: (o) => <div className="dt-text"><strong>{o.productName}</strong></div>,
    },
    {
      name: 'Qty',
      grow: 0.8,
      hide: 'sm',
      cell: (o) => <span>{o.quantity} × {o.weight}</span>,
    },
    {
      name: 'Total',
      grow: 0.8,
      sortable: true,
      sortFunction: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0),
      cell: totalCell,
    },
    {
      name: 'Placed',
      grow: 1,
      sortable: true,
      sortFunction: (a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0),
      cell: (o) => <span className="muted">{fmtDate(o.createdAt)}</span>,
    },
    {
      name: 'Status',
      width: '130px',
      sortable: true,
      sortFunction: (a, b) => (a.status || '').localeCompare(b.status || ''),
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      name: '',
      width: '110px',
      button: true,
      ignoreRowClick: true,
      cell: (o) => (
        <div className="pcard-actions">
          <button type="button" className="pcard-btn" title="View" onClick={() => navigate(`/orders/${o.id}`)}><Eye size={15} /></button>
          <button type="button" className="pcard-btn danger" title="Delete" onClick={() => setDel(o)}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [navigate, products, weights]);

  const remove = async () => {
    const { id, stockDeducted } = del;
    setDel(null);
    // Put any held stock back on the shelf before the order disappears.
    const run = async () => { if (stockDeducted) await setOrderStatus(id, 'cancelled'); await deleteOrder(id); };
    await notify(run(), 'Order deleted');
  };

  return (
    <>
      <PageHead title="Orders" subtitle="Track and fulfil orders placed from the storefront.">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, product…" />
        <button className="btn" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </PageHead>
      <Chips options={['all', ...ORDER_STATUSES]} value={filter} onChange={setFilter} counts={counts} />

      <DataState loading={loading} error={error}>
        <div className="card dt-card">
          <DataTable
            columns={isMobile ? mobileColumns : columns}
            noTableHead={isMobile}
            data={rows}
            theme={tableTheme}
            customStyles={tableStyles}
            onRowClicked={(o) => navigate(`/orders/${o.id}`)}
            pointerOnHover
            highlightOnHover
            pagination
            paginationPerPage={10}
            paginationComponent={TablePagination}
            defaultSortFieldId={isMobile ? undefined : 6}
            defaultSortAsc={false}
            conditionalRowStyles={[{ when: (o) => o.status === 'new', style: { boxShadow: 'inset 3px 0 0 var(--primary)' } }]}
            noDataComponent={<Empty text="No orders match." />}
          />
        </div>
      </DataState>

      <ConfirmModal
        open={!!del}
        title="Delete order?"
        message="This order will be permanently removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </>
  );
}
