import React, { useState } from 'react';

/**
 * Admin login page.
 * TODO: POST /api/admin/login → store JWT in localStorage → redirect to dashboard.
 */
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // TODO: POST /api/admin/login with { email, password }
    // TODO: on success: localStorage.setItem('token', jwt); navigate to dashboard
    // TODO: on failure: setError('Invalid credentials')
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-blue-900 mb-6">NavyeSIM Admin</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-blue-900 text-white rounded py-2 text-sm font-medium hover:bg-blue-800">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
