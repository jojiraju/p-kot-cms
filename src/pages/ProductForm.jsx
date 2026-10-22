import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ArrowLeft, ImagePlus, Plus, X } from 'lucide-react';
import { useCollection, saveProduct, slugify, errMessage, DEFAULT_QUANTITIES, quantityLabel, quantityValue } from '../lib/api';
import toast from 'react-hot-toast';
import { PageHead, DataState, Field, Select, Toggle } from '../components/ui';
import RichTextEditor, { featuresFromHtml, featuresToHtml } from '../components/RichTextEditor';

const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const img = (src) => (src?.startsWith('/') ? SITE + src : src);
const UNITS = ['g', 'kg'];
const blank = { name: '', category: '', priceINR: '', priceUSD: '', unit: 'kg', description: '', details: '', features: '', usage: '', benefits: '', inStock: true, sellBy: 'weight', weightStock: {}, packs: [], gallery: [] };
const blankPack = { label: '', priceINR: '', priceUSD: '', stock: '' };
const countStr = (n) => (typeof n === 'number' ? String(n) : '');
const countNum = (v) => (String(v ?? '').trim() === '' ? null : Number(v));
// Stock is a packet count per size; blank means "not tracked" for that size.
const isCount = (v) => !v || /^\d+$/.test(String(v).trim());
/** A product is sellable while any size is untracked or has packets left. */
const anyLeft = (counts) => counts.length === 0 || counts.some((n) => n === null || n > 0);

// Firestore docs are capped at 1 MB, so uploads are shrunk and stored inline.
const MAX_DIM = 900;
const MAX_TOTAL_CHARS = 850_000;
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * scale);
      c.height = Math.round(im.height * scale);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/webp', 0.8));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} is not a valid image`)); };
    im.src = url;
  });

const price = (label) =>
  Yup.string().trim().required(`${label} is required`).test('num', 'Enter a valid price', (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0));

// Optional weight in kg; blank means "not tracked".
const qty = Yup.string().trim().test('num', 'Enter a number of kg, 0 or more', (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0));

const schema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  category: Yup.string().required('Please select a category'),
  // Per-kg pricing only applies to loose-weight products; fixed packs carry their own prices.
  priceINR: Yup.string().when('sellBy', { is: 'weight', then: () => price('Price (INR)') }),
  priceUSD: Yup.string().when('sellBy', { is: 'weight', then: () => price('Price (USD)') }),
  unit: Yup.string().when('sellBy', { is: 'weight', then: (sch) => sch.trim().required('Unit is required') }),
  packs: Yup.array().when('sellBy', {
    is: 'pack',
    then: (sch) => sch.min(1, 'Add at least one pack size').of(Yup.object({
      label: Yup.string().trim().required('Size is required'),
      priceINR: price('Price (INR)'),
      priceUSD: price('Price (USD)'),
      stock: Yup.string().trim().test('int', 'Whole packets only', isCount),
    })),
  }),
  weightStock: Yup.object().test('counts', 'Stock must be a whole number of packets', (o) => Object.values(o || {}).every(isCount)),
  gallery: Yup.array().test('size', 'Images are too large for one product. Remove some, or use image URLs instead of uploads.', (g) => (g || []).join('').length <= MAX_TOTAL_CHARS),
});

export default function ProductForm() {
  const { id } = useParams();
  const { items, loading, error } = useCollection('products', { sortByCreated: false });
  const existing = items.find((p) => p.id === id);

  return (
    <DataState loading={!!id && loading} error={error}>
      {id && !existing ? <div className="card empty">Product not found.</div> : <ProductEditor key={id || 'new'} id={id} existing={existing} />}
    </DataState>
  );
}

function ProductEditor({ id, existing }) {
  const navigate = useNavigate();
  const isNew = !id;
  const catNames = useCollection('categories', { sortByCreated: false }).items.map((c) => c.name).sort();
  // Sizes a loose product is sold in: the CMS weight options, or the defaults until those are created.
  const quantities = useCollection('quantities', { sortByCreated: false }).items;
  const weightRows = (quantities.length ? quantities : DEFAULT_QUANTITIES.map(([amount, unit]) => ({ label: quantityLabel(amount, unit), value: quantityValue(amount, unit) })))
    .map((w) => ({ label: w.label, value: Number(w.value) }))
    .sort((a, b) => a.value - b.value);
  const [saveErr, setSaveErr] = useState('');
  const [imgErr, setImgErr] = useState('');
  const fileRef = useRef(null);

  const initialValues = useMemo(() => {
    if (!existing) return blank;
    const v = Object.fromEntries(Object.keys(blank).map((k) => [k, existing[k] ?? blank[k]]));
    return {
      ...v,
      packs: (existing.packs || []).map((k) => ({ label: k.label, priceINR: String(k.priceINR ?? ''), priceUSD: String(k.priceUSD ?? ''), stock: typeof k.stock === 'number' ? String(k.stock) : '' })),
      weightStock: Object.fromEntries(Object.entries(existing.weightStock || {}).map(([k, n]) => [k, countStr(n)])),
      features: featuresToHtml(existing.features),
      gallery: [existing.image, ...(existing.images || [])].filter(Boolean),
    };
  }, [existing]);

  const formik = useFormik({
    initialValues,
    validationSchema: schema,
    onSubmit: async (values) => {
      setSaveErr('');
      try {
        const { gallery: g, features, weightStock: stockRows, packs: packRows, ...rest } = values;
        const newId = isNew ? slugify(values.name) : id;
        const byPack = values.sellBy === 'pack';
        const packs = byPack
          ? packRows.map((k) => ({ label: k.label.trim(), priceINR: k.priceINR.trim(), priceUSD: k.priceUSD.trim(), stock: countNum(k.stock) }))
          : [];
        // Cards show the cheapest pack, so keep the top-level price in step with it.
        const cheapest = (key) => String(Math.min(...packs.map((k) => Number(k[key]))));
        const weightStock = byPack ? null : Object.fromEntries(weightRows.map((w) => [w.label, countNum(stockRows[w.label])]));
        const counts = byPack ? packs.map((k) => k.stock) : Object.values(weightStock).filter((n) => n !== null);
        await saveProduct(newId, {
          ...rest,
          ...(byPack ? { priceINR: cheapest('priceINR'), priceUSD: cheapest('priceUSD'), unit: 'pack' } : {}),
          packs,
          weightStock,
          // Replaces the old single kg pool.
          stockGrams: null,
          lowStockGrams: null,
          inStock: values.inStock && anyLeft(counts),
          name: values.name.trim(),
          id: newId,
          image: g[0] || '',
          images: g.slice(1),
          features: featuresFromHtml(features),
        });
        toast.success(isNew ? 'Product created' : 'Product updated');
        navigate('/products');
      } catch (e) {
        setSaveErr(errMessage(e));
        toast.error(errMessage(e));
      }
    },
  });
  const { values, errors, touched } = formik;
  const err = (k) => touched[k] && errors[k];
  const bind = (k) => formik.getFieldProps(k);

  // After a failed submit, bring the first error into view.
  useEffect(() => {
    if (formik.submitCount > 0 && !formik.isSubmitting) {
      requestAnimationFrame(() => document.querySelector('.field-err, .pf-err')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
  }, [formik.submitCount, formik.isSubmitting]);

  const byPack = values.sellBy === 'pack';
  const setPacks = (packs) => {
    formik.setFieldValue('packs', packs);
    syncAvailability(packs.map((k) => countNum(k.stock)));
  };
  // Selling out the last packet flips the product to sold out; restocking brings it back.
  function syncAvailability(counts) {
    if (counts.some((n) => n !== null)) formik.setFieldValue('inStock', anyLeft(counts));
  }
  const setWeightStock = (label, v) => {
    const next = { ...values.weightStock, [label]: v };
    formik.setFieldValue('weightStock', next);
    syncAvailability(weightRows.map((w) => countNum(next[w.label])));
  };
  const setPack = (i, key, v) => setPacks(values.packs.map((k, j) => (j === i ? { ...k, [key]: v } : k)));
  const packField = (i, key, props) => (
    <div>
      <input {...props} value={values.packs[i][key]} onChange={(e) => setPack(i, key, e.target.value)} onBlur={() => formik.setFieldTouched(`packs.${i}.${key}`, true)} />
      {touched.packs?.[i]?.[key] && errors.packs?.[i]?.[key] && <small className="field-err">{errors.packs[i][key]}</small>}
    </div>
  );

  const gallery = values.gallery;
  const setGallery = (g) => formik.setFieldValue('gallery', g);
  const addFiles = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setImgErr('');
    try {
      setGallery([...gallery, ...(await Promise.all(files.map(fileToDataUrl)))]);
    } catch (e2) {
      setImgErr(e2.message);
    }
  };
  const makeMain = (i) => setGallery([gallery[i], ...gallery.filter((_, j) => j !== i)]);
  const removeImg = (i) => setGallery(gallery.filter((_, j) => j !== i));

  return (
    <>
      <PageHead title={isNew ? 'Add product' : 'Edit product'} subtitle={isNew ? 'Fill in the details and add photos.' : existing?.name}>
        <Link to="/products" className="btn"><ArrowLeft size={16} /> Back to products</Link>
      </PageHead>

      <form className="pf" onSubmit={formik.handleSubmit} noValidate>
        <div className="pf-main">
          <section className="card">
            <h3>Basic information</h3>
            <div className="two">
              <Field label="Name" required error={err('name')}><input {...bind('name')} /></Field>
              <Field label="Category" required error={err('category')}>
                <Select
                  options={[...new Set([...catNames, values.category].filter(Boolean))]}
                  value={values.category}
                  onChange={(v) => formik.setFieldValue('category', v)}
                  onBlur={() => formik.setFieldTouched('category', true)}
                  invalid={!!err('category')}
                  placeholder="Select a category"
                  noOptionsMessage={() => 'No categories yet'}
                />
                {catNames.length === 0 && <small className="muted">No categories yet. <Link to="/settings/categories/new">Create one</Link>.</small>}
              </Field>
            </div>
            <Field as="div" label="Description">
              <RichTextEditor value={values.description} onChange={(v) => formik.setFieldValue('description', v)} placeholder="Describe the product" minHeight={140} />
            </Field>
          </section>

          <section className="card">
            <h3>How is it sold?</h3>
            <div className="sell-mode">
              {[
                ['weight', 'By weight', 'Loose items like spices. One per-kg price; customers pick 100g, 250g, 1kg…'],
                ['pack', 'Fixed packs', 'Ready-packed items like pickle jars. Each size has its own price and jar count.'],
              ].map(([key, title, hint]) => (
                <label key={key} className={`sell-opt ${values.sellBy === key ? 'on' : ''}`}>
                  <input type="radio" name="sellBy" checked={values.sellBy === key} onChange={() => formik.setFieldValue('sellBy', key)} />
                  <b>{title}</b>
                  <small>{hint}</small>
                </label>
              ))}
            </div>
          </section>

          {byPack ? (
            <section className="card">
              <h3>Pack sizes</h3>
              <div className="pack-row pack-head"><span>Size</span><span>Price (INR)</span><span>Price (USD)</span><span>Packets in stock</span><span /></div>
              {values.packs.map((_, i) => (
                <div key={i} className="pack-row">
                  {packField(i, 'label', { placeholder: '400g' })}
                  {packField(i, 'priceINR', { placeholder: '350', inputMode: 'decimal' })}
                  {packField(i, 'priceUSD', { placeholder: '4.50', inputMode: 'decimal' })}
                  {packField(i, 'stock', { placeholder: 'Not tracked', inputMode: 'numeric' })}
                  <button type="button" className="pcard-btn danger" title="Remove size" onClick={() => setPacks(values.packs.filter((__, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn pack-add" onClick={() => setPacks([...values.packs, { ...blankPack }])}><Plus size={16} /> Add pack size</button>
              {typeof errors.packs === 'string' && formik.submitCount > 0 && <small className="field-err">{errors.packs}</small>}
              <p className="muted pack-hint">Each size is sold on its own. Enter how many packets you have of each size, for example 20 of 400g. Leave it blank to not count that size; a size at 0 can't be ordered.</p>
            </section>
          ) : (
          <>
          <section className="card">
            <h3>Pricing</h3>
            <div className="three">
              <Field label="Price (INR)" required error={err('priceINR')}><input inputMode="decimal" {...bind('priceINR')} /></Field>
              <Field label="Price (USD)" required error={err('priceUSD')}><input inputMode="decimal" {...bind('priceUSD')} /></Field>
              <Field label="Unit" required error={err('unit')}>
                <Select
                  options={[...new Set([...UNITS, values.unit].filter(Boolean))]}
                  value={values.unit}
                  onChange={(v) => formik.setFieldValue('unit', v)}
                  onBlur={() => formik.setFieldTouched('unit', true)}
                  invalid={!!err('unit')}
                  isSearchable={false}
                  placeholder="Select a unit"
                />
              </Field>
            </div>
          </section>
          <section className="card">
            <h3>Stock</h3>
            <div className="pack-row pack-head stock-grid"><span>Size</span><span>Packets in stock</span></div>
            {weightRows.map((w) => (
              <div key={w.label} className="pack-row stock-grid">
                <span className="stock-size">{w.label}</span>
                <input inputMode="numeric" placeholder="Not tracked" value={values.weightStock[w.label] ?? ''} onChange={(e) => setWeightStock(w.label, e.target.value)} />
              </div>
            ))}
            {errors.weightStock && <small className="field-err">{errors.weightStock}</small>}
            <p className="muted pack-hint">Enter how many packets you have of each size, for example 20 of 250g. Leave it blank to not count that size; a size at 0 can't be ordered.</p>
          </section>
          </>
          )}

          <section className="card">
            <h3>Product details</h3>
            <Field label="Details"><input placeholder="Purity: 100% Pure. Heat Level: Medium." {...bind('details')} /></Field>
            <Field as="div" label="Features">
              <RichTextEditor value={values.features} onChange={(v) => formik.setFieldValue('features', v)} placeholder="Key features: use the bullet list for one point per line" minHeight={110} />
            </Field>
            <div className="two">
              <Field as="div" label="Usage">
                <RichTextEditor value={values.usage} onChange={(v) => formik.setFieldValue('usage', v)} placeholder="How to use it" minHeight={110} />
              </Field>
              <Field as="div" label="Benefits">
                <RichTextEditor value={values.benefits} onChange={(v) => formik.setFieldValue('benefits', v)} placeholder="Health benefits" minHeight={110} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="pf-side">
          <section className="card">
            <h3>Images</h3>
            <div className="pf-hero">
              {gallery[0] ? <img src={img(gallery[0])} alt="Main" /> : (
                <button type="button" className="pf-empty" onClick={() => fileRef.current.click()}>
                  <ImagePlus size={30} />
                  <span>Upload main image</span>
                </button>
              )}
            </div>
            <div className="pf-thumbs">
              {gallery.map((src, i) => (
                <div key={i} className={`pf-thumb ${i === 0 ? 'is-main' : ''}`} title={i === 0 ? 'Main image' : 'Click to make main'}>
                  <img src={img(src)} alt="" onClick={() => makeMain(i)} />
                  <button type="button" className="pf-x" onClick={() => removeImg(i)} aria-label="Remove image"><X size={12} /></button>
                </div>
              ))}
              <button type="button" className="pf-thumb pf-add" onClick={() => fileRef.current.click()} aria-label="Add image"><Plus size={20} /></button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />
            <p className="muted pf-hint">The first image is the main one. Click a thumbnail to make it main.</p>
            {(errors.gallery || imgErr) && <small className="field-err">{errors.gallery || imgErr}</small>}
          </section>

          <section className="card">
            <h3>Availability</h3>
            <div className="avail">
              <p className="muted">Packet counts are entered per size above. Confirming an order deducts its packets; cancelling returns them. A product is sold out automatically when every counted size reaches 0.</p>
              <Toggle checked={values.inStock} onChange={(v) => formik.setFieldValue('inStock', v)} onLabel="In stock" offLabel="Out of stock" />
              <p className="muted">{values.inStock ? 'Customers can buy this product on the website.' : 'Shown as sold out on the website, and cannot be ordered.'}</p>
            </div>
          </section>
        </aside>

        <div className="pf-bar">
          {saveErr && <span className="pf-err">{saveErr}</span>}
          <span className="grow" />
          <Link to="/products" className="btn">Cancel</Link>
          <button type="submit" className="btn primary" disabled={formik.isSubmitting}>{formik.isSubmitting ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}</button>
        </div>
      </form>
    </>
  );
}
