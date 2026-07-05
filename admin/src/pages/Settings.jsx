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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Admin Settings page (M24).
 * Sections: Payment Config | Exchange Rates | eSIM Fulfillment
 */
export default function Settings() {
  // ── Payment config ─────────────────────────────────────────────────────────
  const [payConfig,    setPayConfig]    = useState({ upiId: '', upiQrString: '', googlePayMerchantId: '' });
  const [payLoading,   setPayLoading]   = useState(true);
  const [paySaving,    setPaySaving]    = useState(false);
  const [payError,     setPayError]     = useState('');
  const [paySuccess,   setPaySuccess]   = useState('');

  // ── Exchange rates ─────────────────────────────────────────────────────────
  const [rates,        setRates]        = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError,   setRatesError]   = useState('');
  const [refreshing,   setRefreshing]   = useState(false);
  const [reconverting, setReconverting] = useState(false);

  // Edit rate modal
  const [editRateOpen,  setEditRateOpen]  = useState(false);
  const [editRateRow,   setEditRateRow]   = useState(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [editRateSaving,setEditRateSaving]= useState(false);
  const [editRateError, setEditRateError] = useState('');

  // ── Fetch payment config ───────────────────────────────────────────────────
  const fetchPayConfig = useCallback(() => {
    setPayLoading(true);
    setPayError('');
    fetch(`${API_BASE}/settings`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setPayConfig({
        upiId:               data.upiId               ?? '',
        upiQrString:         data.upiQrString         ?? '',
        googlePayMerchantId: data.googlePayMerchantId ?? '',
      }))
      .catch((err) => setPayError(err.message))
      .finally(() => setPayLoading(false));
  }, []);

  // ── Fetch exchange rates ───────────────────────────────────────────────────
  const fetchRates = useCallback(() => {
    setRatesLoading(true);
    setRatesError('');
    fetch(`${API_BASE}/settings/exchange-rates`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => setRates(data.rates ?? []))
      .catch((err) => setRatesError(err.message))
      .finally(() => setRatesLoading(false));
  }, []);

  useEffect(() => { fetchPayConfig(); fetchRates(); }, [fetchPayConfig, fetchRates]);

  // ── Save payment config ────────────────────────────────────────────────────
  const handleSavePayConfig = async (e) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');
    setPaySaving(true);
    try {
      const res  = await fetch(`${API_BASE}/settings`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify(payConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPaySuccess('Payment config saved.');
    } catch (err) { setPayError(err.message); }
    finally { setPaySaving(false); }
  };

  // ── Refresh exchange rates ─────────────────────────────────────────────────
  const handleRefreshRates = async () => {
    setRefreshing(true);
    try {
      const res  = await fetch(`${API_BASE}/settings/exchange-rates/refresh`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchRates();
    } catch (err) { alert(`Refresh failed: ${err.message}`); }
    finally { setRefreshing(false); }
  };

  // ── Reconvert prices ───────────────────────────────────────────────────────
  const handleReconvert = async () => {
    if (!confirm('Reconvert all vendor package prices using current exchange rates? This will reset match status.')) return;
    setReconverting(true);
    try {
      const res  = await fetch(`${API_BASE}/settings/reconvert`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      alert(`Reconvert complete — updated: ${data.updated ?? 0} packages.`);
    } catch (err) { alert(`Reconvert failed: ${err.message}`); }
    finally { setReconverting(false); }
  };

  // ── Toggle pin ─────────────────────────────────────────────────────────────
  const handleTogglePin = async (rate) => {
    try {
      const res  = await fetch(`${API_BASE}/settings/exchange-rates/${rate.fromCurrency}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isPinned: !rate.isPinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchRates();
    } catch (err) { alert(`Pin toggle failed: ${err.message}`); }
  };

  // ── Open edit rate modal ───────────────────────────────────────────────────
  const openEditRate = (rate) => {
    setEditRateRow(rate);
    setEditRateValue(String(rate.toINR ?? ''));
    setEditRateError('');
    setEditRateOpen(true);
  };

  // ── Save edited rate ───────────────────────────────────────────────────────
  const handleSaveRate = async (e) => {
    e.preventDefault();
    setEditRateError('');
    const val = parseFloat(editRateValue);
    if (isNaN(val) || val <= 0) { setEditRateError('Enter a valid rate.'); return; }
    setEditRateSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/settings/exchange-rates/${editRateRow.fromCurrency}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ toINR: val, isPinned: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEditRateOpen(false);
      fetchRates();
    } catch (err) { setEditRateError(err.message); }
    finally { setEditRateSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      {/* ── Exchange Rates ── */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Exchange Rates</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshRates} disabled={refreshing}
              className="text-sm bg-blue-900 text-white px-3 py-1.5 rounded hover:bg-blue-800 disabled:opacity-60"
            >
              {refreshing ? 'Refreshing…' : 'Refresh Rates'}
            </button>
            <button
              onClick={handleReconvert} disabled={reconverting}
              className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {reconverting ? 'Reconverting…' : 'Reconvert Prices'}
            </button>
          </div>
        </div>

        {ratesError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-3">{ratesError}</div>
        )}

        {ratesLoading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Currency', 'Rate to ₹', 'Source', 'Last Updated', 'Pinned', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rates.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No exchange rates yet. Click "Refresh Rates".</td></tr>
                ) : rates.map((r) => (
                  <tr key={r.fromCurrency} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{r.fromCurrency}</td>
                    <td className="px-4 py-3">{r.toINR != null ? r.toINR.toFixed(4) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.source ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.fetchedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePin(r)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${r.isPinned ? 'bg-blue-600' : 'bg-gray-300'}`}
                        title={r.isPinned ? 'Pinned (click to unpin)' : 'Not pinned (click to pin)'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${r.isPinned ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEditRate(r)} className="text-xs text-blue-700 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Payment Config ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Payment Config</h2>

        {payError   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-3">{payError}</div>}
        {paySuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded px-4 py-3 mb-3">{paySuccess}</div>}

        {payLoading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
        ) : (
          <form onSubmit={handleSavePayConfig} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">UPI ID</label>
              <input
                type="text"
                value={payConfig.upiId}
                onChange={(e) => setPayConfig({ ...payConfig, upiId: e.target.value })}
                placeholder="merchant@upi"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">UPI QR String</label>
              <textarea
                value={payConfig.upiQrString}
                onChange={(e) => setPayConfig({ ...payConfig, upiQrString: e.target.value })}
                rows={3}
                placeholder="Paste merchant QR string…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Google Pay Merchant ID</label>
              <input
                type="text"
                value={payConfig.googlePayMerchantId}
                onChange={(e) => setPayConfig({ ...payConfig, googlePayMerchantId: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit" disabled={paySaving}
              className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-60"
            >
              {paySaving ? 'Saving…' : 'Save Payment Config'}
            </button>
          </form>
        )}
      </section>

      {/* ── eSIM Fulfillment ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">eSIM Fulfillment</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">Mode:</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="fulfillment" value="manual" defaultChecked readOnly /> Manual
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-not-allowed">
              <input type="radio" name="fulfillment" value="automatic" disabled />
              Automatic <span className="text-xs">(future)</span>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">Automatic fulfillment requires vendor API integration — not yet implemented.</p>
        </div>
      </section>

      {/* ── Edit Rate Modal ── */}
      <Modal isOpen={editRateOpen} onClose={() => setEditRateOpen(false)} title={`Edit Rate: ${editRateRow?.fromCurrency ?? ''}`}>
        {editRateRow && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Current rate: <span className="font-medium">1 {editRateRow.fromCurrency} = ₹{editRateRow.toINR?.toFixed(4) ?? '—'}</span>
              {editRateRow.isPinned && <Badge label="Pinned" variant="blue" />}
            </p>
            {editRateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-3">{editRateError}</div>
            )}
            <form onSubmit={handleSaveRate} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">New Rate (₹ per 1 {editRateRow.fromCurrency})</label>
                <input
                  type="number" min="0.0001" step="0.0001"
                  value={editRateValue}
                  onChange={(e) => setEditRateValue(e.target.value)}
                  autoFocus
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Saving will auto-pin this rate (stops auto-refresh for this currency).</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditRateOpen(false)} disabled={editRateSaving}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={editRateSaving}
                  className="px-4 py-2 text-sm bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-60">
                  {editRateSaving ? 'Saving…' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
