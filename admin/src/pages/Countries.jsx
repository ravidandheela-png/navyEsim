import React, { useState, useEffect } from 'react';

const TOKEN_KEY = 'navyesim_admin_token';
const API_BASE  = '/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

const EMPTY_FORM = { name: '', isoCode: '', flagEmoji: '', isActive: true };

/**
 * Admin Countries page (M21).
 * Full CRUD: list, add, edit (inline modal), active toggle, delete.
 */
export default function Countries() {
  const [countries, setCountries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);   // null = add, object = edit
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCountries = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/admin/countries`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setCountries(data.countries ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchCountries, []);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (country) => {
    setEditing(country);
    setForm({
      name:      country.name,
      isoCode:   country.isoCode,
      flagEmoji: country.flagEmoji,
      isActive:  country.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormError('');
  };

  // ── Save (add or edit) ─────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.isoCode.trim() || !form.flagEmoji.trim()) {
      setFormError('Name, ISO code, and flag emoji are required.');
      return;
    }

    setSaving(true);
    try {
      const url    = editing
        ? `${API_BASE}/admin/countries/${editing.id}`
        : `${API_BASE}/admin/countries`;
      const method = editing ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          name:      form.name.trim(),
          isoCode:   form.isoCode.trim().toUpperCase(),
          flagEmoji: form.flagEmoji.trim(),
          isActive:  form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      closeModal();
      fetchCountries();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (country) => {
    try {
      const res = await fetch(`${API_BASE}/admin/countries/${country.id}`, {
        method:  'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !country.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchCountries();
    } catch (err) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (country) => {
    if (!confirm(`Delete "${country.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/countries/${country.id}`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchCountries();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Countries</h1>
        <button
          onClick={openAdd}
          className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800"
        >
          + Add Country
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Flag', 'Name', 'ISO Code', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {countries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No countries yet. Click "+ Add Country" to create one.
                  </td>
                </tr>
              ) : (
                countries.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xl">{c.flagEmoji}</td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.isoCode}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(c)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          c.isActive ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        title={c.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            c.isActive ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editing ? 'Edit Country' : 'Add Country'}
            </h2>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Country Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Japan"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">ISO Code (2-letter)</label>
                <input
                  type="text"
                  value={form.isoCode}
                  onChange={(e) => setForm({ ...form, isoCode: e.target.value.toUpperCase().slice(0, 2) })}
                  required
                  maxLength={2}
                  placeholder="e.g. JP"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Flag Emoji</label>
                <input
                  type="text"
                  value={form.flagEmoji}
                  onChange={(e) => setForm({ ...form, flagEmoji: e.target.value })}
                  required
                  placeholder="e.g. 🇯🇵"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="isActive" className="text-sm text-gray-600">Active</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Country'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
