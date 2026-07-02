import React from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';

/**
 * Vendors management page.
 * TODO: CRUD via /api/admin/vendors, trigger sync, upload sheet.
 */
export default function Vendors() {
  // TODO: fetch vendors list, handle add/edit/delete/sync

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Vendors</h1>
        <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + Add Vendor
        </button>
      </div>
      {/* TODO: Add/Edit Vendor modal with API config fields + Test Connection button */}
      <Table
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'sourceType', label: 'Type' },
          { key: 'lastSyncedAt', label: 'Last Synced' },
          { key: 'syncStatus', label: 'Status' },
          { key: 'totalPkgs', label: 'Total Pkgs' },
          { key: 'activePkgs', label: 'Active Pkgs' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={[]}
      />
    </div>
  );
}
