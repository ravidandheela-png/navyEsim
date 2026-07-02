import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

/**
 * Packages management page — Canonical Packages + Unmatched Packages tabs.
 * TODO: fetch /api/admin/packages and /api/admin/packages/unmatched
 */
export default function Packages() {
  const [tab, setTab] = useState('canonical');
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Packages</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {['canonical', 'unmatched'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-blue-900 text-blue-900 font-medium' : 'text-gray-500'}`}
          >
            {t === 'canonical' ? 'Canonical Packages' : 'Unmatched Packages'}
          </button>
        ))}
      </div>

      {tab === 'canonical' && (
        <>
          <div className="flex gap-2 mb-4">
            <button className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">Re-match All</button>
            <button className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">Re-price All</button>
          </div>
          <Table
            columns={[
              { key: 'country', label: 'Country' },
              { key: 'name', label: 'Name' },
              { key: 'dataGB', label: 'Data' },
              { key: 'durationDays', label: 'Duration' },
              { key: 'vendors', label: 'Vendors' },
              { key: 'winningVendorPriceINR', label: 'Best Vendor ₹' },
              { key: 'marginRule', label: 'Rule' },
              { key: 'finalPriceINR', label: 'Final ₹' },
              { key: 'isActive', label: 'Active' },
            ]}
            rows={[]}
            onRowClick={() => setDetailOpen(true)}
          />
        </>
      )}

      {tab === 'unmatched' && (
        <>
          <div className="flex gap-2 mb-4">
            <button className="text-sm bg-blue-900 text-white px-3 py-1.5 rounded hover:bg-blue-800">Auto-match All</button>
          </div>
          <Table
            columns={[
              { key: 'vendor', label: 'Vendor' },
              { key: 'country', label: 'Country' },
              { key: 'name', label: 'Name' },
              { key: 'dataGB', label: 'Data' },
              { key: 'durationDays', label: 'Duration' },
              { key: 'convertedPriceINR', label: 'Price ₹' },
              { key: 'actions', label: 'Actions' },
            ]}
            rows={[]}
          />
        </>
      )}

      {/* Package detail modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Package Detail">
        {/* TODO: vendor comparison table, pricing breakdown, manual override, price history */}
        <p className="text-sm text-gray-500">TODO: implement package detail view</p>
      </Modal>
    </div>
  );
}
