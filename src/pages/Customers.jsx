import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { Download, Eye } from 'lucide-react';
import { useCollection, buildCustomers, fmtSpent, fmtDate, toDate, downloadCsv } from '../lib/api';
import { PageHead, SearchBox, DataState, Empty } from '../components/ui';
import { tableStyles, tableTheme } from '../lib/tableStyles';
import TablePagination from '../components/TablePagination';
import { useMediaQuery } from '../lib/useMediaQuery';

// Customers are derived from orders, keyed by phone number.
export default function Customers() {
  const navigate = useNavigate();
  const { items, loading, error } = useCollection('orders');
  const [q, setQ] = useState('');
  const isMobile = useMediaQuery('(max-width: 760px)');

  const users = useCollection('users', { sortByCreated: false }).items;
  const customers = useMemo(() => buildCustomers(items, users), [items, users]);
  const rows = useMemo(
    () => customers.filter((c) => `${c.name} ${c.phone} ${c.city} ${c.email}`.toLowerCase().includes(q.toLowerCase())),
    [customers, q],
  );
  const open = (c) => navigate(`/customers/${encodeURIComponent(c.key)}`);

  // Phones get one stacked card per customer instead of a wide table.
  const mobileColumns = useMemo(() => [
    {
      name: 'Customers',
      grow: 1,
      cell: (c) => (
        <div className="msg-card">
          <div className="avatar sm">{c.name?.[0]?.toUpperCase()}</div>
          <div className="msg-card-main">
            <div className="msg-card-top">
              <strong>{c.name}</strong>
              <b>{fmtSpent(c)}</b>
            </div>
            {c.phone && <a className="msg-card-line" href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>{c.phone}</a>}
            {c.email && <small className="msg-card-line">{c.email}</small>}
            <small>{c.orders.length} order{c.orders.length === 1 ? '' : 's'}{c.last ? ` · last ${fmtDate(c.last)}` : ''}</small>
          </div>
        </div>
      ),
    },
  ], []);

  const columns = useMemo(() => [
    {
      name: 'Customer',
      grow: 1.3,
      sortable: true,
      sortFunction: (a, b) => (a.name || '').localeCompare(b.name || ''),
      cell: (c) => (
        <div className="who-cell">
          <div className="avatar sm">{c.name?.[0]?.toUpperCase()}</div>
          <div className="dt-text"><strong>{c.name}</strong><small>{c.email || c.city}</small></div>
        </div>
      ),
    },
    {
      name: 'Phone',
      grow: 1,
      cell: (c) => (c.phone ? <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>{c.phone}</a> : <span className="muted">—</span>),
    },
    {
      name: 'Account',
      width: '120px',
      sortable: true,
      sortFunction: (a, b) => Number(!!b.account) - Number(!!a.account),
      cell: (c) => <span className={`badge ${c.account ? 'badge-confirmed' : ''}`}>{c.account ? 'Registered' : 'Guest'}</span>,
    },
    {
      name: 'Orders',
      grow: 0.6,
      sortable: true,
      sortFunction: (a, b) => a.orders.length - b.orders.length,
      cell: (c) => c.orders.length,
    },
    {
      name: 'Total spent',
      grow: 1,
      sortable: true,
      sortFunction: (a, b) => (a.inr + a.usd) - (b.inr + b.usd),
      cell: (c) => <b>{fmtSpent(c)}</b>,
    },
    {
      name: 'Last order',
      grow: 1,
      sortable: true,
      sortFunction: (a, b) => (toDate(a.last) || 0) - (toDate(b.last) || 0),
      cell: (c) => <span className="muted">{fmtDate(c.last)}</span>,
    },
    {
      name: '',
      width: '70px',
      button: true,
      ignoreRowClick: true,
      cell: (c) => <button type="button" className="pcard-btn" title="View" onClick={() => open(c)}><Eye size={15} /></button>,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <>
      <PageHead title="Customers" subtitle={`${customers.length} unique customer${customers.length === 1 ? '' : 's'}, built from order history.`}>
        <SearchBox value={q} onChange={setQ} />
        <button className="btn" onClick={() => downloadCsv('customers.csv', rows.map((c) => ({ name: c.name, phone: c.phone, email: c.email, account: c.account ? 'registered' : 'guest', city: c.city, orders: c.orders.length, spent: fmtSpent(c) })))}>
          <Download size={16} /> Export CSV
        </button>
      </PageHead>
      <DataState loading={loading} error={error}>
        <div className="card dt-card">
          <DataTable
            columns={isMobile ? mobileColumns : columns}
            noTableHead={isMobile}
            data={rows}
            theme={tableTheme}
            customStyles={tableStyles}
            onRowClicked={open}
            pointerOnHover
            highlightOnHover
            pagination
            paginationPerPage={10}
            paginationComponent={TablePagination}
            defaultSortFieldId={isMobile ? undefined : 6}
            defaultSortAsc={false}
            noDataComponent={<Empty text="No customers yet." />}
          />
        </div>
      </DataState>
    </>
  );
}
