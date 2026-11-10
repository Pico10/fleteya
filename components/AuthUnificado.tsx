'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ShieldCheck, ArrowRight, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthUnificado() {
  const router = useRouter();
  const [rol, setRol] = useState<'chofer' | 'admin'>('chofer');

  // Chofer
  const [patente, setPatente] = useState('');

  // Admin
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleIngresoChofer = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patente.trim().toUpperCase();
    if (!pat) return;

    localStorage.setItem('fleteya_patente_chofer', pat);
    localStorage.setItem('fleteya_rol_activo', 'chofer');
    router.push('/chofer');
  };

  const handleIngresoAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación de acceso para Despacho Central
    if ((adminUser.trim() === 'admin' || adminUser.trim() === 'despacho') && adminPass === 'admin123') {
      localStorage.setItem('fleteya_admin_autenticado', 'true');
      localStorage.setItem('fleteya_rol_activo', 'admin');
      router.push('/');
    } else {
      setErrorMsg('Credenciales inválidas. Probá con despacho / admin123');
    }
  };

  return (
    <main className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Cabecera de Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg mb-1">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">FleteYa</h1>
          <p className="text-xs text-slate-400">Plataforma Logística y Despacho en Tiempo Real</p>
        </div>

        {/* Selector de Rol */}
        <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl grid grid-cols-2 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => { setRol('chofer'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              rol === 'chofer'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            Chofer de Flota
          </button>

          <button
            type="button"
            onClick={() => { setRol('admin'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              rol === 'admin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Despacho / Admin
          </button>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {rol === 'chofer' ? (
            <form onSubmit={handleIngresoChofer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Patente del Tractor
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: QA123QA"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-lg font-mono font-bold tracking-widest text-white uppercase outline-none focus:border-blue-500 transition"
                />
                <p className="text-[11px] text-slate-500 text-center pt-1">
                  Ingresá con tu tractor para consultar la hoja de ruta y enviar remitos.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99]"
              >
                <span>Acceder a mi Unidad</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleIngresoAdmin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Usuario de Despacho
                </label>
                <input
                  type="text"
                  required
                  placeholder="despacho"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-white outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contraseña Central
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-white outline-none focus:border-blue-500 transition pr-8"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-2.5 top-3" />
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Acceso restringido a operadores centrales y liquidación. (Demo: despacho / admin123)
              </p>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99]"
              >
                <span>Entrar a Panel Central</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

      </div>
    </main>
  );
}