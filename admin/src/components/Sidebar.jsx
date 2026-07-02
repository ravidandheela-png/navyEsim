import React from 'react';

/**
 * Admin sidebar navigation component.
 * TODO: highlight active page, wire up navigation.
 */
export default function Sidebar() {
  const links = [
    { label: 'Dashboard',    href: '/dashboard' },
    { label: 'Countries',    href: '/countries' },
    { label: 'Vendors',      href: '/vendors' },
    { label: 'Packages',     href: '/packages' },
    { label: 'Margin Rules', href: '/margin-rules' },
    { label: 'Orders',       href: '/orders' },
    { label: 'Settings',     href: '/settings' },
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-blue-900">NavyeSIM</span>
        <span className="ml-1 text-xs text-gray-400">Admin</span>
      </div>
      <nav className="flex-1 py-4">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-900"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
