import React, { useState, useEffect } from 'react';
import Badge from '../components/Badge';

const TOKEN_KEY = 'navyesim_admin_token';
const API_BASE  = '/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

function syncStatusVariant(status) {
  switch (status) {
    case 'success': return 'green';
    case 'failed':  return 'red';
    case 'partial': return 'yellow';
    default:        return 'gray';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Vendor Detail page (M22).
 * Props:
 *   vendor     — vendor object passed from Vendors.jsx (has .id, .name, etc.)
 *   onNavigate — (page) => void  (to go back to vendors list)
 */
export default function VendorDetail({ vendor, onNavigate }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Guard: if no vendor passed, show a message
  if (!vendor) {
    return (
      <div className="text-gray-400 text-sm py-12 text-center">
        No vendor selected.{' '}
        <button onClick={() => onNavigate('vendors')} className="text-blue-700 hover:underline">
          Back to Vendors
        </button>
      </div>
    );
  }

  // ── Fetch sync logs ────────────────────────────────────────────────────────
  const fetchLogs = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/admin/vendors/${vendor.id}/synclogs?limit=20`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setLogs(data.logs ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchLogs, [vendor.id]);

  // ── Sync now ───────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await fetch(`${API_BASE}/admin/vendors/${vendor.id}/sync`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSyncResult({ ok: true, data });
      fetchLogs();
    } catch (err) {
      setSyncResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => onNavigate('vendors')}
        className="text-sm text-blue-700 hover:underline mb-4 inline-block"
      >
        ← Back to Vendors
      </button>

      {/* Vendor info card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{vendor.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{vendor.slug}</p>
          </div>
          <Badge
            label={vendor.syncStatus || 'never'}
            variant={syncStatusVariant(vendor.syncStatus)}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Source Type</p>
            <p className="font-medium">{vendor.sourceType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Last Synced</p>
            <p className="font-medium">{formatDate(vendor.lastSyncedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Sync Frequency</p>
            <p className="font-medium">
              {vendor.syncFrequencyHours ? `Every ${vendor.syncFrequencyHours}h` : 'Manual'}
            </p>
          </div>
          {vendor.apiBaseUrl && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">API Base URL</p>
              <p className="font-mono text-xs text-gray-600 break-all">{vendor.apiBaseUrl}</p>
            </div>
          )}
          {vendor.syncErrorMessage && (
            <div className="col-span-3">
              <p className="text-xs text-gray-400 mb-0.5">Last Error</p>
              <p className="text-xs text-red-600 break-all">{vendor.syncErrorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sync button + result */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        {syncResult && (
          <span className={`text-sm ${syncResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {syncResult.ok
              ? `✓ Sync complete — added: ${syncResult.data.packagesAdded ?? 0}, updated: ${syncResult.data.packagesUpdated ?? 0}`
              : `✗ ${syncResult.message}`}
          </span>
        )}
      </div>

      {/* Sync logs */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Sync History (last 20)
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Started', 'Finished', 'Status', 'Added', 'Updated', 'Stale', 'Errors'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No sync history yet.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{formatDate(log.startedAt)}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(log.finishedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge label={log.status} variant={syncStatusVariant(log.status)} />
                  </td>
                  <td className="px-4 py-3 text-center">{log.packagesAdded ?? 0}</td>
                  <td className="px-4 py-3 text-center">{log.packagesUpdated ?? 0}</td>
                  <td className="px-4 py-3 text-center">{log.packagesStale ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    {log.errorCount > 0 ? (
                      <span className="text-red-600 font-medium">{log.errorCount}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
