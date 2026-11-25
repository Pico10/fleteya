'use client';

import { useState, useEffect, Fragment } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc, getDocs, where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  OfertaViaje,
  EstadoSemaforo,
  ZONAS_ARGENTINA,
  RolUsuario,
} from '@/types/logistica';
import PublicarOfertaModal from './PublicarOfertaModal';
import FichaVehiculoModal from './FichaVehiculoModal';
import {
  RefreshCw,
  ChevronRight,
  ChevronDown,
  MapPin,
  ShieldCheck,
  HardHat,
  AlertCircle,
  Phone,
  PlusCircle,
  X,
  Filter,
  Truck,
  Building2,
} from 'lucide-react';

export default function TableroOfertas() {
  const [rolActivo, setRolActivo] = useState<RolUsuario>('transportista');
  const [ofertas, setOfertas] = useState<OfertaViaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);
  const [zonaFiltro, setZonaFiltro] = useState<string>('TODAS');
  const [soloDisponibles, setSoloDisponibles] = useState<boolean>(false);

  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<OfertaViaje | null>(null);
  const [nombreChofer, setNombreChofer] = useState('');
  const [patenteTractor, setPatenteTractor] = useState('');
  const [patenteSemi, setPatenteSemi] = useState('');
  const [telefonoChofer, setTelefonoChofer] = useState('');
  const [tarifaCotizada, setTarifaCotizada] = useState<number>(0);
  const [procesandoToma, setProcesandoToma] = useState(false);
  const [creandoDemo, setCreandoDemo] = useState(false);
  const [modalPublicarAbierto, setModalPublicarAbierto] = useState(false);
  const [modalVehiculoAbierto, setModalVehiculoAbierto] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'ofertas_viajes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const lista: OfertaViaje[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OfertaViaje, 'id'>),
      }));
      setOfertas(lista);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  const cargarDatosDePrueba = async () => {
    setCreandoDemo(true);
    try {
      await addDoc(collection(db, 'ofertas_viajes'), {
        guia: '30272756',
        fleteroId: 'empresa-siderurgica-01',
        fleteroNombre: 'Aceros del Paraná S.A.',
        contactoFlete: '+54 9 341 555-8899 (Logística Planta)',
        fechaOfrecimiento: '24/11/2026',
        horaOfrecimiento: '11:41',
        fechaPedido: '24/11/2026',
        horaPedido: '18:00',
        estadoSemaforo: 'rojo',
        ofrecimientoSimultaneo: true,
        origenLocalidad: 'San Nicolás / Villa Constitución',
        linkGoogleMaps: 'https://maps.google.com/?q=-33.3358,-60.2252',
        tipoVehiculo: 'SEMI LARGO 13,5 MTS',
        categoriaTransporte: 'Interjurisdiccional',
        tipoContrato: 'Contrato Anual Siderurgia - Cupo Diario',
        cupoTotal: 15,
        cupoPendiente: 4,
        repartos: [
          { orden: 1, cliente: 'Metalúrgica Norte S.R.L.', direccion: 'Av. Circunvalación 4500', localidad: 'Rosario, Santa Fe', producto: 'Chapa laminada en caliente', toneladas: 6.200 },
          { orden: 2, cliente: 'Construcciones del Centro', direccion: 'Ruta 9 Km 312', localidad: 'Roldán, Santa Fe', producto: 'Perfiles estructurales', toneladas: 5.148 },
          { orden: 3, cliente: 'Distribuidora Sur', direccion: 'Bv. Seguí 2100', localidad: 'Rosario, Santa Fe', producto: 'Bobina fleje', toneladas: 4.800 },
          { orden: 4, cliente: 'Taller Industrial Pérez', direccion: 'Av. San Martín 1120', localidad: 'Pérez, Santa Fe', producto: 'Chapa galvanizada', toneladas: 5.300 },
          { orden: 5, cliente: 'Corralón El Constructor', direccion: 'Ruta 33 Km 785', localidad: 'Casilda, Santa Fe', producto: 'Mallas electrosoldadas', toneladas: 4.000 },
        ],
        toneladasTotales: 25.448,
        tipoLiquidacion: 'KM',
        kmReales: 539,
        kmLiquidar: 661,
        tarifaReferencia: 1150,
        seguridad: {
          cadenas: 5,
          fajas: 4,
          cunas: 0,
          otrosSujecion: 'Esquineros plásticos obligatorios',
          epp: {
            casco: true,
            chaleco: true,
            borceguies: true,
            ropaSeguridad: true,
            otrosEpp: 'Guantes de descarne y gafas',
          },
        },
        observaciones: 'Ingreso por Portería 2 con documentación vigente',
        transportistaAsignado: null,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'ofertas_viajes'), {
        guia: '30272810',
        fleteroId: 'agro-export-02',
        fleteroNombre: 'Agroexportadora Cierza S.A.',
        contactoFlete: '+54 9 341 444-1122 (Despacho)',
        fechaOfrecimiento: '24/11/2026',
        horaOfrecimiento: '16:15',
        fechaPedido: '25/11/2026',
        horaPedido: '08:00',
        estadoSemaforo: 'verde',
        ofrecimientoSimultaneo: false,
        origenLocalidad: 'Cierza / Puerto San Martín',
        linkGoogleMaps: 'https://maps.google.com/?q=-32.7167,-60.7333',
        tipoVehiculo: 'Batea',
        categoriaTransporte: 'Interjurisdiccional',
        tipoContrato: 'Spot Cosecha Gruesa',
        cupoTotal: 8,
        cupoPendiente: 8,
        repartos: [
          { orden: 1, cliente: 'Planta Procesadora Mendoza', direccion: 'Acceso Este Km 1020', localidad: 'Mendoza', producto: 'Fertilizante en bolsones (Big Bag)', toneladas: 28.500 },
        ],
        toneladasTotales: 28.500,
        tipoLiquidacion: 'TN',
        kmReales: 850,
        kmLiquidar: 890,
        tarifaReferencia: 38000,
        seguridad: {
          cadenas: 0,
          fajas: 8,
          cunas: 2,
          otrosSujecion: 'Lona impermeable sana',
          epp: {
            casco: true,
            chaleco: true,
            borceguies: true,
            ropaSeguridad: false,
          },
        },
        observaciones: 'Carga rápida con autoelevador',
        transportistaAsignado: null,
        createdAt: serverTimestamp(),
      });

      alert('Ofertas de ejemplo cargadas en el tablero.');
    } catch (e) {
      console.error(e);
      alert('Error al cargar ejemplos.');
    } finally {
      setCreandoDemo(false);
    }
  };

  const abrirModalToma = (oferta: OfertaViaje) => {
    setOfertaSeleccionada(oferta);
    setTarifaCotizada(oferta.tarifaReferencia || 0);
  };

  const confirmarTomaViaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofertaSeleccionada || !nombreChofer || !patenteTractor) return;

    setProcesandoToma(true);
    try {
      const nuevoEstado: EstadoSemaforo =
        ofertaSeleccionada.estadoSemaforo === 'verde' ? 'azul' : 'amarillo';

      await updateDoc(doc(db, 'ofertas_viajes', ofertaSeleccionada.id), {
        estadoSemaforo: nuevoEstado,
        transportistaAsignado: {
          nombreChofer: nombreChofer.trim(),
          patenteTractor: patenteTractor.trim().toUpperCase(),
          patenteSemi: patenteSemi.trim().toUpperCase() || '-',
          telefono: telefonoChofer.trim() || 'Sin registrar',
          tarifaCotizada: Number(tarifaCotizada) || 0,
        },
      });

      alert(
        nuevoEstado === 'azul'
          ? '¡Viaje asignado directamente (Estado AZUL)! Ya podés iniciar la ruta.'
          : 'Viaje tomado fuera de término. Pasó a estado AMARILLO (a confirmar por el dador de carga).'
      );
      setOfertaSeleccionada(null);
      setNombreChofer('');
      setPatenteTractor('');
      setPatenteSemi('');
      setTelefonoChofer('');
    } catch (err) {
      console.error(err);
      alert('Error al procesar la toma del viaje.');
    } finally {
      setProcesandoToma(false);
    }
  };

    const aprobarViajeAmarillo = async (id: string) => {
    try {
      await updateDoc(doc(db, 'ofertas_viajes', id), {
        estadoSemaforo: 'azul',
      });
      alert('Asignación confirmada. El viaje pasó a estado AZUL.');
    } catch (e) {
      console.error(e);
    }
  };

    const enviarASeguimientoV1 = async (oferta: OfertaViaje) => {
    try {
      const destinosStr = oferta.repartos
        .map((r) => `${r.cliente} (${r.localidad})`)
        .join(' → ');

      const tarifaUnitaria =
        oferta.transportistaAsignado?.tarifaCotizada || oferta.tarifaReferencia || 0;

      const tarifaCalculada =
        oferta.tipoLiquidacion === 'KM'
          ? (oferta.kmLiquidar || oferta.kmReales || 0) * tarifaUnitaria
          : oferta.tipoLiquidacion === 'TN'
          ? (oferta.toneladasTotales || 0) * tarifaUnitaria
          : tarifaUnitaria;

      const nombreChofer = oferta.transportistaAsignado?.nombreChofer || 'Sin chofer';
      const patenteTractor = (oferta.transportistaAsignado?.patenteTractor || '').toUpperCase().trim();
      const patenteSemi = (oferta.transportistaAsignado?.patenteSemi || '').toUpperCase().trim();
      const telefonoChofer = oferta.transportistaAsignado?.telefonoChofer || '';

      // 1. Registrar al chofer en "camioneros" si aún no existe con esa patente
      if (patenteTractor) {
        const qCam = query(
          collection(db, 'camioneros'),
          where('patenteTractor', '==', patenteTractor)
        );
        const snapCam = await getDocs(qCam);
        if (snapCam.empty) {
          await addDoc(collection(db, 'camioneros'), {
            nombre: nombreChofer,
            patenteTractor,
            patenteSemi,
            telefono: telefonoChofer,
            tipoCamion: oferta.tipoVehiculo,
            activo: true,
            createdAt: serverTimestamp(),
          });
        }
      }

      // 2. Crear viaje en colección "viajes" con el esquema exacto de AdminDashboard y PortalChofer
      const tokenViaje = Math.random().toString(36).substring(2, 8).toUpperCase();

      await addDoc(collection(db, 'viajes'), {
        token: tokenViaje,
        origen: oferta.origenLocalidad,
        destino: destinosStr || 'Destino asignado',
        distanciaKm: oferta.kmLiquidar || oferta.kmReales || 0,
        tipoCamion: oferta.tipoVehiculo,
        tipoVehiculo: oferta.tipoVehiculo,
        tarifaKm: tarifaUnitaria,
        tarifa: tarifaCalculada,
        comision: Math.round(tarifaCalculada * 0.1),
        peso: `${oferta.toneladasTotales} tn`,
        tipoCarga: `Guía #${oferta.guia} (${oferta.repartos.length} repartos)`,
        chofer: {
          nombre: nombreChofer,
          patenteTractor,
          patenteSemi,
          telefono: telefonoChofer,
        },
        estado: 'en_curso',
        etapaRuta: 'llegada_origen',
        guiaB2B: oferta.guia,
        createdAt: serverTimestamp(),
      });

      alert(`Guía #${oferta.guia} enviada a "Mis viajes / GPS V1". Tarifa: ${tarifaCalculada.toLocaleString('es-AR')} • Chofer: ${nombreChofer} (${patenteTractor}).`);
    } catch (e) {
      console.error(e);
      alert('Error al sincronizar con Despacho V1.');
    }
  };

  const renderSemaforo = (estado: EstadoSemaforo) => {
    const estilos: Record<EstadoSemaforo, { bg: string; ring: string; label: string }> = {
      verde: {
        bg: 'bg-emerald-500',
        ring: 'ring-emerald-200',
        label: 'Verde: Dentro del límite (Toma directa a Azul)',
      },
      rojo: {
        bg: 'bg-red-600',
        ring: 'ring-red-200',
        label: 'Rojo: Superó límite de ofrecimiento (Al aceptar pasa a Amarillo)',
      },
      amarillo: {
        bg: 'bg-amber-400',
        ring: 'ring-amber-200',
        label: 'Amarillo: Aceptado fuera de término (A confirmar)',
      },
      azul: {
        bg: 'bg-blue-600',
        ring: 'ring-blue-200',
        label: 'Azul: Ya fue asignado',
      },
    };

    const item = estilos[estado] || estilos.verde;

    return (
      <div className="flex items-center justify-center" title={item.label}>
        <span
          className={`w-4 h-4 rounded-full ${item.bg} ring-4 ${item.ring} inline-block shadow-xs`}
        />
      </div>
    );
  };

  const ofertasFiltradas = ofertas.filter((o) => {
    if (soloDisponibles && (o.estadoSemaforo === 'azul' || o.estadoSemaforo === 'amarillo')) {
      return false;
    }
    if (zonaFiltro !== 'TODAS') {
      const textoViaje = `${o.origenLocalidad} ${o.repartos.map((r) => r.localidad).join(' ')}`.toLowerCase();
      const palabraClave = zonaFiltro.split(' ')[0].toLowerCase();
      if (!textoViaje.includes(palabraClave)) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-[#F1F5F9] text-slate-800 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Barra Superior con Selector de Rol + Acciones */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-sky-700 tracking-tight">
                FleteYa B2B • Tablero Inicial
              </h1>
              <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full">
                {rolActivo === 'fletero' ? 'Modo Dador de Carga' : 'Modo Transportista'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bolsa de cargas multiparada, semáforo de ofertas y legajo documental de flota
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Conmutador rápido de Rol para probar ambas vistas */}
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setRolActivo('transportista')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  rolActivo === 'transportista'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Soy Transportista
              </button>
              <button
                type="button"
                onClick={() => setRolActivo('fletero')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  rolActivo === 'fletero'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Soy Fletero (Empresa)
              </button>
            </div>

            {/* Botón Legajo Técnico de 5 Pestañas */}
            <button
              onClick={() => setModalVehiculoAbierto(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <Truck className="w-4 h-4" />
              Legajo de Vehículo (5 Pestañas)
            </button>

            {/* Botón Publicar Flete */}
            <button
              onClick={() => setModalPublicarAbierto(true)}
              className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              + Publicar Nuevo Flete
            </button>

            {ofertas.length === 0 && (
              <button
                onClick={cargarDatosDePrueba}
                disabled={creandoDemo}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                {creandoDemo ? 'Cargando...' : 'Cargar Demo'}
              </button>
            )}

            
          </div>
        </div>

        {/* Filtros por zona preferida */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-700">Zonas preferidas:</span>
            <select
              value={zonaFiltro}
              onChange={(e) => setZonaFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-sky-500"
            >
              <option value="TODAS">Todas las zonas del país</option>
              {ZONAS_ARGENTINA.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Mostrar solo viajes sin asignar (Verde / Rojo)
          </label>
        </div>

        {/* Grilla Estilo Sidersa */}
        <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#0284C7] text-white px-4 py-2.5 flex items-center justify-between">
            <span className="font-bold text-sm tracking-wide">Viajes ofrecidos</span>
            <button
              onClick={() => setOfertas([...ofertas])}
              className="bg-white hover:bg-slate-100 text-slate-700 px-3 py-1 rounded border border-slate-300 shadow-2xs transition flex items-center gap-1 text-xs font-bold"
              title="Actualizar tablero"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-8 h-5 bg-[#BAE6FD] border border-sky-300 inline-block rounded-xs" />
              <span className="font-semibold text-slate-700">Ofrecimiento simultáneo</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <strong>Verde:</strong> En término (toma directa)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                <strong>Rojo:</strong> Fuera de límite (pasa a Amarillo)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <strong>Amarillo:</strong> A confirmar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                <strong>Azul:</strong> Asignado
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-800 font-bold bg-white">
                  <th className="py-3 px-3">Guía</th>
                  <th className="py-3 px-2.5">F.Ofrec.</th>
                  <th className="py-3 px-2.5">Hora Ofrec.</th>
                  <th className="py-3 px-2.5">F.Pedido</th>
                  <th className="py-3 px-2.5">Hora Pedido</th>
                  <th className="py-3 px-2.5 text-center">Est.</th>
                  <th className="py-3 px-3">Tipo de Camión</th>
                  <th className="py-3 px-2 text-center">Rep.</th>
                  <th className="py-3 px-2.5 text-right">TN</th>
                  <th className="py-3 px-2.5 text-center">T.Liq.</th>
                  <th className="py-3 px-2.5 text-right">Km. Reales</th>
                  <th className="py-3 px-2.5 text-right">Km. Liq.</th>
                  <th className="py-3 px-3">Observaciones</th>
                  <th className="py-3 px-2 text-center">Cunas</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td colSpan={15} className="py-10 text-center text-slate-400">
                      Cargando viajes ofrecidos...
                    </td>
                  </tr>
                ) : ofertasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-10 text-center text-slate-500">
                      No hay ofertas de viaje activas para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  ofertasFiltradas.map((oferta) => {
                    const expandida = filaExpandida === oferta.id;
                    const fondoFila = oferta.ofrecimientoSimultaneo
                      ? 'bg-[#E0F2FE]/60 hover:bg-[#BAE6FD]/50'
                      : 'bg-white hover:bg-slate-50';

                    return (
                      <Fragment key={oferta.id}>
                        <tr
                          className={`${fondoFila} transition cursor-pointer`}
                          onClick={() => setFilaExpandida(expandida ? null : oferta.id)}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            {expandida ? (
                              <ChevronDown className="w-4 h-4 text-sky-700 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-sky-700 shrink-0" />
                            )}
                            <span>{oferta.guia}</span>
                          </td>
                          <td className="py-3 px-2.5 text-slate-700">{oferta.fechaOfrecimiento}</td>
                          <td className="py-3 px-2.5 text-slate-700">{oferta.horaOfrecimiento}</td>
                          <td className="py-3 px-2.5 text-slate-700">{oferta.fechaPedido}</td>
                          <td className="py-3 px-2.5 text-slate-700">{oferta.horaPedido}</td>
                          <td className="py-3 px-2.5 text-center">{renderSemaforo(oferta.estadoSemaforo)}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 uppercase">{oferta.tipoVehiculo}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">{oferta.repartos.length}</td>
                          <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900">
                            {Number(oferta.toneladasTotales).toFixed(3)}
                          </td>
                          <td className="py-3 px-2.5 text-center font-bold text-slate-700">{oferta.tipoLiquidacion}</td>
                          <td className="py-3 px-2.5 text-right font-mono text-slate-700">{oferta.kmReales}</td>
                          <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900">{oferta.kmLiquidar}</td>
                          <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate" title={oferta.observaciones}>
                            {oferta.observaciones || '-'}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">
                            {oferta.seguridad?.cunas ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {(oferta.estadoSemaforo === 'verde' || oferta.estadoSemaforo === 'rojo') && (
                              rolActivo === 'transportista' ? (
                                <button
                                  onClick={() => abrirModalToma(oferta)}
                                  className={`px-3 py-1.5 rounded font-bold text-[11px] text-white shadow-2xs transition ${
                                    oferta.estadoSemaforo === 'verde'
                                      ? 'bg-emerald-600 hover:bg-emerald-700'
                                      : 'bg-red-600 hover:bg-red-700'
                                  }`}
                                >
                                  {oferta.estadoSemaforo === 'verde' ? 'Tomar / Cotizar' : 'Aceptar c/ demora'}
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Esperando postulación...
                                </span>
                              )
                            )}

                            {oferta.estadoSemaforo === 'amarillo' && (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                                  A confirmar ({oferta.transportistaAsignado?.patenteTractor})
                                </span>
                                {rolActivo === 'fletero' && (
                                  <button
                                    onClick={() => aprobarViajeAmarillo(oferta.id)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition"
                                  >
                                    Aprobar Asignación (→ Azul)
                                  </button>
                                )}
                              </div>
                            )}

                                                        {oferta.estadoSemaforo === 'azul' && (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded inline-block">
                                  Asignado ({oferta.transportistaAsignado?.patenteTractor})
                                </span>
                                <button
                                  onClick={() => enviarASeguimientoV1(oferta)}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition"
                                >
                                  Enviar a GPS / Ruta V1 →
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {expandida && (
                          <tr className="bg-slate-50 border-b-2 border-sky-200">
                            <td colSpan={15} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                                  <h4 className="text-[11px] font-extrabold uppercase text-sky-800 border-b pb-1">
                                    Datos de Contrato y Carga
                                  </h4>
                                  <div className="text-xs space-y-1">
                                    <p>
                                      <span className="text-slate-500">Dador / Fletero:</span>{' '}
                                      <strong>{oferta.fleteroNombre}</strong>
                                    </p>
                                    <p>
                                      <span className="text-slate-500">Contrato:</span>{' '}
                                      <strong>{oferta.tipoContrato || 'Estándar'}</strong>
                                    </p>
                                    {oferta.cupoTotal !== undefined && (
                                      <p>
                                        <span className="text-slate-500">Cupo planta:</span>{' '}
                                        <span className="font-bold text-emerald-700">
                                          {oferta.cupoPendiente} pendientes
                                        </span>{' '}
                                        / {oferta.cupoTotal} totales
                                      </p>
                                    )}
                                    <p className="flex items-center gap-1 pt-1">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="font-semibold">{oferta.contactoFlete}</span>
                                    </p>
                                  </div>
                                  <div className="pt-1">
                                    <a
                                      href={oferta.linkGoogleMaps}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition"
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                      Ver Ubicación de Carga en Google Maps ({oferta.origenLocalidad})
                                    </a>
                                  </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                                  <h4 className="text-[11px] font-extrabold uppercase text-sky-800 border-b pb-1">
                                    Orden de Entregas / Repartos ({oferta.repartos.length})
                                  </h4>
                                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                                    {oferta.repartos.map((rep) => (
                                      <div key={rep.orden} className="py-1.5 flex items-start justify-between gap-2 text-xs">
                                        <div>
                                          <p className="font-bold text-slate-900">
                                            #{rep.orden} • {rep.cliente}
                                          </p>
                                          <p className="text-[11px] text-slate-500">
                                            {rep.direccion} ({rep.localidad})
                                          </p>
                                          <p className="text-[11px] text-sky-700 font-medium">{rep.producto}</p>
                                        </div>
                                        <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800 shrink-0">
                                          {Number(rep.toneladas).toFixed(3)} TN
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                                  <h4 className="text-[11px] font-extrabold uppercase text-amber-700 border-b pb-1 flex items-center gap-1">
                                    <ShieldCheck className="w-4 h-4" />
                                    Seguridad de Carga y EPP Obligatorios
                                  </h4>

                                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                      <span className="text-[10px] text-slate-500 block font-bold">CADENAS</span>
                                      <span className="text-sm font-black text-slate-900">
                                        {oferta.seguridad?.cadenas || 0} mín.
                                      </span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                      <span className="text-[10px] text-slate-500 block font-bold">FAJAS</span>
                                      <span className="text-sm font-black text-slate-900">
                                        {oferta.seguridad?.fajas || 0} mín.
                                      </span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                      <span className="text-[10px] text-slate-500 block font-bold">CUNAS</span>
                                      <span className="text-sm font-black text-slate-900">
                                        {oferta.seguridad?.cunas || 0}
                                      </span>
                                    </div>
                                  </div>

                                  {oferta.seguridad?.otrosSujecion && (
                                    <p className="text-[11px] text-slate-600 bg-amber-50/70 px-2 py-1 rounded border border-amber-200">
                                      <strong>Sujeción extra:</strong> {oferta.seguridad.otrosSujecion}
                                    </p>
                                  )}

                                  <div className="pt-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                      <HardHat className="w-3.5 h-3.5 text-amber-600" />
                                      EPP Exigidos en Planta:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                      {oferta.seguridad?.epp?.casco && (
                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                                          ✓ Casco
                                        </span>
                                      )}
                                      {oferta.seguridad?.epp?.chaleco && (
                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                                          ✓ Chaleco reflectivo
                                        </span>
                                      )}
                                      {oferta.seguridad?.epp?.borceguies && (
                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                                          ✓ Borceguíes
                                        </span>
                                      )}
                                      {oferta.seguridad?.epp?.ropaSeguridad && (
                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                                          ✓ Ropa de seguridad
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Tomar / Cotizar el Viaje */}
      {ofertaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={confirmarTomaViaje}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Postular / Tomar Guía #{ofertaSeleccionada.guia}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {ofertaSeleccionada.tipoVehiculo} • {ofertaSeleccionada.toneladasTotales} TN ({ofertaSeleccionada.repartos.length} repartos)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfertaSeleccionada(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ofertaSeleccionada.estadoSemaforo === 'rojo' && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Este viaje superó el tiempo límite (<strong>Estado Rojo</strong>). Al aceptarlo pasará a{' '}
                  <strong>Estado Amarillo</strong> y quedará sujeto a confirmación del dador de carga.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Nombre y Apellido del Chofer
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Máximo Villalba"
                  value={nombreChofer}
                  onChange={(e) => setNombreChofer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Dominio Tractor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: QA123QA"
                    value={patenteTractor}
                    onChange={(e) => setPatenteTractor(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Dominio Semi / Acoplado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: AG456BC"
                    value={patenteSemi}
                    onChange={(e) => setPatenteSemi(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Teléfono Chofer
                  </label>
                  <input
                    type="text"
                    placeholder="+54 9 341..."
                    value={telefonoChofer}
                    onChange={(e) => setTelefonoChofer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Cotización ({ofertaSeleccionada.tipoLiquidacion === 'KM' ? '$/Km' : ofertaSeleccionada.tipoLiquidacion === 'TN' ? '$/TN' : 'Total $'})
                  </label>
                  <input
                    type="number"
                    required
                    value={tarifaCotizada || ''}
                    onChange={(e) => setTarifaCotizada(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none focus:border-sky-600"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setOfertaSeleccionada(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoToma}
                className={`w-1/2 py-2.5 text-white font-extrabold rounded-xl text-xs transition disabled:opacity-50 ${
                  ofertaSeleccionada.estadoSemaforo === 'verde'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {procesandoToma
                  ? 'Procesando...'
                  : ofertaSeleccionada.estadoSemaforo === 'verde'
                  ? 'Confirmar Toma (→ Azul)'
                  : 'Enviar a Confirmar (→ Amarillo)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalPublicarAbierto && (
        <PublicarOfertaModal onClose={() => setModalPublicarAbierto(false)} />
      )}

      {modalVehiculoAbierto && (
        <FichaVehiculoModal onClose={() => setModalVehiculoAbierto(false)} />
      )}
    </main>
  );
}