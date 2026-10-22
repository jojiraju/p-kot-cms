import { X, Search } from 'lucide-react';

export const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status}</span>;

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="search">
      <Search size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Chips({ options, value, onChange, counts = {} }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} className={`chip ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>
          {o}
          {counts[o] != null && <span className="chip-count">{counts[o]}</span>}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export const Empty = ({ text }) => <div className="empty">{text}</div>;

export function DataState({ loading, error, children }) {
  if (loading) return <div className="empty"><div className="spinner" /></div>;
  if (error) {
    return (
      <div className="empty error">
        Could not load data: {error.code === 'permission-denied' ? 'permission denied — publish firestore.rules and make sure this user is an admin.' : error.message}
      </div>
    );
  }
  return children;
}

export const Field = ({ label, children }) => (
  <label className="field"><span>{label}</span>{children}</label>
);
