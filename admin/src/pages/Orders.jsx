import React, { useState, useEffect, useCallback } from 'react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

const TOKEN_KEY = 'navyesim_admin_token';
const API_BASE  = '/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

function formatINR(paise) {
  if (paise == null) return '—';
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusVariant(s) {
  switch (s) {
    case 'paid':    return 'green';
    case 'pending': return 'yellow';
    case 'failed':  return 'red';
    default:        return 'gray';
  }
}

/**
 * Admin Orders page (M24).
 * List with status filter, detail modal, update paymentStatus + esimQrData.
 */
export default function Orders() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState('');

  // Edit fields inside modal
  const [editStatus,  setEditStatus]  = useState('');
  const [editQr,      setEditQr]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError('');
    const qs = filterStatus ? `?paymentStatus=${filterStatus}` : '';
    fetch(`${API_BASE}/admin/orders${qs}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setOrders(data.orders ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(fetchOrders, [fetchOrders]);

  // ── Open detail modal ──────────────────────────────────────────────────────
  const openDetail = (order) => {
    setSelected(null);
    setDetailError('');
    setSaveError('');
    setSaveSuccess('');
    setDetailOpen(true);
    setDetailLoading(true);

    fetch(`${API_BASE}/admin/orders/${order.id}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        const o = data.order ?? data;
        setSelected(o);
        setEditStatus(o.paymentStatus ?? '');
        setEditQr(o.esimQrData ?? '');
      })
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  };

  // ── Save order update ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected) return;
    setSaveError('');
    setSaveSuccess('');
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/orders/${selected.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          paymentStatus: editStatus || undefined,
          esimQrData:    editQr     || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSaveSuccess('Order updated successfully.');
      fetchOrders();
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Orders</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={fetchOrders}
          className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Order ID', 'Package', 'Customer', '₹ Amount', 'Method', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found.</td></tr>
              ) : orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => openDetail(o)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs max-w-[140px] truncate">{o.canonicalPackage?.name ?? o.canonicalPackageId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{o.customerEmail ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatINR(o.totalINR)}</td>
                  <td className="px-4 py-3 text-xs">{o.paymentMethod ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge label={o.paymentStatus ?? 'unknown'} variant={statusVariant(o.paymentStatus)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Order Detail">
        {detailLoading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
        {detailError  && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">{detailError}</div>}

        {selected && !detailLoading && (
          <div className="space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Order ID',    selected.id],
                ['Customer',    selected.customerEmail ?? '—'],
                ['Phone',       selected.customerPhone ?? '—'],
                ['Package',     selected.canonicalPackage?.name ?? selected.canonicalPackageId ?? '—'],
                ['Amount',      formatINR(selected.totalINR)],
                ['Method',      selected.paymentMethod ?? '—'],
                ['Payment Ref', selected.paymentReference ?? '—'],
                ['Created',     formatDate(selected.createdAt)],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium break-all">{val}</p>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            {/* Status update */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Payment Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* eSIM QR data */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">eSIM QR Data</label>
              <textarea
                value={editQr}
                onChange={(e) => setEditQr(e.target.value)}
                rows={4}
                placeholder="Paste eSIM QR string or activation code…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {saveError   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">{saveError}</div>}
            {saveSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded px-3 py-2">{saveSuccess}</div>}

            <div className="flex gap-2 justify-end">
              {editQr && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(editQr)}
                  className="text-sm bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Copy QR
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
