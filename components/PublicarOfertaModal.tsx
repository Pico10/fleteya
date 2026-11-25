'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  CATALOGO_VEHICULOS,
  EstadoSemaforo,
  RepartoEntrega,
  TipoLiquidacion,
} from '@/types/logistica';
import {
  X,
  Plus,
  Trash2,
  MapPin,
  ShieldCheck,
  HardHat,
  Truck,
  FilePlus2,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function PublicarOfertaModal({ onClose }: Props) {
  const hoy = new Date();
  const fechaHoyStr = hoy.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaHoyStr = hoy.toTimeString().slice(0, 5);

  const [guia, setGuia] = useState(() => String(Math.floor(30270000 + Math.random() * 9999)));
  const [fleteroNombre, setFleteroNombre] = useState('');
  const [contactoFlete, setContactoFlete] = useState('');

  const [fechaOfrecimiento, setFechaOfrecimiento] = useState(fechaHoyStr);
  const [horaOfrecimiento, setHoraOfrecimiento] = useState(horaHoyStr);
  const [fechaPedido, setFechaPedido] = useState(fechaHoyStr);
  const [horaPedido, setHoraPedido] = useState('18:00');

  const [estadoSemaforo, setEstadoSemaforo] = useState<EstadoSemaforo>('verde');
  const [ofrecimientoSimultaneo, setOfrecimientoSimultaneo] = useState(false);

  const [origenLocalidad, setOrigenLocalidad] = useState('');
  const [linkGoogleMaps, setLinkGoogleMaps] = useState('');

  const [tipoVehiculo, setTipoVehiculo] = useState('Semi largo 13,5 mts');
  const [categoriaTransporte, setCategoriaTransporte] = useState<
    'Interjurisdiccional' | 'No interjurisdiccional' | 'Especial / Local'
  >('Interjurisdiccional');
  const [tipoContrato, setTipoContrato] = useState('');
  const [cupoTotal, setCupoTotal] = useState<number>(1);
  const [cupoPendiente, setCupoPendiente] = useState<number>(1);

  const [tipoLiquidacion, setTipoLiquidacion] = useState<TipoLiquidacion>('KM');
  const [kmReales, setKmReales] = useState<number>(300);
  const [kmLiquidar, setKmLiquidar] = useState<number>(320);
  const [tarifaReferencia, setTarifaReferencia] = useState<number>(1100);

  // Repartos / Clientes multiparada
  const [repartos, setRepartos] = useState<RepartoEntrega[]>([
    {
      orden: 1,
      cliente: '',
      direccion: '',
      localidad: '',
      producto: '',
      toneladas: 0,
    },
  ]);

  // Seguridad y EPP
  const [cadenas, setCadenas] = useState<number>(0);
  const [fajas, setFajas] = useState<number>(0);
  const [cunas, setCunas] = useState<number>(0);
  const [otrosSujecion, setOtrosSujecion] = useState('');

  const [casco, setCasco] = useState(true);
  const [chaleco, setChaleco] = useState(true);
  const [borceguies, setBorceguies] = useState(true);
  const [ropaSeguridad, setRopaSeguridad] = useState(false);
  const [otrosEpp, setOtrosEpp] = useState('');

  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const agregarReparto = () => {
    setRepartos([
      ...repartos,
      {
        orden: repartos.length + 1,
        cliente: '',
        direccion: '',
        localidad: '',
        producto: '',
        toneladas: 0,
      },
    ]);
  };

  const eliminarReparto = (index: number) => {
    if (repartos.length === 1) return;
    const filtrados = repartos
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, orden: idx + 1 }));
    setRepartos(filtrados);
  };

  const actualizarReparto = (index: number, campo: keyof RepartoEntrega, valor: string | number) => {
    const copia = [...repartos];
    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };
    setRepartos(copia);
  };

  const toneladasTotales = repartos.reduce((acc, r) => acc + (Number(r.toneladas) || 0), 0);

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fleteroNombre || !origenLocalidad) return;

    setGuardando(true);
    try {
      await addDoc(collection(db, 'ofertas_viajes'), {
        guia: guia.trim(),
        fleteroId: 'fletero-activo',
        fleteroNombre: fleteroNombre.trim(),
        contactoFlete: contactoFlete.trim() || 'Sin teléfono',
        fechaOfrecimiento,
        horaOfrecimiento,
        fechaPedido,
        horaPedido,
        estadoSemaforo,
        ofrecimientoSimultaneo,
        origenLocalidad: origenLocalidad.trim(),
        linkGoogleMaps:
          linkGoogleMaps.trim() ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origenLocalidad)}`,
        tipoVehiculo,
        categoriaTransporte,
        tipoContrato: tipoContrato.trim() || 'Viaje puntual',
        cupoTotal: Number(cupoTotal) || 1,
        cupoPendiente: Number(cupoPendiente) || 1,
        repartos: repartos.map((r) => ({
          ...r,
          toneladas: Number(r.toneladas) || 0,
        })),
        toneladasTotales: Number(toneladasTotales.toFixed(3)),
        tipoLiquidacion,
        kmReales: Number(kmReales) || 0,
        kmLiquidar: Number(kmLiquidar) || 0,
        tarifaReferencia: Number(tarifaReferencia) || 0,
        seguridad: {
          cadenas: Number(cadenas) || 0,
          fajas: Number(fajas) || 0,
          cunas: Number(cunas) || 0,
          otrosSujecion: otrosSujecion.trim(),
          epp: {
            casco,
            chaleco,
            borceguies,
            ropaSeguridad,
            otrosEpp: otrosEpp.trim(),
          },
        },
        observaciones: observaciones.trim(),
        transportistaAsignado: null,
        createdAt: serverTimestamp(),
      });

      alert(`Guía #${guia} publicada correctamente en el tablero.`);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al publicar el viaje.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <form
        onSubmit={handlePublicar}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header Modal */}
        <div className="bg-sky-700 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FilePlus2 className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide">
                Publicar Nuevo Pedido de Flete (Dador de Carga)
              </h2>
              <p className="text-[11px] text-sky-100">
                Configurá unidad, repartos multiparada, kilometraje y requisitos de seguridad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-sky-600 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs">
          {/* Bloque 1: Datos de la Empresa y Control de Oferta */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-extrabold text-slate-700 uppercase text-[11px] tracking-wider">
              1. Identificación de la Carga y Ventana de Ofrecimiento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">N° de Guía</label>
                <input
                  type="text"
                  required
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Empresa / Fletero *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sidersa / Agro Cierza"
                  value={fleteroNombre}
                  onChange={(e) => setFleteroNombre(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Contacto / Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: +54 9 341 555-1234"
                  value={contactoFlete}
                  onChange={(e) => setContactoFlete(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Fecha Ofrec.</label>
                <input
                  type="text"
                  value={fechaOfrecimiento}
                  onChange={(e) => setFechaOfrecimiento(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Hora Ofrec.</label>
                <input
                  type="text"
                  value={horaOfrecimiento}
                  onChange={(e) => setHoraOfrecimiento(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Fecha Pedido</label>
                <input
                  type="text"
                  value={fechaPedido}
                  onChange={(e) => setFechaPedido(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Hora Pedido</label>
                <input
                  type="text"
                  value={horaPedido}
                  onChange={(e) => setHoraPedido(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-600">Estado inicial semáforo:</span>
                <select
                  value={estadoSemaforo}
                  onChange={(e) => setEstadoSemaforo(e.target.value as EstadoSemaforo)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                >
                  <option value="verde">🟢 Verde (En término - Toma directa)</option>
                  <option value="rojo">🔴 Rojo (Con demora - Requiere confirmación)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 font-bold text-sky-900 bg-sky-100 border border-sky-300 px-3 py-1.5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={ofrecimientoSimultaneo}
                  onChange={(e) => setOfrecimientoSimultaneo(e.target.checked)}
                />
                Ofrecimiento simultáneo (resaltar en celeste)
              </label>
            </div>
          </div>

          {/* Bloque 2: Unidad Requerida, Origen y Liquidación */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-extrabold text-slate-700 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-700" />
              2. Unidad Requerida, Ubicación de Carga y Tarifación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Tipo de Vehículo Requerido *</label>
                <select
                  value={tipoVehiculo}
                  onChange={(e) => setTipoVehiculo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 outline-none focus:border-sky-600"
                >
                  {Object.entries(CATALOGO_VEHICULOS).map(([grupo, items]) => (
                    <optgroup key={grupo} label={grupo}>
                      {items.map((veh) => (
                        <option key={veh} value={veh}>
                          {veh}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Categoría de Transporte</label>
                <select
                  value={categoriaTransporte}
                  onChange={(e) => setCategoriaTransporte(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold outline-none focus:border-sky-600"
                >
                  <option value="Interjurisdiccional">TTE cargas interjurisdiccional</option>
                  <option value="No interjurisdiccional">TTE cargas no interjurisdiccional</option>
                  <option value="Especial / Local">Especial / Rural / Local</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Localidad / Planta de Carga *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cierza / San Nicolás"
                  value={origenLocalidad}
                  onChange={(e) => setOrigenLocalidad(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  Link de Google Maps (Ubicación exacta)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={linkGoogleMaps}
                  onChange={(e) => setLinkGoogleMaps(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Forma Liquidación</label>
                <select
                  value={tipoLiquidacion}
                  onChange={(e) => setTipoLiquidacion(e.target.value as TipoLiquidacion)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                >
                  <option value="KM">Por Kilómetro (KM)</option>
                  <option value="TN">Por Tonelada (TN)</option>
                  <option value="CERRADO">Viaje Cerrado ($)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Km. Reales (Maps)</label>
                <input
                  type="number"
                  value={kmReales}
                  onChange={(e) => setKmReales(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Km. a Liquidar</label>
                <input
                  type="number"
                  value={kmLiquidar}
                  onChange={(e) => setKmLiquidar(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Tarifa Sugerida ($)</label>
                <input
                  type="number"
                  value={tarifaReferencia}
                  onChange={(e) => setTarifaReferencia(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Tipo de Contrato</label>
                <input
                  type="text"
                  placeholder="Ej: Contrato Anual / Spot"
                  value={tipoContrato}
                  onChange={(e) => setTipoContrato(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Cupo Total</label>
                <input
                  type="number"
                  min="1"
                  value={cupoTotal}
                  onChange={(e) => setCupoTotal(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Cupo Pendiente</label>
                <input
                  type="number"
                  min="0"
                  value={cupoPendiente}
                  onChange={(e) => setCupoPendiente(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Repartos / Clientes Multiparada */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-700 uppercase text-[11px] tracking-wider">
                  3. Clientes y Orden de Entregas / Repartos ({repartos.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cargá uno o varios clientes en orden de descarga. Las toneladas se suman solas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-sky-100 text-sky-900 border border-sky-300 px-3 py-1 rounded-lg font-mono font-extrabold">
                  Total: {toneladasTotales.toFixed(3)} TN
                </span>
                <button
                  type="button"
                  onClick={agregarReparto}
                  className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar parada
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {repartos.map((rep, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-300 rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                >
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      #{rep.orden} Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre cliente"
                      value={rep.cliente}
                      onChange={(e) => actualizarReparto(idx, 'cliente', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Dirección</label>
                    <input
                      type="text"
                      required
                      placeholder="Calle y altura / Ruta"
                      value={rep.direccion}
                      onChange={(e) => actualizarReparto(idx, 'direccion', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Localidad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ciudad / Prov."
                      value={rep.localidad}
                      onChange={(e) => actualizarReparto(idx, 'localidad', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Producto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Chapas / Bolsones"
                      value={rep.producto}
                      onChange={(e) => actualizarReparto(idx, 'producto', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">TN</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={rep.toneladas || ''}
                      onChange={(e) => actualizarReparto(idx, 'toneladas', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono font-bold text-right"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => eliminarReparto(idx)}
                      disabled={repartos.length === 1}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                      title="Quitar parada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloque 4: Seguridad de la Carga y EPP */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
            <h3 className="font-extrabold text-amber-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              4. Requisitos de Sujeción y EPP Obligatorios
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cadenas (mín.)</label>
                <input
                  type="number"
                  min="0"
                  value={cadenas}
                  onChange={(e) => setCadenas(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fajas (mín.)</label>
                <input
                  type="number"
                  min="0"
                  value={fajas}
                  onChange={(e) => setFajas(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cunas</label>
                <input
                  type="number"
                  min="0"
                  value={cunas}
                  onChange={(e) => setCunas(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Otros sujeción</label>
                <input
                  type="text"
                  placeholder="Ej: Esquineros / Lona"
                  value={otrosSujecion}
                  onChange={(e) => setOtrosSujecion(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-semibold"
                />
              </div>
            </div>

            <div className="pt-1">
              <span className="font-bold text-slate-700 flex items-center gap-1 mb-2">
                <HardHat className="w-4 h-4 text-amber-600" />
                Elementos de Protección Personal (EPP) requeridos para el chofer:
              </span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={casco} onChange={(e) => setCasco(e.target.checked)} />
                  Casco
                </label>
                <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={chaleco} onChange={(e) => setChaleco(e.target.checked)} />
                  Chaleco reflectivo
                </label>
                <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={borceguies} onChange={(e) => setBorceguies(e.target.checked)} />
                  Borceguíes
                </label>
                <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ropaSeguridad}
                    onChange={(e) => setRopaSeguridad(e.target.checked)}
                  />
                  Ropa de seguridad
                </label>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Observaciones generales de planta / viaje</label>
              <input
                type="text"
                placeholder="Ej: Ingreso por Portería 2, horario estricto..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-extrabold rounded-xl text-xs transition disabled:opacity-50"
          >
            {guardando ? 'Publicando oferta...' : 'Publicar Viaje en Tablero'}
          </button>
        </div>
      </form>
    </div>
  );
}