import React from 'react';

const TOKEN_KEY = 'navyesim_admin_token';

const NAV_LINKS = [
  { label: 'Dashboard',    page: 'dashboard' },
  { label: 'Countries',    page: 'countries' },
  { label: 'Vendors',      page: 'vendors' },
  { label: 'Packages',     page: 'packages' },
  { label: 'Margin Rules', page: 'margin-rules' },
  { label: 'Orders',       page: 'orders' },
  { label: 'Settings',     page: 'settings' },
];

/**
 * Admin sidebar (M19).
 * Props:
 *   activePage  — current page key (string)
 *   onNavigate  — (page: string) => void
 *   onLogout    — () => void
 */
export default function Sidebar({ activePage, onNavigate, onLogout }) {
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-blue-900">NavyeSIM</span>
        <span className="ml-1 text-xs text-gray-400">Admin</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4">
        {NAV_LINKS.map(({ label, page }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={[
                'w-full text-left block px-6 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-900 font-semibold border-r-2 border-blue-900'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-900',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded px-3 py-2 text-left transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
