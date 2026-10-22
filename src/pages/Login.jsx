import { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      setError('Invalid username or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark big">🌶️</div>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage P-KOT Spices orders and enquiries.</p>

        <label className="field icon-field">
          <span>Username</span>
          <div><User size={16} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus /></div>
        </label>
        <label className="field icon-field">
          <span>Password</span>
          <div>
            <Lock size={16} />
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Toggle password">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </label>

        {error && <div className="form-error">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
