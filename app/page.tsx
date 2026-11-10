'use client';

import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Cargando panel de operaciones...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <AdminDashboard />;
}
