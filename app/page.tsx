'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Navigation, Truck } from 'lucide-react';

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

const TableroOfertas = dynamic(() => import('@/components/TableroOfertas'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Cargando bolsa de cargas B2B...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  const [moduloActivo, setModuloActivo] = useState<'b2b' | 'operaciones'>('b2b');

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
      {/* Barra Superior Unificada de FleteYa 2.0 */}
      <header className="bg-slate-900 text-white px-4 py-2.5 shadow-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block leading-none">
                FleteYa <span className="text-sky-400">2.0</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Plataforma Logística Integral • B2B + GPS + Flota
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setModuloActivo('b2b')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                moduloActivo === 'b2b'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Bolsa de Cargas B2B y Flota
            </button>

            <button
              type="button"
              onClick={() => setModuloActivo('operaciones')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                moduloActivo === 'operaciones'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Despacho, GPS Satelital y Remitos
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido Unificado */}
      <div className="flex-1">
        {moduloActivo === 'b2b' ? <TableroOfertas /> : <AdminDashboard />}
      </div>
    </div>
  );
}