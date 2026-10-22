import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DownloadCloud, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { useCollection, seedQuantities, removeItem, errMessage } from '../lib/api';
import { PageHead, DataState, Empty, ConfirmModal } from '../components/ui';

export default function Quantities() {
  const q = useCollection('quantities', { sortByCreated: false });
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = [...q.items].sort((a, b) => a.value - b.value);

  const run = async (fn) => {
    setErr('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(errMessage(e)); toast.error(errMessage(e)); }
    setBusy(false);
  };

  return (
    <>
      <PageHead title="Weight options" subtitle="The weights customers can choose on a product page. Each price is worked out from the product's per-kg price.">
        {rows.length === 0 && (
          <button className="btn" disabled={busy} onClick={() => run(async () => { await seedQuantities(); toast.success('Default weights added'); })}>
            <DownloadCloud size={16} /> Add defaults (100g – 5kg)
          </button>
        )}
        <Link to="/settings/quantities/new" className="btn primary"><Plus size={16} /> Add weight</Link>
      </PageHead>
      {err && <p className="pf-err" style={{ marginBottom: 16 }}>{err}</p>}

      <DataState loading={q.loading} error={q.error}>
        {rows.length === 0 ? <div className="card"><Empty text="No weight options yet. The website falls back to 100g, 250g, 500g, 1kg and 5kg." /></div> : (
          <div className="cat-grid">
            {rows.map((r) => (
              <div key={r.id} className="card cat-item">
                <span className="cat-icon"><Scale size={18} /></span>
                <Link to={`/settings/quantities/${r.id}`} className="cat-info">
                  <strong>{r.label}</strong>
                  <small className="muted">{Math.round(r.value * 10000) / 100}% of the per-kg price</small>
                </Link>
                <div className="pcard-actions">
                  <Link to={`/settings/quantities/${r.id}`} className="pcard-btn" title="Edit"><Pencil size={15} /></Link>
                  <button type="button" className="pcard-btn danger" title="Delete" onClick={() => setDel(r)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>

      <ConfirmModal
        open={!!del}
        title="Delete weight option?"
        message={`"${del?.label}" will no longer be offered on the website.`}
        confirmLabel="Delete"
        onConfirm={() => run(async () => { await removeItem('quantities', del.id); toast.success('Weight deleted'); setDel(null); })}
        onCancel={() => setDel(null)}
      />
    </>
  );
}
