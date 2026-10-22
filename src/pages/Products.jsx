import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, DownloadCloud, Images, Pencil, Trash2 } from 'lucide-react';
import { useCollection, seedProducts, removeItem, errMessage, stockState, trackedSizes } from '../lib/api';
import { PageHead, SearchBox, Chips, DataState, Empty, ConfirmModal } from '../components/ui';
import toast from 'react-hot-toast';
import { isHtml, safeHtml } from '../lib/richText';
import seed from '../seed/products.json';

const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const img = (src) => (src?.startsWith('/') ? SITE + src : src);

export default function Products() {
  const { items, loading, error } = useCollection('products', { sortByCreated: false });
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');

  const cats = useCollection('categories', { sortByCreated: false }).items.map((c) => c.name).sort();
  const options = ['All', ...new Set([...cats, ...items.map((p) => p.category).filter(Boolean)])];
  const counts = Object.fromEntries(options.map((o) => [o, o === 'All' ? items.length : items.filter((p) => p.category === o).length]));

  const rows = items
    .filter((p) => cat === 'All' || p.category === cat)
    .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
  const remove = async () => {
    try {
      await removeItem('products', del.id);
      setErr('');
      toast.success('Product deleted');
    } catch (e) {
      setErr(errMessage(e));
      toast.error(errMessage(e));
    }
    setDel(null);
  };
  const importSite = async () => {
    setBusy(true);
    try {
      await seedProducts(seed);
      toast.success('Products imported from the website');
    } catch (e) {
      toast.error(errMessage(e));
    }
    setBusy(false);
  };

  return (
    <>
      <PageHead title="Products" subtitle="Catalogue stored in Firestore — pricing and availability.">
        <SearchBox value={q} onChange={setQ} />
        <button className="btn" onClick={importSite} disabled={busy}><DownloadCloud size={16} /> {busy ? 'Importing…' : 'Import from website'}</button>
        <Link to="/products/new" className="btn primary"><Plus size={16} /> Add product</Link>
      </PageHead>

      {err && <p className="pf-err" style={{ marginBottom: 16 }}>{err}</p>}
      <Chips options={options} value={cat} onChange={setCat} counts={counts} />

      <DataState loading={loading} error={error}>
        {rows.length === 0 ? (
          <div className="card">
            <Empty text={items.length === 0 ? 'No products yet. Click “Import from website” to load the current catalogue.' : 'No products match your filters.'} />
          </div>
        ) : (
          <div className="product-grid">
            {rows.map((p) => (
              <div key={p.id} className="pcard">
                <Link to={`/products/${p.id}`} className="pcard-link">
                  <div className="pcard-img">
                    {p.image ? <img src={img(p.image)} alt={p.name} loading="lazy" /> : <span className="pcard-ph">🌶️</span>}
                    <span className={`pcard-stock ${stockState(p)}`}>
                      {{ out: 'Out of stock', low: 'Low stock', in: 'In stock' }[stockState(p)]}
                      {stockState(p) !== 'out' && trackedSizes(p).length > 0 && ` · ${trackedSizes(p).reduce((n, z) => n + z.stock, 0)} packs`}
                    </span>
                    {p.images?.length > 0 && <span className="pcard-count"><Images size={12} /> {p.images.length + 1}</span>}
                  </div>
                  <div className="pcard-body">
                    <span className="pcard-cat">{p.category}</span>
                    <h3>{p.name}</h3>
                    {p.description && (isHtml(p.description)
                      ? <div className="pcard-desc" dangerouslySetInnerHTML={{ __html: safeHtml(p.description) }} />
                      : <div className="pcard-desc">{p.description}</div>)}
                  </div>
                </Link>
                <div className="pcard-foot">
                  <div>
                    <b>₹{p.priceINR}</b>
                    <small>${p.priceUSD} / {p.unit}</small>
                  </div>
                  <div className="pcard-actions">
                    <Link to={`/products/${p.id}`} className="pcard-btn" title="Edit"><Pencil size={15} /></Link>
                    <button type="button" className="pcard-btn danger" title="Delete" onClick={() => setDel(p)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>

      <ConfirmModal
        open={!!del}
        title="Delete product?"
        message={`"${del?.name}" will be permanently removed from the catalogue.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </>
  );
}
