import React, { useState } from 'react';

/**
 * Live margin rule preview component.
 * Shows "Customer pays: ₹X | Your profit: ₹Y (Z%)" as admin types a vendor price.
 * Used in the Margin Rules add/edit form.
 * @param {{ marginPercent: number, roundingRule: string }} props
 */
export default function LivePreview({ marginPercent = 0, roundingRule = 'none' }) {
  const [vendorPrice, setVendorPrice] = useState('');

  // TODO: implement applyRounding logic matching marginEngine.applyRounding()
  const compute = () => {
    const price = parseFloat(vendorPrice);
    if (!price || price <= 0) return null;
    const marginAmount = price * (marginPercent / 100);
    const rawFinal = price + marginAmount;
    // TODO: apply roundingRule
    return { customerPays: rawFinal.toFixed(2), profit: marginAmount.toFixed(2), pct: marginPercent };
  };

  const result = compute();

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs text-gray-500 mb-2 font-medium">Live Preview</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Enter vendor price: ₹</span>
        <input
          type="number"
          value={vendorPrice}
          onChange={(e) => setVendorPrice(e.target.value)}
          placeholder="e.g. 800"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
        />
      </div>
      {result && (
        <p className="mt-2 text-sm font-medium text-gray-800">
          Customer pays: <span className="text-blue-900">₹{result.customerPays}</span>
          {' '}|{' '}
          Your profit: <span className="text-green-700">₹{result.profit} ({result.pct}%)</span>
        </p>
      )}
    </div>
  );
}
