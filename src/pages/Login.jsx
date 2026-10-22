import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../lib/auth';

const schema = Yup.object({
  username: Yup.string().trim().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: { username: '', password: '' },
    validationSchema: schema,
    onSubmit: async ({ username, password }) => {
      setError('');
      try {
        await login(username, password);
      } catch {
        setError('Invalid username or password.');
      }
    },
  });
  const err = (k) => formik.touched[k] && formik.errors[k];

  return (
    <div className="login-wrap">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <form className="login-card" onSubmit={formik.handleSubmit} noValidate>
        <img className="brand-logo big" src="/logo.png" alt="P-KOT Spices" />
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage P-KOT Spices orders and enquiries.</p>

        <label className={`field icon-field ${err('username') ? 'invalid' : ''}`}>
          <span>Username<i className="req" aria-hidden="true"> *</i></span>
          <div><User size={16} /><input autoComplete="username" autoFocus {...formik.getFieldProps('username')} /></div>
          {err('username') && <small className="field-err">{formik.errors.username}</small>}
        </label>
        <label className={`field icon-field ${err('password') ? 'invalid' : ''}`}>
          <span>Password<i className="req" aria-hidden="true"> *</i></span>
          <div>
            <Lock size={16} />
            <input type={show ? 'text' : 'password'} autoComplete="current-password" {...formik.getFieldProps('password')} />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Toggle password">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          {err('password') && <small className="field-err">{formik.errors.password}</small>}
        </label>

        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn primary block" disabled={formik.isSubmitting}>{formik.isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
