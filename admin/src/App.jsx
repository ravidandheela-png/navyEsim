import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Countries from './pages/Countries';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Packages from './pages/Packages';
import MarginRules from './pages/MarginRules';
import Orders from './pages/Orders';
import Settings from './pages/Settings';

const TOKEN_KEY = 'navyesim_admin_token';

/** Placeholder for pages not yet implemented */
function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-2xl font-semibold mb-2">{title}</p>
      <p className="text-sm">Coming soon — not yet implemented.</p>
    </div>
  );
}

/** Render the active page component */
function PageContent({ page, onNavigate }) {
  switch (page) {
    case 'dashboard':   return <Dashboard onNavigate={onNavigate} />;
    case 'countries':   return <Countries />;
    case 'vendors':     return <Vendors onNavigate={onNavigate} />;
    case 'vendor-detail': return <VendorDetail onNavigate={onNavigate} />;
    case 'packages':    return <Packages />;
    case 'margin-rules': return <MarginRules />;
    case 'orders':      return <Orders />;
    case 'settings':    return <Settings />;
    default:            return <Placeholder title={page} />;
  }
}

/**
 * Root admin app (M19).
 *
 * Auth flow:
 *   - On mount: read navyesim_admin_token from localStorage.
 *   - If no token → show <Login />.
 *   - If token exists → show admin layout (Sidebar + page content).
 *   - Login success → setToken → show admin layout.
 *   - Logout → clear token → show <Login />.
 *
 * Navigation:
 *   - activePage state drives which page component is rendered.
 *   - Sidebar calls onNavigate(page) to switch pages.
 *   - No external router library required.
 */
export default function App() {
  const [token,      setToken]      = useState(() => localStorage.getItem(TOKEN_KEY));
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogin = (jwt) => {
    setToken(jwt);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setActivePage('dashboard');
  };

  // ── Not authenticated → show Login ─────────────────────────────────────────
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  // ── Authenticated → show admin layout ──────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-6 overflow-auto">
        <PageContent page={activePage} onNavigate={setActivePage} />
      </main>
    </div>
  );
}
