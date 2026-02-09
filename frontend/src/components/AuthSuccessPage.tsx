import { useEffect, useState } from 'react';

interface AuthUser {
  name: string;
  email: string;
  oid: string;
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; message: string };

export default function AuthSuccessPage() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setState({ status: 'authenticated', user: data.user });
        } else {
          setState({ status: 'error', message: 'Not authenticated.' });
        }
      })
      .catch(() => {
        setState({ status: 'error', message: 'Failed to verify authentication.' });
      });
  }, []);

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e8ec' }}>
      <div className="card-sharp p-10 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-clinic-500 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">+</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-steel-900 tracking-tight">OnCall</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-steel-500 mb-8">
          Scheduling System
        </p>

        {/* Loading */}
        {state.status === 'loading' && (
          <p className="text-sm text-steel-500 font-mono">Verifying session...</p>
        )}

        {/* Authenticated */}
        {state.status === 'authenticated' && (
          <>
            <div className="w-14 h-14 bg-clinic-100 border-2 border-clinic-300 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-clinic-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-steel-900 mb-1">Authentication Successful</h2>
            <p className="text-sm text-steel-600 font-mono mb-1">{state.user.name}</p>
            <p className="text-xs text-steel-400 font-mono mb-6">{state.user.email}</p>

            <a
              href="/"
              className="block w-full px-6 py-3 bg-clinic-500 text-white font-semibold text-sm uppercase tracking-wide hover:bg-clinic-600 transition-colors border-2 border-clinic-600 shadow-sharp text-center"
            >
              Go to OnCall
            </a>
            <button
              onClick={handleLogout}
              className="mt-3 w-full px-6 py-2 bg-white text-steel-600 font-semibold text-sm uppercase tracking-wide hover:bg-steel-50 transition-colors border-2 border-steel-200 cursor-pointer"
            >
              Logout
            </button>
          </>
        )}

        {/* Error */}
        {state.status === 'error' && (
          <>
            <div className="w-14 h-14 bg-clay-50 border-2 border-clay-300 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-clay-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-steel-900 mb-1">Authentication Failed</h2>
            <p className="text-sm text-steel-500 mb-6">{state.message}</p>
            <a
              href="/welcome"
              className="block text-sm text-clinic-600 hover:text-clinic-700 font-mono transition-colors"
            >
              &larr; Back to Login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
