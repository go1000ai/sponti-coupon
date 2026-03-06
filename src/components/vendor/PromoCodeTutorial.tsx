'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const PLATFORMS = [
  {
    name: 'Shopify',
    steps: [
      'Go to your Shopify Admin → Discounts',
      'Click "Import" (top-right)',
      'Upload the CSV file downloaded from SpontiCoupon',
      'Set the discount type (e.g., percentage or fixed amount) to match your deal price',
      'Set "Usage limits" → "Limit to one use per customer"',
      'Click "Import discounts"',
    ],
  },
  {
    name: 'WooCommerce',
    steps: [
      'Install the "Smart Coupons" plugin (or use WooCommerce built-in coupons)',
      'Go to WooCommerce → Coupons → Import',
      'Upload the CSV file — map the "Code" column to "Coupon code"',
      'Set the discount amount to match your deal price',
      'Set "Usage limit per coupon" to 1',
      'Click "Run the importer"',
    ],
  },
  {
    name: 'Square Online',
    steps: [
      'Go to Square Dashboard → Items & Orders → Discounts',
      'Create a new discount with the amount matching your deal',
      'Under "Promo Codes", click "Add codes" → "Import CSV"',
      'Upload the CSV file from SpontiCoupon',
      'Set each code to single-use',
      'Save the discount',
    ],
  },
  {
    name: 'Other Platforms',
    steps: [
      'Download the CSV file from your SpontiCoupon deal dashboard',
      'Open the CSV — you only need the "Code" column',
      'In your e-commerce platform, find the Coupons / Discount Codes section',
      'Import the codes (most platforms support CSV import)',
      'Set the discount amount to match the deal price on SpontiCoupon',
      'Set each code to single-use to prevent abuse',
    ],
  },
];

export function PromoCodeTutorial() {
  const [open, setOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState(0);

  return (
    <div className="border border-emerald-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <HelpCircle className="w-4 h-4" />
          How to import promo codes into your store
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
      </button>

      {open && (
        <div className="p-4 bg-white space-y-3">
          {/* Platform tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {PLATFORMS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setActivePlatform(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activePlatform === i
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Steps */}
          <ol className="space-y-2">
            {PLATFORMS[activePlatform].steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <p className="text-[11px] text-gray-400 mt-2">
            Tip: Make sure the discount amount on your store matches the deal price on SpontiCoupon.
          </p>
        </div>
      )}
    </div>
  );
}
