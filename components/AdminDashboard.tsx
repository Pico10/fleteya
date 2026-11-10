'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { 
  Truck, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileCheck, 
  X, 
  CheckCircle2,
  FileText,
  UserPlus,
  Phone,
  CreditCard,
  LogOut,
  ArrowLeft
} from 'lucide-react';

interface Chofer {
  id: string;
  nombre: string;
  telefono: string;
  patenteTractor: string;
  tipoCamion: string;
}

interface Viaje {
  id: string;
  origen: string;
  destino: string;
  tipoCamion: string;
  tipoCarga: string;
  peso: string;
  fechaRetiro: string;
  tarifa: number;
  comision: number;
  distanciaKm: number;
  estado: 'pendiente' | 'en_curso' | 'entregado';
  etapaRuta?: 'llegada_origen' | 'en_transito' | 'llegada_destino' | null;
  chofer?: {
    nombre: string;
    patenteTractor: string;
    telefono?: string;
  } | null;
  remitoBase64?: string | null;
  alertaRuta?: {
    mensaje: string;
    hora: string;
  } | null;
  createdAt?: any;
}

const reproducirAlertaSonora = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.error('AudioContext bloqueado:', e);
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'cotizar' | 'viajes' | 'choferes'>('cotizar');

  const [origen, setOrigen] = useState('Rosario, Santa Fe');
  const [destino, setDestino] = useState('Buenos Aires (~300 km)');
  const [tipoCamion, setTipoCamion] = useState<'Camión' | 'Semi' | 'Batea'>('Camión');
  const [peso, setPeso] = useState('5-12 tn');
  const [tipoCarga, setTipoCarga] = useState('General / pallet');
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [choferAsignadoPatente, setChoferAsignadoPatente] = useState('');

  const [modalNuevoChofer, setModalNuevoChofer] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [patenteNueva, setPatenteNueva] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [tipoNuevo, setTipoNuevo] = useState('Camión');
  const [guardandoChofer, setGuardandoChofer] = useState(false);

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [creandoViaje, setCreandoViaje] = useState(false);
  const [remitoModal, setRemitoModal] = useState<string | null>(null);

  const [alertaFlotante, setAlertaFlotante] = useState<{ chofer: string; patente: string; mensaje: string; hora: string } | null>(null);
  const alertasConocidasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, 'choferes'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Chofer[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Chofer, 'id'>),
      }));
      setChoferes(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'viajes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: Viaje[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Viaje, 'id'>),
      }));
      setViajes(docs);

      docs.forEach((v) => {
        if (v.alertaRuta && v.chofer) {
          const alertKey = `${v.id}-${v.alertaRuta.hora}-${v.alertaRuta.mensaje}`;
          if (!alertasConocidasRef.current.has(alertKey)) {
            alertasConocidasRef.current.add(alertKey);
            reproducirAlertaSonora();
            setAlertaFlotante({
              chofer: v.chofer.nombre,
              patente: v.chofer.patenteTractor,
              mensaje: v.alertaRuta.mensaje,
              hora: v.alertaRuta.hora,
            });
          }
        }
      });
    });
    return () => unsub();
  }, []);

  const flotaCompletaMap = new Map<string, { nombre: string; patenteTractor: string; tipoCamion: string; telefono?: string }>();
  
  choferes.forEach(c => {
    const pat = c.patenteTractor.replace(/\s+/g, '').toUpperCase();
    flotaCompletaMap.set(pat, {
      nombre: c.nombre,
      patenteTractor: c.patenteTractor.toUpperCase(),
      tipoCamion: c.tipoCamion,
      telefono: c.telefono
    });
  });

  viajes.forEach(v => {
    if (v.chofer?.patenteTractor) {
      const pat = v.chofer.patenteTractor.replace(/\s+/g, '').toUpperCase();
      if (!flotaCompletaMap.has(pat)) {
        flotaCompletaMap.set(pat, {
          nombre: v.chofer.nombre,
          patenteTractor: v.chofer.patenteTractor.toUpperCase(),
          tipoCamion: v.tipoCamion || 'Camión',
          telefono: v.chofer.telefono || 'Sin registrar'
        });
      }
    }
  });

  const flotaTotal = Array.from(flotaCompletaMap.values());

  const patentesOcupadas = new Set(
    viajes
      .filter((v) => v.estado === 'en_curso' && v.chofer?.patenteTractor)
      .map((v) => v.chofer!.patenteTractor.replace(/\s+/g, '').toUpperCase())
  );

  const distanciaKm = destino.includes('300') ? 300 : destino.includes('400') ? 400 : 500;
  const tarifaKm = tipoCamion === 'Camión' ? 700 : tipoCamion === 'Semi' ? 900 : 1100;
  const tarifaTotal = distanciaKm * tarifaKm;
  const comision = Math.round(tarifaTotal * 0.1);

  const handleCrearViaje = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoViaje(true);

    try {
      const choferSeleccionado = flotaTotal.find(
        (c) => c.patenteTractor.replace(/\s+/g, '').toUpperCase() === choferAsignadoPatente.replace(/\s+/g, '').toUpperCase()
      ) || null;

      await addDoc(collection(db, 'viajes'), {
        origen,
        destino,
        tipoCamion,
        tipoCarga,
        peso,
        fechaRetiro: fechaRetiro || new Date().toISOString().split('T')[0],
        tarifa: tarifaTotal,
        comision,
        distanciaKm,
        estado: choferSeleccionado ? 'en_curso' : 'pendiente',
        etapaRuta: choferSeleccionado ? 'en_transito' : null,
        chofer: choferSeleccionado
          ? {
              nombre: choferSeleccionado.nombre,
              patenteTractor: choferSeleccionado.patenteTractor,
              telefono: choferSeleccionado.telefono || '',
            }
          : null,
        remitoBase64: null,
        alertaRuta: null,
        createdAt: serverTimestamp(),
      });

      alert('Viaje registrado correctamente.');
      setChoferAsignadoPatente('');
      setTab('viajes');
    } catch (err) {
      console.error(err);
      alert('Error al registrar el flete.');
    } finally {
      setCreandoViaje(false);
    }
  };

  const handleGuardarNuevoChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevo || !patenteNueva) return;
    setGuardandoChofer(true);

    try {
      await addDoc(collection(db, 'choferes'), {
        nombre: nombreNuevo.trim(),
        patenteTractor: patenteNueva.trim().toUpperCase(),
        telefono: telefonoNuevo.trim() || 'Sin registrar',
        tipoCamion: tipoNuevo,
        createdAt: serverTimestamp(),
      });

      setNombreNuevo('');
      setPatenteNueva('');
      setTelefonoNuevo('');
      setModalNuevoChofer(false);
      alert('Camionero registrado con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el chofer.');
    } finally {
      setGuardandoChofer(false);
    }
  };

  const exportarReportePDF = () => {
    if (viajes.length === 0) {
      alert('No hay viajes para exportar.');
      return;
    }

    const totalFacturado = viajes.reduce((acc, v) => acc + (Number(v.tarifa) || 0), 0);
    const totalComision = viajes.reduce((acc, v) => acc + (Number(v.comision) || Math.round((Number(v.tarifa) || 0) * 0.1)), 0);

    const filasHtml = viajes.map(v => {
      const com = Number(v.comision) || Math.round((Number(v.tarifa) || 0) * 0.1);
      const etapaTxt = v.etapaRuta === 'llegada_origen' ? 'En Carga' : v.etapaRuta === 'llegada_destino' ? 'En Descarga' : v.estado === 'entregado' ? 'Entregado' : 'En Tránsito';
      return `
        <tr>
          <td>${v.fechaRetiro || '-'}</td>
          <td><strong>${v.origen} → ${v.destino}</strong></td>
          <td>${v.chofer ? `${v.chofer.nombre} <br><small style="color:#666">${v.chofer.patenteTractor}</small>` : 'Sin asignar'}</td>
          <td><span class="badge ${v.estado}">${etapaTxt}</span></td>
          <td style="text-align: right; font-weight: bold;">$${Number(v.tarifa).toLocaleString('es-AR')}</td>
          <td style="text-align: right; color: #047857; font-weight: bold;">$${com.toLocaleString('es-AR')}</td>
        </tr>
      `;
    }).join('');

    const ventanaPrint = window.open('', '_blank');
    if (!ventanaPrint) {
      alert('Por favor habilitá las ventanas emergentes para generar el PDF.');
      return;
    }

    ventanaPrint.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Liquidaciones - FleteYa</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 900; color: #2563eb; }
          .meta { text-align: right; font-size: 11px; color: #64748b; }
          .resumen { display: flex; gap: 20px; margin-bottom: 25px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; flex: 1; }
          .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .card-val { font-size: 20px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .badge { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; }
          .badge.entregado { background: #dcfce7; color: #166534; }
          .badge.en_curso { background: #dbeafe; color: #1e40af; }
          .badge.pendiente { background: #f1f5f9; color: #475569; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">FleteYa • Logística & Cargas</div>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Cierre Oficial de Liquidaciones y Fletes</p>
          </div>
          <div class="meta">
            <p><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
            <p><strong>Total Registros:</strong> ${viajes.length} viaje(s)</p>
          </div>
        </div>

        <div class="resumen">
          <div class="card">
            <div class="card-title">Total Fletes Facturados</div>
            <div class="card-val" style="color: #0f172a;">$${totalFacturado.toLocaleString('es-AR')}</div>
          </div>
          <div class="card">
            <div class="card-title">Comisión Neta FleteYa (10%)</div>
            <div class="card-val" style="color: #047857;">$${totalComision.toLocaleString('es-AR')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tramo / Ruta</th>
              <th>Camionero</th>
              <th>Estado</th>
              <th style="text-align: right;">Tarifa Total</th>
              <th style="text-align: right;">Comisión</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    ventanaPrint.document.close();
  };

  const handleCerrarSesionAdmin = () => {
    localStorage.removeItem('fleteya_admin_autenticado');
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800">
      {/* Banner de alerta emergente */}
      {alertaFlotante && (
        <div className="fixed top-5 right-5 z-50 bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-2xl border-2 border-amber-300 max-w-sm flex items-start gap-3 animate-bounce">
          <div className="p-2 bg-amber-600/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-slate-950" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Demora en ruta</span>
              <span className="text-[10px] font-bold bg-amber-400 px-1.5 py-0.5 rounded-md">{alertaFlotante.hora}</span>
            </div>
            <p className="text-sm font-extrabold mt-0.5">{alertaFlotante.chofer} ({alertaFlotante.patente})</p>
            <p className="text-xs font-semibold mt-1 bg-amber-400/50 p-1.5 rounded-lg border border-amber-300">
              "{alertaFlotante.mensaje}"
            </p>
          </div>
          <button onClick={() => setAlertaFlotante(null)} className="p-1 hover:bg-amber-400 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra superior con botón de retorno y salida */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">FleteYa</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl ml-4">
              <button
                onClick={() => setTab('cotizar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  tab === 'cotizar' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cotizar
              </button>
              <button
                onClick={() => setTab('viajes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition relative ${
                  tab === 'viajes' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mis viajes
                {viajes.some((v) => v.alertaRuta) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                )}
              </button>
              <button
                onClick={() => setTab('choferes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  tab === 'choferes' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Camioneros ({flotaTotal.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menú Principal</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                MV
              </div>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">Despacho</span>
              <button
                onClick={handleCerrarSesionAdmin}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {tab === 'cotizar' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-xl font-extrabold text-slate-900">Nueva cotización de flete</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleCrearViaje} className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Envío</h2>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Origen</label>
                  <select
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option>Rosario, Santa Fe</option>
                    <option>San Lorenzo, Santa Fe</option>
                    <option>Córdoba Capital</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Destino</label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option>Buenos Aires (~300 km)</option>
                    <option>Córdoba (~400 km)</option>
                    <option>Mendoza (~850 km)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Peso estimado</label>
                    <select
                      value={peso}
                      onChange={(e) => setPeso(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    >
                      <option>5-12 tn</option>
                      <option>12-25 tn</option>
                      <option>25-30 tn</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de carga</label>
                    <select
                      value={tipoCarga}
                      onChange={(e) => setTipoCarga(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    >
                      <option>General / pallet</option>
                      <option>Granel / cereal</option>
                      <option>Bobinas / siderurgia</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600">Asignar a chofer de flota</label>
                    <button
                      type="button"
                      onClick={() => setModalNuevoChofer(true)}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Registrar chofer
                    </button>
                  </div>

                  <select
                    value={choferAsignadoPatente}
                    onChange={(e) => setChoferAsignadoPatente(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">⏱️ Dejar pendiente para asignar luego</option>
                    {flotaTotal.map((c) => {
                      const ocupado = patentesOcupadas.has(c.patenteTractor.replace(/\s+/g, '').toUpperCase());
                      return (
                        <option
                          key={c.patenteTractor}
                          value={c.patenteTractor}
                          disabled={ocupado}
                          className={ocupado ? 'text-red-600 font-bold bg-red-50' : 'text-emerald-700 font-bold'}
                        >
                          {ocupado ? '🔴 [OCUPADO EN VIAJE]' : '🟢 [DISPONIBLE]'} {c.nombre} • Patente: {c.patenteTractor} ({c.tipoCamion})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Fecha de retiro</label>
                  <input
                    type="date"
                    value={fechaRetiro}
                    onChange={(e) => setFechaRetiro(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={creandoViaje}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {creandoViaje ? 'Creando viaje...' : 'Crear viaje en el sistema →'}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Vehículo</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Camión', 'Semi', 'Batea'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoCamion(t)}
                        className={`p-3 rounded-xl border text-center transition ${
                          tipoCamion === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <p className="text-xs font-bold">{t}</p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-800">Cotización estimada</p>
                    <p className="text-3xl font-black text-blue-900">${tarifaTotal.toLocaleString('es-AR')}</p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Distancia</span>
                        <span className="font-bold text-slate-800">{distanciaKm} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Comisión (10%)</span>
                        <span className="font-bold text-emerald-700">${comision.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'viajes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-extrabold text-slate-900">Control de viajes y tráfico</h1>
              <button
                onClick={exportarReportePDF}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Descargar Liquidaciones (PDF)
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Estado / Progreso</th>
                      <th className="p-3.5">Ruta</th>
                      <th className="p-3.5">Camionero</th>
                      <th className="p-3.5">Tarifa / Comisión</th>
                      <th className="p-3.5">Contingencia / Alerta</th>
                      <th className="p-3.5 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viajes.map((v) => {
                      const comisionReal = Number(v.comision) || Math.round((Number(v.tarifa) || 0) * 0.1);
                      const etapaActual = v.etapaRuta || 'en_transito';

                      return (
                        <tr key={v.id} className={v.alertaRuta ? 'bg-amber-50/50' : 'hover:bg-slate-50/80'}>
                          <td className="p-3.5 space-y-1">
                            {v.estado === 'en_curso' && (
                              <div className="space-y-1">
                                <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-max">
                                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                  En viaje
                                </span>
                                <div>
                                  {etapaActual === 'llegada_origen' && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                      📦 En Carga
                                    </span>
                                  )}
                                  {etapaActual === 'en_transito' && (
                                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block">
                                      🚚 En Tránsito
                                    </span>
                                  )}
                                  {etapaActual === 'llegada_destino' && (
                                    <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md inline-block">
                                      🏢 En Descarga
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {v.estado === 'entregado' && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" />
                                Entregado
                              </span>
                            )}
                            {v.estado === 'pendiente' && (
                              <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full w-max">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900">{v.origen} → {v.destino}</p>
                            <p className="text-[11px] text-slate-500">{v.tipoCarga} • {v.tipoCamion}</p>
                          </td>
                          <td className="p-3.5">
                            {v.chofer ? (
                              <div>
                                <p className="font-bold text-slate-900">{v.chofer.nombre}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{v.chofer.patenteTractor}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sin asignar</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <p className="font-extrabold text-slate-900">${Number(v.tarifa).toLocaleString('es-AR')}</p>
                            <p className="text-[11px] text-emerald-600 font-bold">Com: ${comisionReal.toLocaleString('es-AR')}</p>
                          </td>
                          <td className="p-3.5">
                            {v.alertaRuta ? (
                              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 font-bold text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>{v.alertaRuta.mensaje} ({v.alertaRuta.hora})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sin novedades</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {v.remitoBase64 ? (
                              <button
                                onClick={() => setRemitoModal(v.remitoBase64 || null)}
                                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <FileCheck className="w-4 h-4" />
                                Ver remito
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">En espera</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'choferes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Flota de choferes registrados</h1>
                <p className="text-xs text-slate-500">Unidades habilitadas para asignación directa de fletes</p>
              </div>
              <button
                onClick={() => setModalNuevoChofer(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-4 h-4" />
                Registrar nuevo chofer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {flotaTotal.map((c) => {
                const ocupado = patentesOcupadas.has(c.patenteTractor.replace(/\s+/g, '').toUpperCase());

                return (
                  <div key={c.patenteTractor} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900">{c.nombre}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        ocupado ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {ocupado ? '🔴 En viaje' : '🟢 Disponible'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-mono">Patente: <span className="font-bold text-slate-800">{c.patenteTractor}</span></p>
                      <p>Equipo: <strong className="text-slate-700">{c.tipoCamion}</strong></p>
                      <p>Tel: <span className="text-slate-700">{c.telefono || 'Sin registrar'}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalNuevoChofer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleGuardarNuevoChofer} className="bg-white rounded-2xl max-w-sm w-full p-5 relative space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Alta de transportista / Chofer</h3>
              <button type="button" onClick={() => setModalNuevoChofer(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Nombre y Apellido</label>
              <input
                type="text"
                required
                placeholder="Ej: Máximo Villalba"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Patente del Tractor</label>
              <input
                type="text"
                required
                placeholder="Ej: QA123QA"
                value={patenteNueva}
                onChange={(e) => setPatenteNueva(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold uppercase outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Teléfono de contacto</label>
              <input
                type="text"
                placeholder="Ej: +54 9 341 1234567"
                value={telefonoNuevo}
                onChange={(e) => setTelefonoNuevo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tipo de Equipo</label>
              <select
                value={tipoNuevo}
                onChange={(e) => setTipoNuevo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold outline-none focus:border-blue-500"
              >
                <option>Camión</option>
                <option>Semi</option>
                <option>Batea</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={guardandoChofer}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                {guardandoChofer ? 'Guardando...' : 'Dar de alta en flota'}
              </button>
            </div>
          </form>
        </div>
      )}

      {remitoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 relative space-y-3">
            <button
              onClick={() => setRemitoModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-900">Comprobante de entrega firmado</h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-96">
              <img src={remitoModal} alt="Remito firmado" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}