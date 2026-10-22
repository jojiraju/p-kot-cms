import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ArrowLeft, ImagePlus, Plus, X } from 'lucide-react';
import { useCollection, saveProduct, slugify, errMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { PageHead, DataState, Field, Select, Toggle } from '../components/ui';
import RichTextEditor, { featuresFromHtml, featuresToHtml } from '../components/RichTextEditor';

const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const img = (src) => (src?.startsWith('/') ? SITE + src : src);
const UNITS = ['g', 'kg'];
const blank = { name: '', category: '', priceINR: '', priceUSD: '', unit: 'kg', description: '', details: '', features: '', usage: '', benefits: '', inStock: true, gallery: [] };

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

const schema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  category: Yup.string().required('Please select a category'),
  priceINR: price('Price (INR)'),
  priceUSD: price('Price (USD)'),
  unit: Yup.string().trim().required('Unit is required'),
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
  const [saveErr, setSaveErr] = useState('');
  const [imgErr, setImgErr] = useState('');
  const fileRef = useRef(null);

  const initialValues = useMemo(() => {
    if (!existing) return blank;
    const v = Object.fromEntries(Object.keys(blank).map((k) => [k, existing[k] ?? blank[k]]));
    return {
      ...v,
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
        const { gallery: g, features, ...rest } = values;
        const newId = isNew ? slugify(values.name) : id;
        await saveProduct(newId, {
          ...rest,
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
