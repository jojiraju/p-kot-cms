import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { isConfigured } from './lib/firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Messages from './pages/Messages';
import Customers from './pages/Customers';
import Products from './pages/Products';

export default function App() {
  const { user, loading } = useAuth();

  if (!isConfigured) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Firebase not configured</h1>
          <p className="muted">
            Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase web config and restart{' '}
            <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="messages" element={<Messages />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
