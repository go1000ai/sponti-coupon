'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyDealsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/my-deals');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
    </div>
  );
}
