import React, { useState } from 'react';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

/**
 * Orders management page.
 * Filter by status/country/date. Click order → detail modal with eSIM paste field.
 * TODO: fetch GET /api/admin/orders with filters
 * TODO: PUT /api/admin/orders/:id for manual status update + esimQrData paste
 */
export default function Orders() {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Orders</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <input type="date" className="border border-gray-300 rounded px-3 py-1.5 text-sm" placeholder="From" />
        <input type="date" className="border border-gray-300 rounded px-3 py-1.5 text-sm" placeholder="To" />
        {/* TODO: country filter */}
      </div>

      <Table
        columns={[
          { key: 'id', label: 'Order ID' },
          { key: 'package', label: 'Package' },
          { key: 'country', label: 'Country' },
          { key: 'totalINR', label: '₹ Amount' },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'paymentStatus', label: 'Status' },
          { key: 'createdAt', label: 'Date' },
        ]}
        rows={[]}
        onRowClick={() => setDetailOpen(true)}
      />

      {/* Order detail modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Order Detail">
        {/* TODO: all order fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">eSIM QR Data (paste here)</label>
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24" placeholder="Paste eSIM QR string..." />
          </div>
          <div className="flex gap-2">
            <button className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700">Mark as Paid</button>
            <button className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-200">Copy QR Data</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
