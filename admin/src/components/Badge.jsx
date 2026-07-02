import React from 'react';

/**
 * Status badge component.
 * @param {{ label: string, variant?: 'green'|'red'|'yellow'|'blue'|'gray' }} props
 */
export default function Badge({ label, variant = 'gray' }) {
  const styles = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant] || styles.gray}`}>
      {label}
    </span>
  );
}
