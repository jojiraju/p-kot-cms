import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useCollection, saveQuantity, replaceQuantity, quantityLabel, quantityValue, slugify, errMessage } from '../lib/api';
import { PageHead, DataState, Field, Select } from '../components/ui';

const UNITS = ['g', 'kg'];

export default function QuantityForm() {
  const { id } = useParams();
  const q = useCollection('quantities', { sortByCreated: false });
  const existing = q.items.find((i) => i.id === id);

  return (
    <DataState loading={!!id && q.loading} error={q.error}>
      {id && !existing ? <div className="card empty">Weight option not found.</div> : <QuantityEditor key={id || 'new'} id={id} existing={existing} all={q.items} />}
    </DataState>
  );
}

function QuantityEditor({ id, existing, all }) {
  const navigate = useNavigate();
  const isNew = !id;
  const [saveErr, setSaveErr] = useState('');

  const schema = useMemo(
    () =>
      Yup.object({
        amount: Yup.number().typeError('Enter a number').positive('Must be greater than 0').max(100000, 'That is too large').required('Weight is required'),
        unit: Yup.string().oneOf(UNITS).required('Choose a unit'),
      }).test('unique', 'This weight already exists', function (v) {
        if (!v?.amount || !v?.unit) return true;
        const taken = all.some((i) => i.id === slugify(quantityLabel(v.amount, v.unit)) && i.id !== id);
        return taken ? this.createError({ path: 'amount', message: 'This weight already exists' }) : true;
      }),
    [all, id],
  );

  const formik = useFormik({
    initialValues: { amount: existing ? String(existing.amount) : '', unit: existing?.unit || 'g' },
    validationSchema: schema,
    onSubmit: async ({ amount, unit }) => {
      setSaveErr('');
      try {
        if (isNew) await saveQuantity(amount, unit);
        else await replaceQuantity(id, amount, unit);
        toast.success(isNew ? 'Weight added' : 'Weight updated');
        navigate('/settings/quantities');
      } catch (e) {
        setSaveErr(errMessage(e));
      }
    },
  });
  const { values } = formik;
  const err = (k) => formik.touched[k] && formik.errors[k];
  const valid = Number(values.amount) > 0;

  return (
    <>
      <PageHead title={isNew ? 'Add weight option' : 'Edit weight option'} subtitle={isNew ? 'A weight customers can choose when buying a product on the website.' : existing.label}>
        <Link to="/settings/quantities" className="btn"><ArrowLeft size={16} /> Back to weights</Link>
      </PageHead>

      <form className="card cat-form" onSubmit={formik.handleSubmit} noValidate>
        <div className="two">
          <Field label="Weight" required error={err('amount')}>
            <input inputMode="decimal" autoFocus placeholder="e.g. 250" {...formik.getFieldProps('amount')} />
          </Field>
          <Field label="Unit" required error={err('unit')}>
            <Select options={UNITS} value={values.unit} onChange={(v) => formik.setFieldValue('unit', v)} isSearchable={false} />
          </Field>
        </div>
        {valid && (
          <p className="muted">
            Shown on the website as <b>{quantityLabel(values.amount, values.unit)}</b>, priced at{' '}
            {Math.round(quantityValue(values.amount, values.unit) * 10000) / 100}% of the per-kg price.
          </p>
        )}
        {saveErr && <p className="pf-err">{saveErr}</p>}
        <div className="drawer-actions">
          <button type="submit" className="btn primary" disabled={formik.isSubmitting}>{formik.isSubmitting ? 'Saving…' : isNew ? 'Add weight' : 'Save changes'}</button>
          <Link to="/settings/quantities" className="btn">Cancel</Link>
        </div>
      </form>
    </>
  );
}
