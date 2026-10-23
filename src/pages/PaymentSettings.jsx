import { useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { usePaymentSettings, savePaymentSettings, PAYMENT_DEFAULTS, errMessage } from '../lib/api';
import { PageHead, DataState, Field } from '../components/ui';

const schema = Yup.object({
  upiId: Yup.string().trim().required('UPI ID is required').matches(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, 'Enter a UPI ID like name@bank'),
  accountName: Yup.string().trim().required('Account holder name is required'),
  bankName: Yup.string().trim(),
  accountNumber: Yup.string().trim().matches(/^(\d{9,18})?$/, 'Account number is 9 to 18 digits'),
  ifsc: Yup.string().trim().matches(/^([A-Za-z]{4}0[A-Za-z0-9]{6})?$/, 'IFSC looks like SBIN0070710'),
  note: Yup.string().trim().max(300, 'Keep it under 300 characters'),
});

export default function PaymentSettings() {
  const { settings, loading, error } = usePaymentSettings();
  return (
    <DataState loading={loading} error={error}>
      <PaymentEditor settings={settings} />
    </DataState>
  );
}

function PaymentEditor({ settings }) {
  const [saveErr, setSaveErr] = useState('');
  // Until it has been saved once, the form starts from the details we were given.
  const initialValues = useMemo(() => ({ ...PAYMENT_DEFAULTS, ...(settings || {}) }), [settings]);
  const formik = useFormik({
    initialValues,
    validationSchema: schema,
    onSubmit: async (v) => {
      setSaveErr('');
      try {
        await savePaymentSettings({
          upiId: v.upiId.trim(), accountName: v.accountName.trim(), bankName: v.bankName.trim(),
          accountNumber: v.accountNumber.trim(), ifsc: v.ifsc.trim().toUpperCase(), note: v.note.trim(),
        });
        toast.success('Payment details saved');
      } catch (e) {
        setSaveErr(errMessage(e));
        toast.error(errMessage(e));
      }
    },
  });
  const err = (k) => formik.touched[k] && formik.errors[k];
  const bind = (k) => formik.getFieldProps(k);

  return (
    <>
      <PageHead title="Payment details" subtitle="Shown to customers on the website's payment page and sent to them on WhatsApp." />
      {!settings && <p className="muted" style={{ marginBottom: 16 }}>These details have not been saved yet, so the website cannot show them. Check them and press Save.</p>}
      <form className="pf single" onSubmit={formik.handleSubmit} noValidate>
        <div className="pf-main">
          <section className="card">
            <h3>UPI</h3>
            <Field label="UPI ID" required error={err('upiId')}><input placeholder="name@bank" {...bind('upiId')} /></Field>
            <p className="muted pack-hint">The website builds a QR code from this for each order, with the exact amount filled in.</p>
          </section>
          <section className="card">
            <h3>Bank account</h3>
            <div className="two">
              <Field label="Account holder name" required error={err('accountName')}><input {...bind('accountName')} /></Field>
              <Field label="Bank" error={err('bankName')}><input placeholder="SBI" {...bind('bankName')} /></Field>
            </div>
            <div className="two">
              <Field label="Account number" error={err('accountNumber')}><input inputMode="numeric" {...bind('accountNumber')} /></Field>
              <Field label="IFSC" error={err('ifsc')}><input {...bind('ifsc')} /></Field>
            </div>
          </section>
          <section className="card">
            <h3>Note for customers</h3>
            <Field label="Optional" error={err('note')}>
              <textarea rows="3" placeholder="After paying, please send the screenshot on WhatsApp." {...bind('note')} />
            </Field>
          </section>
        </div>
        <div className="pf-bar">
          {saveErr && <span className="pf-err">{saveErr}</span>}
          <span className="grow" />
          <button type="submit" className="btn primary" disabled={formik.isSubmitting}>{formik.isSubmitting ? 'Saving…' : 'Save payment details'}</button>
        </div>
      </form>
    </>
  );
}
