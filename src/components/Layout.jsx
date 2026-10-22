import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, MessageSquare, Users, Package, LogOut, Menu, Settings, ChevronDown, ChevronRight, CalendarDays, Scale, Tags } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../lib/auth';
import { useCollection, messageStatus } from '../lib/api';
import { useNewItemAlerts } from '../lib/alerts';
import NotifyButton from './NotifyButton';
import { ConfirmModal } from './ui';

const SECTIONS = {
  '': 'Dashboard', orders: 'Orders', messages: 'Messages', customers: 'Customers', products: 'Products', settings: 'Settings', categories: 'Categories', quantities: 'Weights',
};
const crumbsFor = (pathname) => {
  const [a, b, c] = pathname.split('/').filter(Boolean);
  const out = [SECTIONS[a ?? ''] || 'Dashboard'];
  if (a === 'settings') out.push(SECTIONS[b] || 'Settings');
  const detail = a === 'settings' ? c : b;
  if (detail) out.push(detail === 'new' ? 'Add' : a === 'messages' ? 'View' : 'Edit');
  return out;
};

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, badge: 'orders' },
  { to: '/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('pkot.sidebar') === 'collapsed'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('pkot.sidebar', collapsed ? 'collapsed' : 'open'); } catch { /* storage unavailable */ }
  }, [collapsed]);
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/settings'));
  // Small screens slide the sidebar in; wide screens collapse it to icons.
  const toggleMenu = () => (window.matchMedia('(max-width: 900px)').matches ? setOpen(true) : setCollapsed((c) => !c));
  const ordersQ = useCollection('orders');
  const messagesQ = useCollection('messages');
  const orders = ordersQ.items;
  const messages = messagesQ.items;
  useNewItemAlerts(ordersQ, (o) => ({ title: 'New order', body: `${o.name || 'A customer'} · ${o.productName || 'product'}${o.quantity ? ` · ${o.quantity} × ${o.weight || ''}` : ''}` }));
  useNewItemAlerts(messagesQ, (m) => ({ title: 'New message', body: `${m.name || 'Someone'}${m.subject ? `: ${m.subject}` : ''}` }));
  const badges = {
    orders: orders.filter((o) => o.status === 'new').length,
    messages: messages.filter((m) => messageStatus(m) === 'pending').length,
  };

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="P-KOT Spices" />
          <div>
            <strong>P-KOT</strong>
            <small>SPICES · ADMIN</small>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className="nav-link" data-tooltip-id="side-tip" data-tooltip-content={label}>
              <Icon size={18} />
              <span>{label}</span>
              {badge && badges[badge] > 0 && <em className="nav-badge">{badges[badge]}</em>}
            </NavLink>
          ))}
          <button className="nav-link nav-group" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} data-tooltip-id="side-tip" data-tooltip-content="Settings">
            <Settings size={18} />
            <span>Settings</span>
            <ChevronDown size={16} className={`chev ${settingsOpen ? 'open' : ''}`} />
          </button>
          {settingsOpen && (
            <>
              <NavLink to="/settings/categories" onClick={() => setOpen(false)} className="nav-link nav-sub" data-tooltip-id="side-tip" data-tooltip-content="Categories">
                <Tags size={16} />
                <span>Categories</span>
              </NavLink>
              <NavLink to="/settings/quantities" onClick={() => setOpen(false)} className="nav-link nav-sub" data-tooltip-id="side-tip" data-tooltip-content="Weights">
                <Scale size={16} />
                <span>Weights</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{user.displayName?.[0]?.toUpperCase()}</div>
          <div className="who">
            <strong>{user.displayName}</strong>
            <small>Administrator</small>
          </div>
          <button className="icon-btn" onClick={() => setConfirmOut(true)} aria-label="Log out" data-tooltip-id="tip" data-tooltip-content="Log out" data-tooltip-place={collapsed ? 'right' : 'top'}><LogOut size={18} /></button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={toggleMenu} aria-label="Toggle menu" data-tooltip-id="tip" data-tooltip-place="bottom" data-tooltip-content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Menu size={20} /></button>
          <div className="crumbs">
            {crumbsFor(pathname).map((c, i, arr) => (
              <span key={i} className={i === arr.length - 1 ? 'last' : ''}>
                {i > 0 && <ChevronRight size={14} />}
                {c}
              </span>
            ))}
          </div>
          <span className="grow" />
          <span className="top-date"><CalendarDays size={15} /> {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <NotifyButton />
          <NavLink to="/orders" className="top-chip" data-tooltip-id="tip" data-tooltip-place="bottom" data-tooltip-content={`${badges.orders} new order${badges.orders === 1 ? '' : 's'}`}>
            <ShoppingBag size={17} />
            {badges.orders > 0 && <em>{badges.orders}</em>}
          </NavLink>
          <NavLink to="/messages" className="top-chip" data-tooltip-id="tip" data-tooltip-place="bottom" data-tooltip-content={`${badges.messages} pending message${badges.messages === 1 ? '' : 's'}`}>
            <MessageSquare size={17} />
            {badges.messages > 0 && <em>{badges.messages}</em>}
          </NavLink>
          <div className="top-user">
            <div className="avatar sm">{user.displayName?.[0]?.toUpperCase()}</div>
            <span>{user.displayName}</span>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      <Tooltip id="side-tip" place="right" offset={14} className="tip" classNameArrow="tip-arrow" delayShow={80} hidden={!collapsed} />
      <Tooltip id="tip" offset={10} className="tip" classNameArrow="tip-arrow" delayShow={120} />
      <ConfirmModal
        open={confirmOut}
        title="Log out?"
        message="Are you sure you want to log out of the admin panel?"
        confirmLabel="Log out"
        onConfirm={logout}
        onCancel={() => setConfirmOut(false)}
      />
    </div>
  );
}
