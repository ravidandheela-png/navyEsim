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

const EMPTY_FORM = {
  name: '', slug: '', sourceType: 'api',
  apiBaseUrl: '', apiKey: '',
  apiAuthType: '', apiAuthHeaderName: '',
  syncFrequencyHours: 0, isActive: true,
};

function syncStatusVariant(status) {
  switch (status) {
    case 'success': return 'green';
    case 'error':   return 'red';
    case 'syncing': return 'yellow';
    default:        return 'gray';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Admin Vendors page (M22).
 * Full CRUD + sync trigger + navigate to VendorDetail.
 */
export default function Vendors({ onNavigate }) {
  const [vendors,   setVendors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [syncing,   setSyncing]   = useState({});   // { [vendorId]: true }

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchVendors = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/admin/vendors`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setVendors(data.vendors ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchVendors, []);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      name:               v.name,
      slug:               v.slug,
      sourceType:         v.sourceType,
      apiBaseUrl:         v.apiBaseUrl  ?? '',
      apiKey:             '',            // never pre-fill secret
      apiAuthType:        v.apiAuthType ?? '',
      apiAuthHeaderName:  v.apiAuthHeaderName ?? '',
      syncFrequencyHours: v.syncFrequencyHours ?? 0,
      isActive:           v.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setFormError(''); };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.slug.trim() || !form.sourceType) {
      setFormError('Name, slug, and source type are required.');
      return;
    }
    setSaving(true);
    try {
      const url    = editing ? `${API_BASE}/admin/vendors/${editing.id}` : `${API_BASE}/admin/vendors`;
      const method = editing ? 'PUT' : 'POST';
      const body   = { ...form, slug: form.slug.toLowerCase().trim() };
      if (!body.apiKey) delete body.apiKey; // don't send empty key on edit

      const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      closeModal();
      fetchVendors();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (v) => {
    try {
      const res  = await fetch(`${API_BASE}/admin/vendors/${v.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchVendors();
    } catch (err) { alert(`Toggle failed: ${err.message}`); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (v) => {
    if (!confirm(`Delete vendor "${v.name}"? This cannot be undone.`)) return;
    try {
      const res  = await fetch(`${API_BASE}/admin/vendors/${v.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchVendors();
    } catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  // ── Sync now ───────────────────────────────────────────────────────────────
  const handleSync = async (v) => {
    setSyncing((s) => ({ ...s, [v.id]: true }));
    try {
      const res  = await fetch(`${API_BASE}/admin/vendors/${v.id}/sync`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchVendors();
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing((s) => ({ ...s, [v.id]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Vendors</h1>
        <button onClick={openAdd} className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + Add Vendor
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
                {['Name', 'Slug', 'Type', 'Last Synced', 'Status', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {vendors.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No vendors yet.</td></tr>
              ) : vendors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <button
                      onClick={() => onNavigate && onNavigate('vendor-detail', v)}
                      className="text-blue-700 hover:underline text-left"
                    >
                      {v.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.slug}</td>
                  <td className="px-4 py-3 text-xs">{v.sourceType}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(v.lastSyncedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge label={v.syncStatus || 'never'} variant={syncStatusVariant(v.syncStatus)} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${v.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${v.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleSync(v)}
                      disabled={syncing[v.id]}
                      className="text-xs text-green-700 hover:underline disabled:opacity-50"
                    >
                      {syncing[v.id] ? 'Syncing…' : 'Sync'}
                    </button>
                    <button onClick={() => openEdit(v)} className="text-xs text-blue-700 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(v)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit Vendor' : 'Add Vendor'}</h2>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-4">{formError}</div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              {[
                { label: 'Vendor Name', key: 'name', placeholder: 'e.g. Airalo' },
                { label: 'Slug', key: 'slug', placeholder: 'e.g. airalo' },
                { label: 'API Base URL', key: 'apiBaseUrl', placeholder: 'https://api.example.com' },
                { label: 'API Key', key: 'apiKey', placeholder: editing ? '(leave blank to keep existing)' : '' },
                { label: 'Auth Type', key: 'apiAuthType', placeholder: 'e.g. bearer' },
                { label: 'Auth Header Name', key: 'apiAuthHeaderName', placeholder: 'e.g. Authorization' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600 mb-1">{label}</label>
                  <input
                    type={key === 'apiKey' ? 'password' : 'text'}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Source Type</label>
                <select
                  value={form.sourceType}
                  onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="api">API</option>
                  <option value="sheet">Sheet</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Sync Frequency (hours, 0 = manual)</label>
                <input
                  type="number"
                  min={0}
                  value={form.syncFrequencyHours}
                  onChange={(e) => setForm({ ...form, syncFrequencyHours: parseInt(e.target.value, 10) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vendorActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="vendorActive" className="text-sm text-gray-600">Active</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={saving}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-60">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
