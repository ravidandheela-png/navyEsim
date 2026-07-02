import React from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Countries from './pages/Countries';
import Packages from './pages/Packages';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import MarginRules from './pages/MarginRules';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Login from './pages/Login';

/**
 * Root admin app component.
 * TODO: add React Router for page navigation.
 * TODO: implement auth state — show Login if no JWT in localStorage.
 */
export default function App() {
  // TODO: const [page, setPage] = useState('dashboard');
  // TODO: const [isAuthenticated, setIsAuthenticated] = useState(false);
  // TODO: if (!isAuthenticated) return <Login />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        {/* TODO: render active page based on router */}
        <Dashboard />
      </main>
    </div>
  );
}
