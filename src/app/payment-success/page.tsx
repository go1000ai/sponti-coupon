'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="inline-flex bg-green-50 rounded-full p-5 mb-5">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Received!</h1>
        <p className="text-gray-500 mb-8">
          Your payment was processed successfully. Enjoy your deal!
        </p>
        <Link href="/dashboard/my-coupons" className="btn-primary w-full">
          View My Coupons
        </Link>
      </div>
    </div>
  );
}
