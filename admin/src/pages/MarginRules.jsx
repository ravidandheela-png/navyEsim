import React from 'react';
import LivePreview from '../components/LivePreview';

/**
 * Margin Rules management page.
 * Drag-to-reorder priority list + add/edit rule form + Preview Impact.
 * TODO: CRUD via /api/admin/margin-rules
 * TODO: POST /api/admin/margin-rules/preview for dry-run
 */
export default function MarginRules() {
  // TODO: fetch margin rules, handle reorder, add/edit/delete

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Margin Rules</h1>
        <div className="flex gap-2">
          <button className="text-sm bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">Preview Impact</button>
          <button className="bg-blue-900 text-white text-sm px-4 py-2 rounded hover:bg-blue-800">+ Add Rule</button>
        </div>
      </div>

      {/* TODO: drag-to-reorder rule cards */}
      <div className="space-y-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-400">No rules yet — add your first margin rule.</p>
        </div>
      </div>

      {/* Live preview widget */}
      <div className="mt-8">
        <LivePreview marginPercent={10} roundingRule="none" />
      </div>
    </div>
  );
}
