import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, MessageSquare, Users, Package, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCollection } from '../lib/api';

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
  const orders = useCollection('orders').items;
  const messages = useCollection('messages').items;
  const badges = {
    orders: orders.filter((o) => o.status === 'new').length,
    messages: messages.filter((m) => m.status === 'unread').length,
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">🌶️</span>
          <div>
            <strong>P-KOT</strong>
            <small>SPICES · ADMIN</small>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className="nav-link">
              <Icon size={18} />
              <span>{label}</span>
              {badge && badges[badge] > 0 && <em className="nav-badge">{badges[badge]}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{user.username?.[0]?.toUpperCase()}</div>
          <div className="who">
            <strong>{user.username}</strong>
            <small>Administrator</small>
          </div>
          <button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <strong>P-KOT Spices</strong>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
