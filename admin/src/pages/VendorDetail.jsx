import React from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';

/**
 * Vendor detail page — sync history, sheet upload, packages tab.
 * TODO: fetch GET /api/admin/vendors/:id/synclogs
 * TODO: POST /api/admin/vendors/:id/sync
 * TODO: POST /api/admin/vendors/:id/upload
 */
export default function VendorDetail() {
  // TODO: get vendorId from route params
  // TODO: fetch vendor details + sync logs

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Vendor Detail</h1>

      {/* Sync Now button */}
      <div className="flex gap-3 mb-6">
        <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          Sync Now
        </button>
        {/* TODO: show live sync status polling */}
      </div>

      {/* Upload Sheet section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Sheet</h2>
        {/* TODO: file picker (CSV/XLSX), progress bar, result summary */}
        <input type="file" accept=".csv,.xlsx" className="text-sm" />
      </div>

      {/* Sync history */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Sync History</h2>
      <Table
        columns={[
          { key: 'startedAt', label: 'Started' },
          { key: 'status', label: 'Status' },
          { key: 'packagesAdded', label: 'Added' },
          { key: 'packagesUpdated', label: 'Updated' },
          { key: 'errorCount', label: 'Errors' },
        ]}
        rows={[]}
      />
    </div>
  );
}
