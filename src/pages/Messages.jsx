import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { Eye, Trash2 } from 'lucide-react';
import { useCollection, removeItem, fmtDate, toDate, MESSAGE_STATUSES, messageStatus } from '../lib/api';
import { PageHead, SearchBox, Chips, StatusBadge, DataState, Empty, ConfirmModal } from '../components/ui';
import { tableStyles, tableTheme } from '../lib/tableStyles';
import TablePagination from '../components/TablePagination';
import { notify } from '../lib/notify';
import { useMediaQuery } from '../lib/useMediaQuery';

export default function Messages() {
  const navigate = useNavigate();
  const { items, loading, error } = useCollection('messages');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [del, setDel] = useState(null);
  const isMobile = useMediaQuery('(max-width: 760px)');

  const counts = { all: items.length };
  MESSAGE_STATUSES.forEach((s) => (counts[s] = items.filter((m) => messageStatus(m) === s).length));

  const rows = useMemo(
    () => items.filter((m) => (filter === 'all' || messageStatus(m) === filter) && `${m.name} ${m.email} ${m.phone || ''} ${m.subject} ${m.message}`.toLowerCase().includes(q.toLowerCase())),
    [items, filter, q],
  );

  // Phones get one stacked card per message instead of a wide table.
  const mobileColumns = useMemo(() => [
    {
      name: 'Messages',
      grow: 1,
      cell: (m) => (
        <div className="msg-card">
          <div className="avatar sm">{m.name?.[0]?.toUpperCase()}</div>
          <div className="msg-card-main">
            <div className="msg-card-top">
              <strong>{m.name}</strong>
              <StatusBadge status={messageStatus(m)} />
            </div>
            <span className="msg-card-subject">{m.subject}</span>
            <small className="msg-card-line">{m.email}</small>
            {m.phone && <a className="msg-card-line" href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()}>{m.phone}</a>}
            <small>{fmtDate(m.createdAt)}</small>
          </div>
          <button type="button" className="pcard-btn danger" title="Delete" aria-label="Delete message" onClick={(e) => { e.stopPropagation(); setDel(m); }}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], []);

  const columns = useMemo(() => [
    {
      name: 'From',
      grow: 1.3,
      sortable: true,
      sortFunction: (a, b) => (a.name || '').localeCompare(b.name || ''),
      cell: (m) => (
        <div className="who-cell">
          <div className="avatar sm">{m.name?.[0]?.toUpperCase()}</div>
          <div className="dt-text"><strong>{m.name}</strong><small>{m.email}</small></div>
        </div>
      ),
    },
    {
      name: 'Mobile',
      grow: 1,
      hide: 'sm',
      cell: (m) => (m.phone ? <a href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()}>{m.phone}</a> : <span className="muted">—</span>),
    },
    {
      name: 'Subject',
      grow: 1.6,
      sortable: true,
      sortFunction: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
      cell: (m) => <div className="dt-text"><strong>{m.subject}</strong></div>,
    },
    {
      name: 'Message',
      grow: 2,
      hide: 'md',
      cell: (m) => <div className="dt-text"><span className="dt-clip">{m.message}</span></div>,
    },
    {
      name: 'Received',
      grow: 1,
      sortable: true,
      sortFunction: (a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0),
      cell: (m) => <span className="muted">{fmtDate(m.createdAt)}</span>,
    },
    {
      name: 'Status',
      width: '120px',
      sortable: true,
      sortFunction: (a, b) => messageStatus(a).localeCompare(messageStatus(b)),
      cell: (m) => <StatusBadge status={messageStatus(m)} />,
    },
    {
      name: '',
      width: '110px',
      button: true,
      ignoreRowClick: true,
      cell: (m) => (
        <div className="pcard-actions">
          <button type="button" className="pcard-btn" title="View" onClick={() => navigate(`/messages/${m.id}`)}><Eye size={15} /></button>
          <button type="button" className="pcard-btn danger" title="Delete" onClick={() => setDel(m)}><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [navigate]);

  const remove = async () => {
    const m = del;
    setDel(null);
    await notify(removeItem('messages', m.id), 'Message deleted');
  };

  return (
    <>
      <PageHead title="Messages" subtitle="Contact-us enquiries from the website.">
        <SearchBox value={q} onChange={setQ} />
      </PageHead>
      <Chips options={['all', ...MESSAGE_STATUSES]} value={filter} onChange={setFilter} counts={counts} />

      <DataState loading={loading} error={error}>
        <div className="card dt-card">
          <DataTable
            columns={isMobile ? mobileColumns : columns}
            noTableHead={isMobile}
            data={rows}
            theme={tableTheme}
            customStyles={tableStyles}
            onRowClicked={(m) => navigate(`/messages/${m.id}`)}
            pointerOnHover
            highlightOnHover
            pagination
            paginationPerPage={10}
            paginationComponent={TablePagination}
            defaultSortFieldId={isMobile ? undefined : 5}
            defaultSortAsc={false}
            conditionalRowStyles={[{ when: (m) => messageStatus(m) === 'pending', style: { boxShadow: 'inset 3px 0 0 var(--primary)' } }]}
            noDataComponent={<Empty text="No messages." />}
          />
        </div>
      </DataState>

      <ConfirmModal
        open={!!del}
        title="Delete message?"
        message="This message will be permanently removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </>
  );
}
