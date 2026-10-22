import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useCollection, updateItem, fmtDate, MESSAGE_STATUSES, messageStatus } from '../lib/api';
import { PageHead, DataState, Select } from '../components/ui';
import { notify } from '../lib/notify';

export default function MessageDetail() {
  const { id } = useParams();
  const { items, loading, error } = useCollection('messages');
  const m = items.find((x) => x.id === id);

  return (
    <>
      <PageHead title="Message" subtitle={m ? `From ${m.name}` : undefined}>
        <Link to="/messages" className="btn"><ArrowLeft size={16} /> Back to messages</Link>
      </PageHead>

      <DataState loading={loading} error={error}>
        {!m ? (
          <div className="card empty">Message not found.</div>
        ) : (
          <div className="msg-page single">
            <section className="card msg-detail">
              <div className="msg-top">
                <h2 className="msg-subject">{m.subject}</h2>
                <div className="msg-status">
                  <Select
                    compact
                    isSearchable={false}
                    options={MESSAGE_STATUSES}
                    value={messageStatus(m)}
                    onChange={(v) => notify(updateItem('messages', m.id, { status: v }), `Marked as ${v}`)}
                  />
                </div>
              </div>
              <div className="msg-from">
                <div className="avatar">{m.name?.[0]?.toUpperCase()}</div>
                <div>
                  <strong>{m.name}</strong>
                  <a href={`mailto:${m.email}`}>{m.email}</a>
                  {m.phone && <a href={`tel:${m.phone}`}>{m.phone}</a>}
                </div>
                <span className="msg-date"><CalendarDays size={15} /> {fmtDate(m.createdAt)}</span>
              </div>
              <div className="msg-body">{m.message}</div>
            </section>
          </div>
        )}
      </DataState>
    </>
  );
}
