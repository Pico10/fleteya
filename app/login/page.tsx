'use client';

import dynamic from 'next/dynamic';

const AuthUnificado = dynamic(() => import('@/components/AuthUnificado'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Page() {
  return <AuthUnificado />;
}