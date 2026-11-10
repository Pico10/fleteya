'use client';

import dynamic from 'next/dynamic';

const PortalChofer = dynamic(() => import('@/components/PortalChofer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Page() {
  return <PortalChofer />;
}