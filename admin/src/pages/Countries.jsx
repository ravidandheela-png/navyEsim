import React from 'react';
import Table from '../components/Table';

/**
 * Countries management page.
 * TODO: CRUD via /api/admin/countries
 */
export default function Countries() {
  // TODO: fetch countries, handle add/edit/delete, bulk toggle

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Countries</h1>
        <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">
          + Add Country
        </button>
      </div>
      {/* TODO: Add Country form modal */}
      <Table
        columns={[
          { key: 'flagEmoji', label: 'Flag' },
          { key: 'name', label: 'Name' },
          { key: 'isoCode', label: 'ISO Code' },
          { key: 'isActive', label: 'Active' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={[]}
      />
    </div>
  );
}
