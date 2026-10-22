import { useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { useCollection, updateItem, removeItem, fmtDate, MESSAGE_STATUSES } from '../lib/api';
import { PageHead, SearchBox, Chips, Drawer, StatusBadge, DataState, Empty } from '../components/ui';

export default function Messages() {
  const { items, loading, error } = useCollection('messages');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const counts = { all: items.length };
  MESSAGE_STATUSES.forEach((s) => (counts[s] = items.filter((m) => m.status === s).length));

  const rows = items.filter(
    (m) => (filter === 'all' || m.status === filter) && `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q.toLowerCase()),
  );
  const selected = items.find((m) => m.id === selectedId);

  const open = (m) => {
    setSelectedId(m.id);
    if (m.status === 'unread') updateItem('messages', m.id, { status: 'read' });
  };
  const remove = async () => {
    if (!confirm('Delete this message?')) return;
    await removeItem('messages', selected.id);
    setSelectedId(null);
  };

  return (
    <>
      <PageHead title="Messages" subtitle="Contact-us enquiries from the website.">
        <SearchBox value={q} onChange={setQ} />
      </PageHead>
      <Chips options={['all', ...MESSAGE_STATUSES]} value={filter} onChange={setFilter} counts={counts} />

      <DataState loading={loading} error={error}>
        <div className="card">
          {rows.length === 0 ? <Empty text="No messages." /> : rows.map((m) => (
            <button key={m.id} className={`msg-row ${m.status === 'unread' ? 'unread' : ''}`} onClick={() => open(m)}>
              <div className="avatar sm">{m.name?.[0]?.toUpperCase()}</div>
              <div className="msg-main">
                <strong>{m.subject}</strong>
                <small>{m.name} · {m.message?.slice(0, 90)}</small>
              </div>
              <div className="right"><small>{fmtDate(m.createdAt)}</small><StatusBadge status={m.status} /></div>
            </button>
          ))}
        </div>
      </DataState>

      <Drawer open={!!selected} title="Message" onClose={() => setSelectedId(null)}>
        {selected && (
          <>
            <h3 className="msg-subject">{selected.subject}</h3>
            <p className="muted">{selected.name} · <a href={`mailto:${selected.email}`}>{selected.email}</a><br />{fmtDate(selected.createdAt)}</p>
            <div className="msg-body">{selected.message}</div>
            <div className="drawer-actions">
              <a className="btn primary" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                onClick={() => updateItem('messages', selected.id, { status: 'replied' })}>
                <Mail size={16} /> Reply by email
              </a>
              <select value={selected.status} onChange={(e) => updateItem('messages', selected.id, { status: e.target.value })}>
                {MESSAGE_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn danger" onClick={remove}><Trash2 size={16} /></button>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
