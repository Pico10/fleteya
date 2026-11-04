'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Truck, MapPin, DollarSign, Camera, CheckCircle2, AlertCircle, FileDown } from 'lucide-react';
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
}

function ChoferContent() {
  const params = useParams();
  const token = params?.token as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchViaje = async () => {
    try {
      const q = query(collection(db, 'viajes'), where('token', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setErrorMsg('El viaje solicitado no existe o el enlace expiró.');
      } else {
        const docSnap = snapshot.docs[0];
        setViaje({ id: docSnap.id, ...(docSnap.data() as Omit<Viaje, 'id'>) });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión al cargar el viaje.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchViaje();
  }, [token]);

  const aceptarViaje = async () => {
    if (!viaje) return;
    setLoading(true);
    try {
      const viajeRef = doc(db, 'viajes', viaje.id);
      await updateDoc(viajeRef, { estado: 'en_curso' });
      setViaje((prev) => (prev ? { ...prev, estado: 'en_curso' } : null));
    } catch (err) {
      alert('Error al aceptar el viaje.');
    } finally {
      setLoading(false);
    }
  };

  const procesarArchivo = (file: File) => {
    setSubiendo(true);
    console.log('Procesando archivo:', file.name, file.size);

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64Data = canvas.toDataURL('image/jpeg', 0.6);

          if (!viaje) return;
          const viajeRef = doc(db, 'viajes', viaje.id);
          await updateDoc(viajeRef, {
            remitoBase64: base64Data,
            estado: 'entregado',
          });

          setViaje((prev) =>
            prev ? { ...prev, estado: 'entregado', remitoBase64: base64Data } : null
          );
        } catch (dbErr: any) {
          console.error('Error Firestore:', dbErr);
          alert('Error al actualizar Firestore: ' + dbErr.message);
        } finally {
          setSubiendo(false);
        }
      };

      img.onerror = () => {
        alert('El archivo no pudo leerse como imagen.');
        setSubiendo(false);
      };
    };

    reader.onerror = () => {
      alert('Error al leer el archivo.');
      setSubiendo(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
    e.target.value = '';
  };

  const descargarPDF = () => {
    if (!viaje) return;

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

    pdf.text(`CÓDIGO DE VIAJE: ${viaje.token}`, 15, 38);
    pdf.text(`FECHA DE CIERRE: ${new Date().toLocaleDateString('es-AR')}`, 130, 38);

    pdf.setDrawColor(203, 213, 225);
    pdf.line(15, 42, 195, 42);

    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLES OPERATIVOS', 15, 50);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`• Tramo: ${viaje.origen} ➔ ${viaje.destino}`, 15, 58);
    pdf.text(`• Tipo de Camión: ${viaje.tipoCamion}`, 15, 65);
    pdf.text(`• Tipo de Carga: ${viaje.tipoCarga}`, 15, 72);
    pdf.text(`• Tarifa Acordada: $${viaje.tarifa.toLocaleString('es-AR')}`, 15, 79);

    if (viaje.observaciones) {
      pdf.text(`• Observaciones: ${viaje.observaciones}`, 15, 86);
    }

    pdf.line(15, 92, 195, 92);

    if (viaje.remitoBase64) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('REMITO FIRMADO / CONSTANCIA DIGITAL', 15, 100);
      pdf.addImage(viaje.remitoBase64, 'JPEG', 20, 106, 170, 170, undefined, 'FAST');
    }

    pdf.save(`Remito-${viaje.token}.pdf`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <p className="text-sm text-slate-400">Cargando flete...</p>
      </main>
    );
  }

  if (errorMsg || !viaje) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-slate-300">{errorMsg || 'Viaje no encontrado'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-12 flex flex-col items-center">
      <header className="w-full max-w-md py-4 flex items-center justify-between border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-base tracking-wide">FleteYa</span>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
            viaje.estado === 'pendiente'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : viaje.estado === 'en_curso'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {viaje.estado === 'pendiente' && 'Disponible'}
          {viaje.estado === 'en_curso' && 'En Tránsito'}
          {viaje.estado === 'entregado' && 'Entregado'}
        </span>
      </header>

      <section className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Carga / Origen</p>
              <p className="text-base font-semibold text-slate-100">{viaje.origen}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Descarga / Destino</p>
              <p className="text-base font-semibold text-slate-100">{viaje.destino}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs text-slate-400">Equipo Requerido</p>
            <p className="font-medium text-slate-200">{viaje.tipoCamion}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tipo de Carga</p>
            <p className="font-medium text-slate-200">{viaje.tipoCarga}</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-xs uppercase font-medium">Pago acordado</span>
          </div>
          <span className="text-xl font-bold text-emerald-400">
            ${viaje.tarifa.toLocaleString('es-AR')}
          </span>
        </div>

        {viaje.observaciones && (
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            <p className="text-xs text-slate-400 mb-1 font-medium">Observaciones / EPP</p>
            <p className="text-xs text-slate-300">{viaje.observaciones}</p>
          </div>
        )}

        <div className="pt-2">
          {viaje.estado === 'pendiente' && (
            <button
              onClick={aceptarViaje}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-xl text-base shadow transition"
            >
              Tomar este flete
            </button>
          )}

          {viaje.estado === 'en_curso' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={subiendo}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow transition disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                {subiendo ? 'Guardando remito...' : 'Sacar foto al Remito firmado'}
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2">
                Asegurate de que la firma y el sello se vean nítidos.
              </p>
            </div>
          )}

          {viaje.estado === 'entregado' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold text-emerald-300 text-sm">Flete entregado y cerrado</p>
                <p className="text-xs text-slate-400">El remito digital ya fue cargado con éxito.</p>
              </div>

              {viaje.remitoBase64 && (
                <div className="rounded-lg overflow-hidden border border-slate-700 max-h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viaje.remitoBase64}
                    alt="Remito firmado"
                    className="w-full object-cover"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={descargarPDF}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow transition"
              >
                <FileDown className="w-5 h-5" />
                Descargar Comprobante en PDF
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ChoferPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <p className="text-sm text-slate-400">Cargando flete...</p>
        </main>
      }
    >
      <ChoferContent />
    </Suspense>
  );
}