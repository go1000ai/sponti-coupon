import { Loader2 } from 'lucide-react';

/**
 * Instant loading UI for vendor pages. Rendered immediately on navigation
 * (App Router Suspense boundary) so clicking a sidebar link gives instant
 * feedback while the destination page loads — instead of a frozen screen.
 */
export default function VendorLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      <p className="mt-3 text-sm">Loading…</p>
    </div>
  );
}
