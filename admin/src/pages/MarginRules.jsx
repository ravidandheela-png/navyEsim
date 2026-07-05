import React, { useState, useEffect, useCallback } from 'react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LivePreview from '../components/LivePreview';

const TOKEN_KEY = 'navyesim_admin_token';
const API_BASE  = '/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

const EMPTY_FORM = {
  name: '', ruleType: 'global', priority: 10,
  marginPercent: 20, roundingRule: 'none',
  countryId: '', vendorId: '', isActive: true,
};

function ruleTypeVariant(t) {
  switch (t) {
    case 'global':  return 'blue';
    case 'country': return 'green';
    case 'vendor':  return 'yellow';
    default:        return 'gray';
  }
}

/**
 * Admin Margin Rules page (M24).
 * CRUD + active toggle + vendor price preview.
 */
export default function MarginRules() {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // Preview
  const [previewPrice,  setPreviewPrice]  = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [previewing,    setPreviewing]    = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRules = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/admin/margin-rules`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setRules(data.rules ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(fetchRules, [fetchRules]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name:          r.name,
      ruleType:      r.ruleType,
      priority:      r.priority,
      marginPercent: r.marginPercent,
      roundingRule:  r.roundingRule ?? 'none',
      countryId:     r.countryId ?? '',
      vendorId:      r.vendorId  ?? '',
      isActive:      r.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setFormError(''); };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    try {
      const url    = editing ? `${API_BASE}/admin/margin-rules/${editing.id}` : `${API_BASE}/admin/margin-rules`;
      const method = editing ? 'PUT' : 'POST';
      const body   = {
        ...form,
        priority:      Number(form.priority),
        marginPercent: Number(form.marginPercent),
        countryId:     form.countryId || undefined,
        vendorId:      form.vendorId  || undefined,
      };
      const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      closeModal();
      fetchRules();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (r) => {
    try {
      const res  = await fetch(`${API_BASE}/admin/margin-rules/${r.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchRules();
    } catch (err) { alert(`Toggle failed: ${err.message}`); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (r) => {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    try {
      const res  = await fetch(`${API_BASE}/admin/margin-rules/${r.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchRules();
    } catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    const price = parseFloat(previewPrice);
    if (!price || price <= 0) { alert('Enter a valid vendor price.'); return; }
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const res  = await fetch(`${API_BASE}/admin/margin-rules/preview`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ vendorPriceINR: Math.round(price * 100) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPreviewResult(data);
    } catch (err) { alert(`Preview failed: ${err.message}`); }
    finally { setPreviewing(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Margin Rules</h1>
        <button onClick={openAdd} className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + Add Rule
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">{error}</div>
      )}

      {/* Preview panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview Impact</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">Vendor price (₹):</span>
          <input
            type="number" min="1" value={previewPrice}
            onChange={(e) => setPreviewPrice(e.target.value)}
            placeholder="e.g. 800"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handlePreview} disabled={previewing}
            className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {previewing ? 'Calculating…' : 'Preview'}
          </button>
        </div>
        {previewResult && (
          <div className="mt-3 text-sm text-gray-800">
            <span className="font-medium">Rule applied:</span> {previewResult.ruleName ?? '—'} &nbsp;|&nbsp;
            <span className="font-medium">Customer pays:</span>{' '}
            <span className="text-blue-900 font-semibold">
              ₹{previewResult.finalPriceINR != null ? Math.round(previewResult.finalPriceINR / 100).toLocaleString('en-IN') : '—'}
            </span> &nbsp;|&nbsp;
            <span className="font-medium">Margin:</span>{' '}
            <span className="text-green-700">{previewResult.marginPercent ?? '—'}%</span>
          </div>
        )}
      </div>

      {/* Rules table */}
      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Priority', 'Name', 'Type', 'Margin %', 'Rounding', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rules.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No rules yet. Add your first margin rule.</td></tr>
              ) : rules.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.priority}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3"><Badge label={r.ruleType} variant={ruleTypeVariant(r.ruleType)} /></td>
                  <td className="px-4 py-3">{r.marginPercent}%</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.roundingRule ?? 'none'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${r.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${r.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-xs text-blue-700 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(r)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Rule' : 'Add Margin Rule'}>
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-4">{formError}</div>
        )}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Rule Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required placeholder="e.g. Default Global"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rule Type</label>
              <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="global">Global</option>
                <option value="country">Country</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Priority (lower = higher)</label>
              <input type="number" min="1" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Margin %</label>
              <input type="number" min="0" step="0.1" value={form.marginPercent}
                onChange={(e) => setForm({ ...form, marginPercent: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rounding Rule</label>
              <select value={form.roundingRule} onChange={(e) => setForm({ ...form, roundingRule: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="none">None</option>
                <option value="ceil_100">Ceil to ₹100</option>
                <option value="ceil_50">Ceil to ₹50</option>
                <option value="round_99">Round to x99</option>
              </select>
            </div>
          </div>
          {form.ruleType === 'country' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Country ID</label>
              <input type="text" value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                placeholder="Country UUID"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {form.ruleType === 'vendor' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vendor ID</label>
              <input type="text" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                placeholder="Vendor UUID"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ruleActive" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="ruleActive" className="text-sm text-gray-600">Active</label>
          </div>

          {/* Live preview inside modal */}
          <LivePreview marginPercent={Number(form.marginPercent)} roundingRule={form.roundingRule} />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
