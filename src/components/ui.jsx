import ReactSelect from 'react-select';
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

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export const Empty =({ text }) => <div className="empty">{text}</div>;

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

// `as="div"` for fields that hold several controls (a label would forward clicks to the first one).
export const Field = ({ label, error, required, as: Tag = 'label', children }) => (
  <Tag className={`field ${error ? 'invalid' : ''}`}>
    <span>{label}{required && <i className="req" aria-hidden="true"> *</i>}</span>
    {children}
    {error && <small className="field-err">{error}</small>}
  </Tag>
);

const selectStyles = {
  control: (b, { isFocused, selectProps }) => ({
    ...b, minHeight: 46, background: 'var(--bg-2)', borderRadius: 10, cursor: 'pointer',
    borderColor: selectProps.invalid ? 'var(--rose)' : isFocused ? 'var(--primary)' : 'var(--line)',
    boxShadow: isFocused ? '0 0 0 3px rgba(249, 168, 37, .15)' : 'none',
    '&:hover': { borderColor: selectProps.invalid ? 'var(--rose)' : isFocused ? 'var(--primary)' : 'rgba(249, 168, 37, .5)' },
  }),
  valueContainer: (b) => ({ ...b, padding: '2px 12px' }),
  singleValue: (b) => ({ ...b, color: 'var(--text)' }),
  input: (b) => ({ ...b, color: 'var(--text)' }),
  placeholder: (b) => ({ ...b, color: 'var(--muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b, { isFocused }) => ({ ...b, color: isFocused ? 'var(--primary)' : 'var(--text)', opacity: 0.8, padding: '0 12px', transition: 'color .15s' }),
  menu: (b) => ({ ...b, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0, 0, 0, .55)', zIndex: 40 }),
  menuList: (b) => ({ ...b, padding: 6 }),
  option: (b, { isFocused, isSelected }) => ({
    ...b, borderRadius: 8, cursor: 'pointer', color: isSelected ? '#fff' : 'var(--text)',
    background: isSelected ? 'var(--secondary)' : isFocused ? 'rgba(249, 168, 37, .14)' : 'transparent',
    ':active': { background: 'rgba(249, 168, 37, .25)' },
  }),
  noOptionsMessage: (b) => ({ ...b, color: 'var(--muted)' }),
};

/** Themed react-select for plain string options: <Select options={['A', 'B']} value="A" onChange={(v) => …} /> */
const compactStyles = {
  ...selectStyles,
  control: (b, st) => ({ ...selectStyles.control(b, st), minHeight: 34, borderRadius: 8 }),
  valueContainer: (b) => ({ ...b, padding: '0 8px' }),
  singleValue: (b) => ({ ...b, color: 'var(--text)', fontSize: 13 }),
  dropdownIndicator: (b) => ({ ...b, color: 'var(--muted)', padding: 4 }),
  option: (b, st) => ({ ...selectStyles.option(b, st), fontSize: 13, padding: '7px 10px' }),
  menu: (b) => ({ ...selectStyles.menu(b), minWidth: 84 }),
};

export function Select({ options, value, onChange, placeholder = 'Select…', compact = false, ...rest }) {
  const opts = options.map((o) => ({ value: o, label: o }));
  return (
    <ReactSelect
      options={opts}
      value={opts.find((o) => o.value === value) || null}
      onChange={(o) => onChange(o ? o.value : '')}
      placeholder={placeholder}
      styles={compact ? compactStyles : selectStyles}
      isSearchable
      {...rest}
    />
  );
}

/** On/off switch: <Toggle checked={v} onChange={setV} onLabel="In stock" offLabel="Out of stock" /> */
export function Toggle({ checked, onChange, onLabel = 'On', offLabel = 'Off', ...rest }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} {...rest}>
      <span className="toggle-track"><i /></span>
      <span className="toggle-text">{checked ? onLabel : offLabel}</span>
    </button>
  );
}
