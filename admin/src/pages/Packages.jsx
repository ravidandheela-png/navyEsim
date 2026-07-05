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
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Admin Packages page (M23).
 * Tabs: Canonical Packages | Unmatched Packages
 */
export default function Packages() {
  const [tab, setTab] = useState('canonical');

  // ── Canonical tab state ────────────────────────────────────────────────────
  const [packages,    setPackages]    = useState([]);
  const [pkgLoading,  setPkgLoading]  = useState(true);
  const [pkgError,    setPkgError]    = useState('');
  const [rematching,  setRematching]  = useState(false);
  const [repricing,   setRepricing]   = useState(false);

  // Detail modal
  const [selected,    setSelected]    = useState(null);
  const [detailOpen,  setDetailOpen]  = useState(false);

  // Price override modal
  const [overrideOpen,   setOverrideOpen]   = useState(false);
  const [overridePkg,    setOverridePkg]    = useState(null);
  const [overrideValue,  setOverrideValue]  = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError,  setOverrideError]  = useState('');

  // Price history modal
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [historyPkg,     setHistoryPkg]     = useState(null);
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState('');

  // ── Unmatched tab state ────────────────────────────────────────────────────
  const [unmatched,   setUnmatched]   = useState([]);
  const [umLoading,   setUmLoading]   = useState(false);
  const [umError,     setUmError]     = useState('');

  // ── Fetch canonical packages ───────────────────────────────────────────────
  const fetchPackages = useCallback(() => {
    setPkgLoading(true);
    setPkgError('');
    fetch(`${API_BASE}/admin/packages`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setPackages(data.packages ?? []))
      .catch((err) => setPkgError(err.message))
      .finally(() => setPkgLoading(false));
  }, []);

  // ── Fetch unmatched packages ───────────────────────────────────────────────
  const fetchUnmatched = useCallback(() => {
    setUmLoading(true);
    setUmError('');
    fetch(`${API_BASE}/admin/packages/unmatched`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setUnmatched(data.packages ?? []))
      .catch((err) => setUmError(err.message))
      .finally(() => setUmLoading(false));
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);
  useEffect(() => { if (tab === 'unmatched') fetchUnmatched(); }, [tab, fetchUnmatched]);

  // ── Rematch all ────────────────────────────────────────────────────────────
  const handleRematch = async () => {
    setRematching(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/packages/rematch`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      alert(`Rematch complete — matched: ${data.matched ?? 0}`);
      fetchPackages();
    } catch (err) { alert(`Rematch failed: ${err.message}`); }
    finally { setRematching(false); }
  };

  // ── Reprice all ────────────────────────────────────────────────────────────
  const handleReprice = async () => {
    setRepricing(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/packages/reprice`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      alert(`Reprice complete — updated: ${data.updated ?? 0}`);
      fetchPackages();
    } catch (err) { alert(`Reprice failed: ${err.message}`); }
    finally { setRepricing(false); }
  };

  // ── Open price override modal ──────────────────────────────────────────────
  const openOverride = (pkg) => {
    setOverridePkg(pkg);
    setOverrideValue(pkg.manualPriceINR != null ? String(Math.round(pkg.manualPriceINR / 100)) : '');
    setOverrideError('');
    setOverrideOpen(true);
  };

  // ── Save price override ────────────────────────────────────────────────────
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    setOverrideError('');
    const rupees = parseFloat(overrideValue);
    if (isNaN(rupees) || rupees <= 0) { setOverrideError('Enter a valid price in ₹.'); return; }
    setOverrideSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/packages/${overridePkg.id}/price`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ manualPriceINR: Math.round(rupees * 100) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOverrideOpen(false);
      fetchPackages();
    } catch (err) { setOverrideError(err.message); }
    finally { setOverrideSaving(false); }
  };

  // ── Clear price override ───────────────────────────────────────────────────
  const handleClearOverride = async (pkg) => {
    if (!confirm(`Clear manual price override for "${pkg.name}"?`)) return;
    try {
      const res  = await fetch(`${API_BASE}/admin/packages/${pkg.id}/price`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ manualPriceINR: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchPackages();
    } catch (err) { alert(`Clear override failed: ${err.message}`); }
  };

  // ── Open price history modal ───────────────────────────────────────────────
  const openHistory = (pkg) => {
    setHistoryPkg(pkg);
    setHistory([]);
    setHistoryError('');
    setHistoryOpen(true);
    setHistoryLoading(true);
    fetch(`${API_BASE}/admin/price-history/${pkg.id}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setHistory(data.history ?? []))
      .catch((err) => setHistoryError(err.message))
      .finally(() => setHistoryLoading(false));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Packages</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'canonical',  label: 'Canonical Packages' },
          { key: 'unmatched',  label: 'Unmatched Packages' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm ${tab === key ? 'border-b-2 border-blue-900 text-blue-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Canonical tab ── */}
      {tab === 'canonical' && (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleRematch}
              disabled={rematching}
              className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {rematching ? 'Rematching…' : 'Re-match All'}
            </button>
            <button
              onClick={handleReprice}
              disabled={repricing}
              className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {repricing ? 'Repricing…' : 'Re-price All'}
            </button>
          </div>

          {pkgError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">{pkgError}</div>
          )}

          {pkgLoading ? (
            <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Country', 'Name', 'Data', 'Days', 'Final ₹', 'Override', 'Active', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {packages.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No canonical packages yet.</td></tr>
                  ) : packages.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">{p.country?.name ?? p.countryId ?? '—'}</td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-xs">{p.dataGB != null ? `${p.dataGB} GB` : '—'}</td>
                      <td className="px-4 py-3 text-xs">{p.durationDays != null ? `${p.durationDays}d` : '—'}</td>
                      <td className="px-4 py-3 font-medium">{formatINR(p.finalPriceINR)}</td>
                      <td className="px-4 py-3">
                        {p.manualPriceINR != null
                          ? <Badge label="Override" variant="yellow" />
                          : <span className="text-xs text-gray-400">auto</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${p.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {p.isActive ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                        <button onClick={() => openOverride(p)} className="text-xs text-blue-700 hover:underline">
                          Set Price
                        </button>
                        {p.manualPriceINR != null && (
                          <button onClick={() => handleClearOverride(p)} className="text-xs text-orange-600 hover:underline">
                            Clear
                          </button>
                        )}
                        <button onClick={() => openHistory(p)} className="text-xs text-gray-500 hover:underline">
                          History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Unmatched tab ── */}
      {tab === 'unmatched' && (
        <>
          {umError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-4">{umError}</div>
          )}
          {umLoading ? (
            <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Vendor', 'Country', 'Name', 'Data', 'Days', 'Price ₹'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {unmatched.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No unmatched packages. 🎉</td></tr>
                  ) : unmatched.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">{p.vendor?.name ?? p.vendorId ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">{p.country?.name ?? p.countryIso ?? '—'}</td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-xs">{p.dataGB != null ? `${p.dataGB} GB` : '—'}</td>
                      <td className="px-4 py-3 text-xs">{p.durationDays != null ? `${p.durationDays}d` : '—'}</td>
                      <td className="px-4 py-3">{formatINR(p.convertedPriceINR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Price Override Modal ── */}
      <Modal isOpen={overrideOpen} onClose={() => setOverrideOpen(false)} title="Set Manual Price">
        {overridePkg && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Package: <span className="font-medium">{overridePkg.name}</span><br />
              Current final price: <span className="font-medium">{formatINR(overridePkg.finalPriceINR)}</span>
            </p>
            {overrideError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">{overrideError}</div>
            )}
            <form onSubmit={handleSaveOverride} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Manual Price (₹ rupees)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="e.g. 999"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Enter in rupees — stored as paise internally.</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOverrideOpen(false)} disabled={overrideSaving}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={overrideSaving}
                  className="px-4 py-2 text-sm bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-60">
                  {overrideSaving ? 'Saving…' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* ── Price History Modal ── */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Price History">
        {historyPkg && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-4">{historyPkg.name}</p>
            {historyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">{historyError}</div>
            )}
            {historyLoading ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No price history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Price ₹', 'Source', 'Vendor ₹', 'Rule'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs">{formatDate(h.createdAt)}</td>
                        <td className="px-3 py-2 font-medium">{formatINR(h.finalPriceINR)}</td>
                        <td className="px-3 py-2 text-xs">
                          <Badge label={h.source ?? 'auto'} variant={h.source === 'manual' ? 'yellow' : 'gray'} />
                        </td>
                        <td className="px-3 py-2 text-xs">{formatINR(h.winningVendorPriceINR)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{h.marginRuleName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
