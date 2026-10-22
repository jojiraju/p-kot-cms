import { useState } from 'react';
import { Plus, DownloadCloud, Trash2 } from 'lucide-react';
import { useCollection, saveProduct, removeItem, seedProducts } from '../lib/api';
import { PageHead, SearchBox, Drawer, DataState, Empty, Field } from '../components/ui';
import seed from '../seed/products.json';

const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const img = (src) => (src?.startsWith('/') ? SITE + src : src);
const blank = { id: '', name: '', category: '', priceINR: '', priceUSD: '', unit: 'kg', description: '', image: '', inStock: true };

export default function Products() {
  const { items, loading, error } = useCollection('products', { sortByCreated: false });
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = items
    .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const isNew = form && !items.some((p) => p.id === form.id);

  const save = async (e) => {
    e.preventDefault();
    const id = form.id.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await saveProduct(id, { ...form, id });
    setForm(null);
  };
  const importSite = async () => {
    setBusy(true);
    await seedProducts(seed);
    setBusy(false);
  };

  return (
    <>
      <PageHead title="Products" subtitle="Catalogue stored in Firestore — pricing and availability.">
        <SearchBox value={q} onChange={setQ} />
        <button className="btn" onClick={importSite} disabled={busy}><DownloadCloud size={16} /> {busy ? 'Importing…' : 'Import from website'}</button>
        <button className="btn primary" onClick={() => setForm({ ...blank, id: '' })}><Plus size={16} /> Add product</button>
      </PageHead>

      <DataState loading={loading} error={error}>
        {rows.length === 0 ? <div className="card"><Empty text="No products yet. Click “Import from website” to load the current catalogue." /></div> : (
          <div className="product-grid">
            {rows.map((p) => (
              <button key={p.id} className="card product" onClick={() => setForm({ ...blank, ...p })}>
                <div className="thumb">{p.image ? <img src={img(p.image)} alt={p.name} loading="lazy" /> : '🌶️'}</div>
                <strong>{p.name}</strong>
                <small>{p.category}</small>
                <div className="price-line">
                  <b>₹{p.priceINR}</b><span className="muted">${p.priceUSD} / {p.unit}</span>
                </div>
                <span className={`badge ${p.inStock === false ? 'badge-cancelled' : 'badge-delivered'}`}>{p.inStock === false ? 'out of stock' : 'in stock'}</span>
              </button>
            ))}
          </div>
        )}
      </DataState>

      <Drawer open={!!form} title={isNew ? 'Add product' : 'Edit product'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save}>
            <Field label="Name"><input required value={form.name} onChange={set('name')} /></Field>
            <Field label="Category"><input required value={form.category} onChange={set('category')} placeholder="Ground Spices" /></Field>
            <div className="two">
              <Field label="Price (INR)"><input required value={form.priceINR} onChange={set('priceINR')} /></Field>
              <Field label="Price (USD)"><input required value={form.priceUSD} onChange={set('priceUSD')} /></Field>
            </div>
            <Field label="Image path or URL"><input value={form.image} onChange={set('image')} placeholder="/products/chilly-powder-packed.png" /></Field>
            <Field label="Description"><textarea rows="4" value={form.description} onChange={set('description')} /></Field>
            <label className="check"><input type="checkbox" checked={form.inStock !== false} onChange={set('inStock')} /> In stock</label>
            <div className="drawer-actions">
              <button className="btn primary">Save</button>
              {!isNew && (
                <button type="button" className="btn danger" onClick={async () => { if (confirm('Delete product?')) { await removeItem('products', form.id); setForm(null); } }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </form>
        )}
      </Drawer>
    </>
  );
}
