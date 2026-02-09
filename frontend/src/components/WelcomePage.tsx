import { useEffect, useState } from 'react';

export default function WelcomePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      const messages: Record<string, string> = {
        login_failed: 'Login request failed. Please try again.',
        no_code: 'No authorization code received.',
        auth_failed: 'Authentication failed. Please try again.',
      };
      setError(messages[err] || 'An error occurred.');
    }
  }, []);

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

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-2 bg-clay-50 border-2 border-clay-200 text-clay-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-clay-500 hover:text-clay-700 font-bold ml-4">&times;</button>
          </div>
        )}

        {/* Login button */}
        <button
          onClick={() => { window.location.href = '/api/auth/login'; }}
          className="w-full px-6 py-3 bg-clinic-500 text-white font-semibold text-sm uppercase tracking-wide hover:bg-clinic-600 transition-colors border-2 border-clinic-600 shadow-sharp cursor-pointer"
        >
          Login with Microsoft
        </button>

      </div>
    </div>
  );
}
