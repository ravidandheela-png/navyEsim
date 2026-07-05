import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';

const TOKEN_KEY = 'navyesim_admin_token';
const API_BASE  = '/api';

/** Format paise → ₹ with commas, e.g. 108900 → ₹1,089 */
function formatINR(paise) {
  if (paise == null) return '—';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

/** Format ISO date string → readable local date */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Map paymentStatus → Badge variant */
function statusVariant(status) {
  switch (status) {
    case 'paid':    return 'green';
    case 'pending': return 'yellow';
    case 'failed':  return 'red';
    default:        return 'gray';
  }
}

/** Single stat card */
function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-900' : 'text-gray-800'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

/**
 * Admin Dashboard page (M20).
 * Fetches GET /api/admin/dashboard with JWT and renders:
 *   - 5 stat cards
 *   - Last 10 orders table
 */
export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setStats(data);
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mt-4">
        {error}
      </div>
    );
  }

  // ── Build table rows from last10Orders ───────────────────────────────────
  const orderRows = (stats?.last10Orders ?? []).map((o) => ({
    id:            o.id ? o.id.slice(0, 8) + '…' : '—',
    totalINR:      formatINR(o.totalINR),
    paymentStatus: (
      <Badge
        label={o.paymentStatus ?? 'unknown'}
        variant={statusVariant(o.paymentStatus)}
      />
    ),
    customerEmail: o.customerEmail || '—',
    createdAt:     formatDate(o.createdAt),
  }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Orders"     value={stats?.totalOrders ?? '—'} />
        <StatCard label="Paid Orders"      value={stats?.paidOrders  ?? '—'} />
        <StatCard label="Revenue (₹)"      value={formatINR(stats?.revenueINR)} highlight />
        <StatCard label="Active Countries" value={stats?.activeCountries ?? '—'} />
        <StatCard label="Active Packages"  value={stats?.activePackages  ?? '—'} />
      </div>

      {/* Recent orders */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Recent Orders
      </h2>

      {orderRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-gray-400 text-sm">
          No orders yet.
        </div>
      ) : (
        <Table
          columns={[
            { key: 'id',            label: 'Order ID' },
            { key: 'totalINR',      label: '₹ Amount' },
            { key: 'paymentStatus', label: 'Status' },
            { key: 'customerEmail', label: 'Customer' },
            { key: 'createdAt',     label: 'Date' },
          ]}
          rows={orderRows}
        />
      )}
    </div>
  );
}
