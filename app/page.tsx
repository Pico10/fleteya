'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { Copy, Check, Truck, FileDown, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';

interface Viaje {
  id: string;
  token: string;
  origen: string;
  destino: string;
  tipoCamion: string;
  tipoCarga: string;
  tarifa: number;
  observaciones?: string;
  estado: 'pendiente' | 'en_curso' | 'entregado';
  remitoBase64?: string | null;
  createdAt?: any;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [viajes, setViajes] = useState<Viaje[]>([]);

  const [form, setForm] = useState({
    origen: '',
    destino: '',
    tipoCamion: 'Semi',
    tipoCarga: '',
    tarifa: '',
    observaciones: '',
  });

  // Escuchar viajes en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'viajes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Viaje, 'id'>),
      }));
      setViajes(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = nanoid(8);
      const urlBase = window.location.origin;
      const viajeUrl = `${urlBase}/v/${token}`;

      await addDoc(collection(db, 'viajes'), {
        token,
        origen: form.origen,
        destino: form.destino,
        tipoCamion: form.tipoCamion,
        tipoCarga: form.tipoCarga,
        tarifa: Number(form.tarifa),
        observaciones: form.observaciones,
        estado: 'pendiente',
        remitoBase64: null,
        createdAt: serverTimestamp(),
      });

      const mensajeWhatsApp = `🚚 *NUEVO FLETE DISPONIBLE*\n📍 *Trayecto:* ${form.origen} -> ${form.destino}\n🚛 *Unidad:* ${form.tipoCamion}\n📦 *Carga:* ${form.tipoCarga}\n💰 *Tarifa:* $${Number(form.tarifa).toLocaleString('es-AR')}\n\n👉 *Ver detalles y tomar flete:* ${viajeUrl}`;

      setLinkGenerado(mensajeWhatsApp);
      setForm({
        origen: '',
        destino: '',
        tipoCamion: 'Semi',
        tipoCarga: '',
        tarifa: '',
        observaciones: '',
      });
    } catch (err) {
      console.error(err);
      alert('Error al crear el viaje en Firestore');
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const descargarPDFViaje = (v: Viaje) => {
    const pdf = new jsPDF('p', 'mm', 'a4');

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FLETEYA - COMPROBANTE DE ENTREGA', 15, 18);

    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`CODIGO DE VIAJE: ${v.token}`, 15, 38);
    pdf.text(`FECHA DE CIERRE: ${new Date().toLocaleDateString('es-AR')}`, 130, 38);

    pdf.setDrawColor(203, 213, 225);
    pdf.line(15, 42, 195, 42);

    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLES OPERATIVOS', 15, 50);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`• Tramo: ${v.origen} -> ${v.destino}`, 15, 58);
    pdf.text(`• Tipo de Camion: ${v.tipoCamion}`, 15, 65);
    pdf.text(`• Tipo de Carga: ${v.tipoCarga}`, 15, 72);
    pdf.text(`• Tarifa Acordada: $${v.tarifa.toLocaleString('es-AR')}`, 15, 79);

    if (v.observaciones) {
      pdf.text(`• Observaciones: ${v.observaciones}`, 15, 86);
    }

    pdf.line(15, 92, 195, 92);

    if (v.remitoBase64) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('REMITO FIRMADO / CONSTANCIA DIGITAL', 15, 100);
      pdf.addImage(v.remitoBase64, 'JPEG', 20, 106, 170, 170, undefined, 'FAST');
    }

    pdf.save(`Remito-${v.token}.pdf`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Formulario de Carga */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">FleteYa - Panel Despacho</h1>
              <p className="text-xs text-slate-400">Crear y asignar viajes para WhatsApp</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Origen</label>
                <input
                  required
                  placeholder="Ej: San Lorenzo"
                  value={form.origen}
                  onChange={(e) => setForm({ ...form, origen: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Destino</label>
                <input
                  required
                  placeholder="Ej: Puerto Rosario"
                  value={form.destino}
                  onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Camión</label>
                <select
                  value={form.tipoCamion}
                  onChange={(e) => setForm({ ...form, tipoCamion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="Semi">Semi</option>
                  <option value="Batea">Batea</option>
                  <option value="Chasis">Chasis</option>
                  <option value="Carretón">Carretón</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tarifa ($ ARS)</label>
                <input
                  required
                  type="number"
                  placeholder="Ej: 223000"
                  value={form.tarifa}
                  onChange={(e) => setForm({ ...form, tarifa: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Tipo de Carga</label>
              <input
                required
                placeholder="Ej: Bobinas de chapa / Granel"
                value={form.tipoCarga}
                onChange={(e) => setForm({ ...form, tipoCarga: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Observaciones / EPP</label>
              <input
                placeholder="Ej: Casco y calzado de seguridad"
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Flete y Generar Mensaje'}
            </button>
          </form>

          {linkGenerado && (
            <div className="mt-6 p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-3">
              <p className="text-xs text-emerald-400 font-semibold">✅ Viaje registrado en el sistema</p>
              <pre className="text-xs bg-slate-900 p-3 rounded-lg text-slate-300 whitespace-pre-wrap font-sans border border-slate-800">
                {linkGenerado}
              </pre>
              <button
                onClick={() => copiarAlPortapapeles(linkGenerado)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado al portapapeles' : 'Copiar mensaje para WhatsApp'}
              </button>
            </div>
          )}
        </section>

        {/* Tabla Operativa en Tiempo Real */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-200">Viajes Registrados</h2>
            <span className="text-xs text-slate-400">{viajes.length} en total</span>
          </div>

          {viajes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No hay viajes cargados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Tramo</th>
                    <th className="py-3 px-3">Equipo</th>
                    <th className="py-3 px-3">Tarifa</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {viajes.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono text-xs text-blue-400">{v.token}</td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-200">{v.origen}</span>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="font-medium text-slate-200">{v.destino}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{v.tipoCamion}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-400">
                        ${v.tarifa.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase ${
                            v.estado === 'pendiente'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : v.estado === 'en_curso'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {v.estado === 'pendiente' && 'Disponible'}
                          {v.estado === 'en_curso' && 'En Tránsito'}
                          {v.estado === 'entregado' && 'Entregado'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                        <a
                          href={`/v/${v.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-md transition"
                          title="Abrir enlace del chofer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {v.estado === 'entregado' && v.remitoBase64 && (
                          <button
                            onClick={() => descargarPDFViaje(v)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition"
                            title="Descargar Remito PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}