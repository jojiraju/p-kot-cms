import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DownloadCloud, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useCollection, addCategories, removeItem, slugify, errMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { PageHead, DataState, Empty, ConfirmModal } from '../components/ui';

export default function Categories() {
  const cats = useCollection('categories', { sortByCreated: false });
  const products = useCollection('products', { sortByCreated: false }).items;
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const rows = [...cats.items].sort((a, b) => a.name.localeCompare(b.name));
  const used = (n) => products.filter((p) => p.category === n).length;
  const missing = [...new Set(products.map((p) => p.category).filter(Boolean))].filter((n) => !rows.some((c) => c.id === slugify(n)));

  const importMissing = async () => {
    setErr('');
    setBusy(true);
    try { await addCategories(missing); toast.success('Categories imported'); } catch (e) { setErr(errMessage(e)); toast.error(errMessage(e)); }
    setBusy(false);
  };

  const remove = async () => {
    try {
      await removeItem('categories', del.id);
      setErr('');
      toast.success('Category deleted');
    } catch (e) {
      setErr(errMessage(e));
      toast.error(errMessage(e));
    }
    setDel(null);
  };

  return (
    <>
      <PageHead title="Categories" subtitle="Group products into categories. They appear as filters on the storefront.">
        {missing.length > 0 && (
          <button className="btn" disabled={busy} onClick={importMissing}>
            <DownloadCloud size={16} /> Import from products ({missing.length})
          </button>
        )}
        <Link to="/settings/categories/new" className="btn primary"><Plus size={16} /> Add category</Link>
      </PageHead>
      {err && <p className="pf-err" style={{ marginBottom: 16 }}>{err}</p>}

      <DataState loading={cats.loading} error={cats.error}>
        {rows.length === 0 ? <div className="card"><Empty text="No categories yet. Click “Add category” to create one." /></div> : (
          <div className="cat-grid">
            {rows.map((c) => (
              <div key={c.id} className="card cat-item">
                <span className="cat-icon"><Tags size={18} /></span>
                <Link to={`/settings/categories/${c.id}`} className="cat-info">
                  <strong>{c.name}</strong>
                  <p>{c.description || 'No description'}</p>
                  <small className="muted">{used(c.name)} product{used(c.name) === 1 ? '' : 's'}</small>
                </Link>
                <div className="pcard-actions">
                  <Link to={`/settings/categories/${c.id}`} className="pcard-btn" title="Edit"><Pencil size={15} /></Link>
                  <button type="button" className="pcard-btn danger" title="Delete" onClick={() => setDel(c)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>

      <ConfirmModal
        open={!!del}
        title={del && used(del.name) ? 'Category in use' : 'Delete category?'}
        message={del && used(del.name)
          ? `"${del.name}" is used by ${used(del.name)} product(s). Move them to another category before deleting it.`
          : `"${del?.name}" will be removed.`}
        confirmLabel={del && used(del.name) ? 'OK' : 'Delete'}
        onConfirm={del && used(del.name) ? () => setDel(null) : remove}
        onCancel={() => setDel(null)}
      />
    </>
  );
}
