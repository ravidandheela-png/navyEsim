import React from 'react';
import Table from '../components/Table';

/**
 * Settings page — exchange rates, payment config, eSIM fulfillment mode, admin account.
 * TODO: fetch GET /api/admin/settings and GET /api/admin/settings/exchange-rates
 * TODO: PUT /api/admin/settings
 * TODO: PUT /api/admin/settings/exchange-rates/:currency
 * TODO: POST /api/admin/settings/exchange-rates/refresh
 * TODO: POST /api/admin/settings/reconvert
 */
export default function Settings() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      {/* Exchange Rates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Exchange Rates</h2>
          <button className="text-sm bg-blue-900 text-white px-3 py-1.5 rounded hover:bg-blue-800">
            Refresh Rates Now
          </button>
        </div>
        {/* TODO: staleness warning banner */}
        {/* TODO: buffer % field */}
        <Table
          columns={[
            { key: 'fromCurrency', label: 'Currency' },
            { key: 'toINR', label: 'Rate to ₹' },
            { key: 'source', label: 'Source' },
            { key: 'fetchedAt', label: 'Last Updated' },
            { key: 'isPinned', label: 'Pinned' },
            { key: 'actions', label: 'Edit' },
          ]}
          rows={[]}
        />
      </section>

      {/* Payment Config */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Payment Config</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">UPI ID</label>
            <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="merchant@upi" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">UPI QR String (paste merchant QR)</label>
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Google Pay Merchant ID</label>
            <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">Save</button>
        </div>
      </section>

      {/* eSIM Fulfillment */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">eSIM Fulfillment</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">Mode:</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="fulfillment" value="manual" defaultChecked /> Manual
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="radio" name="fulfillment" value="automatic" disabled />
              Automatic <span className="text-xs">(TODO[INTEGRATION])</span>
            </label>
          </div>
        </div>
      </section>

      {/* Admin Account */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Admin Account</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 max-w-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">New Password</label>
            <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
            <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">Change Password</button>
        </div>
      </section>
    </div>
  );
}
