import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import WelcomePage from './components/WelcomePage';
import AuthSuccessPage from './components/AuthSuccessPage';
import './index.css';

function Root() {
  const path = window.location.pathname;

  if (path === '/welcome') {
    return <WelcomePage />;
  }
  if (path === '/auth/success') {
    return <AuthSuccessPage />;
  }

  return <AuthGate />;
}

function AuthGate() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => setStatus('unauthenticated'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-steel-100">
        <div className="text-steel-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    window.location.href = '/welcome';
    return null;
  }

  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
