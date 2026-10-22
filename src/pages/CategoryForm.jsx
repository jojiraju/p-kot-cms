import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ArrowLeft } from 'lucide-react';
import { useCollection, saveCategory, renameCategory, slugify, errMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { PageHead, DataState, Field } from '../components/ui';

export default function CategoryForm() {
  const { id } = useParams();
  const cats = useCollection('categories', { sortByCreated: false });
  const existing = cats.items.find((c) => c.id === id);

  return (
    <DataState loading={!!id && cats.loading} error={cats.error}>
      {id && !existing ? <div className="card empty">Category not found.</div> : <CategoryEditor key={id || 'new'} id={id} existing={existing} all={cats.items} />}
    </DataState>
  );
}

function CategoryEditor({ id, existing, all }) {
  const navigate = useNavigate();
  const isNew = !id;
  const products = useCollection('products', { sortByCreated: false }).items;
  const [saveErr, setSaveErr] = useState('');

  const schema = useMemo(
    () =>
      Yup.object({
        name: Yup.string()
          .trim()
          .required('Name is required')
          .max(60, 'Keep the name under 60 characters')
          .test('slug', 'Please enter a valid name', (v) => !v || !!slugify(v))
          .test('unique', 'A category with this name already exists', (v) => !v || !all.some((c) => c.id === slugify(v) && c.id !== id)),
        description: Yup.string().max(300, 'Keep the description under 300 characters'),
      }),
    [all, id],
  );

  const formik = useFormik({
    initialValues: { name: existing?.name || '', description: existing?.description || '' },
    validationSchema: schema,
    onSubmit: async ({ name, description }) => {
      setSaveErr('');
      try {
        if (isNew) await saveCategory(name.trim(), description.trim());
        else await renameCategory(id, existing.name, name.trim(), products, description.trim());
        toast.success(isNew ? 'Category created' : 'Category updated');
        navigate('/settings/categories');
      } catch (e) {
        setSaveErr(errMessage(e));
        toast.error(errMessage(e));
      }
    },
  });
  const err = (k) => formik.touched[k] && formik.errors[k];

  const inUse = existing ? products.filter((p) => p.category === existing.name).length : 0;
  const renaming = !isNew && formik.values.name.trim() !== existing.name && inUse > 0;


  return (
    <>
      <PageHead title={isNew ? 'Add category' : 'Edit category'} subtitle={isNew ? 'Name it and say what it covers.' : existing.name}>
        <Link to="/settings/categories" className="btn"><ArrowLeft size={16} /> Back to categories</Link>
      </PageHead>

      <form className="card cat-form" onSubmit={formik.handleSubmit} noValidate>
        <Field label="Name" required error={err('name')}>
          <input autoFocus placeholder="e.g. Pickles" {...formik.getFieldProps('name')} />
        </Field>
        <Field label="Description" error={err('description')}>
          <textarea rows="4" placeholder="Short description of this category" {...formik.getFieldProps('description')} />
        </Field>
        {renaming && <p className="muted">Renaming will also update {inUse} product{inUse === 1 ? '' : 's'}.</p>}
        {saveErr && <p className="pf-err">{saveErr}</p>}
        <div className="drawer-actions">
          <button type="submit" className="btn primary" disabled={formik.isSubmitting}>{formik.isSubmitting ? 'Saving…' : isNew ? 'Create category' : 'Save changes'}</button>
          <Link to="/settings/categories" className="btn">Cancel</Link>
        </div>
      </form>
    </>
  );
}
