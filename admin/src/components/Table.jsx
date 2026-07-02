import React from 'react';

/**
 * Reusable data table component.
 * @param {{ columns: {key: string, label: string}[], rows: Object[], onRowClick?: Function }} props
 */
export default function Table({ columns = [], rows = [], onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm text-gray-700">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
