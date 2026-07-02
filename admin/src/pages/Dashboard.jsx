import React from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';

/**
 * Admin Dashboard page.
 * Shows stat cards + last 10 orders + exchange rate staleness warning.
 * TODO: fetch GET /api/admin/dashboard
 */
export default function Dashboard() {
  // TODO: const [stats, setStats] = useState(null);
  // TODO: useEffect → fetch /api/admin/dashboard with JWT

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h1>

      {/* TODO: exchange rate staleness warning banner (yellow >12h, red >24h) */}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {['Total Orders', 'Paid Orders', 'Revenue (₹)', 'Active Countries', 'Active Packages'].map((label) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">—</p>
          </div>
        ))}
      </div>

      {/* Last 10 orders */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Recent Orders</h2>
      <Table
        columns={[
          { key: 'id', label: 'Order ID' },
          { key: 'package', label: 'Package' },
          { key: 'totalINR', label: '₹ Amount' },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'paymentStatus', label: 'Status' },
          { key: 'createdAt', label: 'Date' },
        ]}
        rows={[]}
      />
    </div>
  );
}
