import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Preloader from './components/Preloader';
import { AuthProvider } from './lib/auth';
import { Toaster } from 'react-hot-toast';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Preloader />
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#2a1c16',
              color: '#fdf4e3',
              border: '1px solid rgba(249, 168, 37, 0.3)',
              borderRadius: '12px',
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontSize: '14px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            },
            success: { iconTheme: { primary: '#f9a825', secondary: '#0f0a08' } },
            error: { style: { border: '1px solid rgba(239, 90, 122, 0.6)' }, iconTheme: { primary: '#ef5a7a', secondary: '#0f0a08' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
