'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, updateDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import {
  Truck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Navigation,
  MapPin,
  Clock,
  History,
  FileCheck,
  X,
  LogOut,
  AlertTriangle,
  Wrench,
  TrafficCone,
  Timer,
  Check,
  MessageCircle,
  CheckCircle,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  Radio,
  BellRing,
  Volume2
} from 'lucide-react';

interface ChoferData {
  nombre: string;
  patenteTractor: string;
}

interface ViajeChofer {
  id: string;
  token: string;
  origen: string;
  destino: string;
  tipoCamion: string;
  tipoCarga: string;
  tarifa: number;
  estado: 'pendiente' | 'en_curso' | 'entregado';
  etapaRuta?: 'llegada_origen' | 'en_transito' | 'llegada_destino' | null;
  remitoBase64?: string | null;
  chofer?: ChoferData | null;
  ubicacionActual?: {
    lat: number;
    lng: number;
    hora: string;
  } | null;
  createdAt?: any;
  alertaRuta?: {
    mensaje: string;
    hora: string;
  } | null;
}

const OPCIONES_INCIDENCIA = [
  { tipo: 'demora_carga', label: 'Demora en carga / espera', icon: Timer },
  { tipo: 'falla_mecanica', label: 'Avería / pinchadura', icon: Wrench },
  { tipo: 'corte_ruta', label: 'Corte / congestión pesada', icon: TrafficCone },
];

const ETAPAS = [
  { id: 'llegada_origen', label: 'En Carga' },
  { id: 'en_transito', label: 'En Tránsito' },
  { id: 'llegada_destino', label: 'En Descarga' },
] as const;

const WHATSAPP_DESPACHO = '5493410000000';

let audioCtxGlobal: AudioContext | null = null;

const obtenerAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtxGlobal) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) audioCtxGlobal = new AudioCtx();
  }
  if (audioCtxGlobal && audioCtxGlobal.state === 'suspended') {
    audioCtxGlobal.resume();
  }
  return audioCtxGlobal;
};

const sonarAlertaNuevoViaje = (textoVoz?: string) => {
  try {
    const ctx = obtenerAudioContext();
    if (ctx) {
      const ahora = ctx.currentTime;

      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ahora); // D5
      gain1.gain.setValueAtTime(0.4, ahora);
      gain1.gain.exponentialRampToValueAtTime(0.001, ahora + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ahora);
      osc1.stop(ahora + 0.25);

      // Beep 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ahora + 0.2); // A5
      gain2.gain.setValueAtTime(0.45, ahora + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, ahora + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ahora + 0.2);
      osc2.stop(ahora + 0.5);

      // Beep 3 potente
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1174.66, ahora + 0.45); // D6
      gain3.gain.setValueAtTime(0.5, ahora + 0.45);
      gain3.gain.exponentialRampToValueAtTime(0.001, ahora + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(ahora + 0.45);
      osc3.stop(ahora + 0.9);
    }

    // Vibración
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }

    // Locución hablada por sintetizador nativo
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(textoVoz || 'Atención, nuevo viaje asignado en FleteYa');
      msg.lang = 'es-AR';
      msg.rate = 1.05;
      window.speechSynthesis.speak(msg);
    }
  } catch (e) {
    console.error('Error al emitir sonido:', e);
  }
};

export default function PortalChofer() {
  const router = useRouter();
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [patente, setPatente] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [patenteActiva, setPatenteActiva] = useState<string | null>(null);

  const [nombreChofer, setNombreChofer] = useState('');
  const [viajeActivo, setViajeActivo] = useState<ViajeChofer | null>(null);
  const [historialViajes, setHistorialViajes] = useState<ViajeChofer[]>([]);

  const [remitoModal, setRemitoModal] = useState<string | null>(null);
  const [subiendoRemito, setSubiendoRemito] = useState(false);
  const [modalAlerta, setModalAlerta] = useState(false);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [remitoPendienteOffline, setRemitoPendienteOffline] = useState<string | null>(null);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState<NotificationPermission>('default');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchGpsIdRef = useRef<number | null>(null);
  const ultimaTransmisionGpsRef = useRef<number>(0);
  const idViajeConocidoRef = useRef<string | null>(null);
  const primerCargaCompletadaRef = useRef(false);

  // Desbloquear audio al hacer cualquier interacción en la pantalla
  const desbloquearAudio = () => {
    obtenerAudioContext();
    setAudioHabilitado(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermisoNotif(Notification.permission);
    }
  }, []);

  // Guard Chofer
  useEffect(() => {
    const saved = localStorage.getItem('fleteya_patente_chofer');
    if (!saved) {
      router.replace('/login');
    } else {
      setPatente(saved);
      setPatenteActiva(saved);
      setVerificandoAuth(false);
    }
  }, [router]);

  // Transmisor GPS en vivo mientras haya viaje en curso
  useEffect(() => {
    if (!viajeActivo || viajeActivo.estado !== 'en_curso') {
      if (watchGpsIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchGpsIdRef.current);
        watchGpsIdRef.current = null;
      }
      setGpsActivo(false);
      return;
    }

    if (!('geolocation' in navigator)) return;

    const handlePosicion = async (pos: GeolocationPosition) => {
      setGpsActivo(true);
      const ahora = Date.now();
      if (ahora - ultimaTransmisionGpsRef.current < 25000) return;
      ultimaTransmisionGpsRef.current = ahora;

      const horaStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      try {
        await updateDoc(doc(db, 'viajes', viajeActivo.id), {
          ubicacionActual: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            hora: horaStr,
          },
        });
      } catch (e) {
        console.error('Error al actualizar GPS:', e);
      }
    };

    const handleGpsError = () => {
      setGpsActivo(false);
    };

    watchGpsIdRef.current = navigator.geolocation.watchPosition(handlePosicion, handleGpsError, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000,
    });

    return () => {
      if (watchGpsIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchGpsIdRef.current);
        watchGpsIdRef.current = null;
      }
      setGpsActivo(false);
    };
  }, [viajeActivo?.id, viajeActivo?.estado]);

  useEffect(() => {
    const offlineRemito = localStorage.getItem('fleteya_remito_offline');
    if (offlineRemito) {
      setRemitoPendienteOffline(offlineRemito);
    }

    const handleReconexion = () => {
      sincronizarRemitoOffline();
    };

    window.addEventListener('online', handleReconexion);
    return () => window.removeEventListener('online', handleReconexion);
  }, [viajeActivo]);

  // Listener reactivo de viajes asignados
  useEffect(() => {
    if (!patenteActiva) return;

    setCargando(true);
    setErrorMsg('');

    const q = query(collection(db, 'viajes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const patBuscada = patenteActiva.replace(/\s+/g, '').toUpperCase();
        const viajesDelChofer: ViajeChofer[] = [];

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const pChofer = data.chofer?.patenteTractor?.toUpperCase().replace(/\s+/g, '');

          if (pChofer && pChofer === patBuscada) {
            viajesDelChofer.push({
              id: d.id,
              ...(data as Omit<ViajeChofer, 'id'>),
            });
          }
        });

        if (viajesDelChofer.length === 0) {
          setErrorMsg(`No encontramos ningún viaje registrado para la patente ${patenteActiva}.`);
          setViajeActivo(null);
          setHistorialViajes([]);
          setCargando(false);
          return;
        }

        const choferEncontrado = viajesDelChofer[0].chofer?.nombre || 'Chofer';
        setNombreChofer(choferEncontrado);

        const activo = viajesDelChofer.find((v) => v.estado === 'en_curso') || null;
        const entregados = viajesDelChofer.filter((v) => v.estado === 'entregado');

        // Detección de flete recién asignado
        if (activo) {
          if (primerCargaCompletadaRef.current && activo.id !== idViajeConocidoRef.current) {
            sonarAlertaNuevoViaje(`Nuevo viaje asignado hacia ${activo.destino}`);

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 ¡Nuevo flete asignado!', {
                body: `${activo.origen} → ${activo.destino}\nTarifa: $${Number(activo.tarifa).toLocaleString('es-AR')}`,
                icon: '/favicon.ico',
              });
            }
          }
          idViajeConocidoRef.current = activo.id;
        } else {
          idViajeConocidoRef.current = null;
        }

        primerCargaCompletadaRef.current = true;
        setViajeActivo(activo);
        setHistorialViajes(entregados);
        setErrorMsg('');
        setCargando(false);
      },
      (err) => {
        console.error(err);
        setErrorMsg('Error al conectar con la base de datos.');
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [patenteActiva]);

  const probarAlertaSonora = async () => {
    desbloquearAudio();
    if ('Notification' in window && Notification.permission !== 'granted') {
      const res = await Notification.requestPermission();
      setPermisoNotif(res);
    }
    sonarAlertaNuevoViaje('Sonido de prueba funcionando correctamente');
  };

  const handleCerrarSesion = () => {
    if (watchGpsIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchGpsIdRef.current);
    }
    localStorage.removeItem('fleteya_patente_chofer');
    localStorage.removeItem('fleteya_rol_activo');
    router.push('/login');
  };

  const handleActualizarEtapa = async (etapa: 'llegada_origen' | 'en_transito' | 'llegada_destino') => {
    if (!viajeActivo) return;
    try {
      await updateDoc(doc(db, 'viajes', viajeActivo.id), {
        etapaRuta: etapa,
      });
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar etapa.');
    }
  };

  const handleReportarAlerta = async (mensaje: string | null) => {
    if (!viajeActivo) return;
    setEnviandoAlerta(true);

    try {
      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      await updateDoc(doc(db, 'viajes', viajeActivo.id), {
        alertaRuta: mensaje
          ? {
              mensaje,
              hora: horaStr,
            }
          : null,
      });
      setModalAlerta(false);
    } catch (err) {
      console.error(err);
      alert('Error al enviar contingencia.');
    } finally {
      setEnviandoAlerta(false);
    }
  };

  const sincronizarRemitoOffline = async () => {
    const offlineData = localStorage.getItem('fleteya_remito_offline');
    const viajeId = localStorage.getItem('fleteya_viaje_id_offline') || viajeActivo?.id;

    if (!offlineData || !viajeId) return;

    try {
      setSubiendoRemito(true);
      await updateDoc(doc(db, 'viajes', viajeId), {
        remitoBase64: offlineData,
        estado: 'entregado',
        alertaRuta: null,
      });

      localStorage.removeItem('fleteya_remito_offline');
      localStorage.removeItem('fleteya_viaje_id_offline');
      setRemitoPendienteOffline(null);
      alert('¡Remito offline sincronizado correctamente con la central!');
    } catch (err) {
      console.error(err);
    } finally {
      setSubiendoRemito(false);
    }
  };

  const handleSubirRemito = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viajeActivo) return;

    setSubiendoRemito(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 900;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64Data = canvas.toDataURL('image/jpeg', 0.6);

          if (!navigator.onLine) {
            localStorage.setItem('fleteya_remito_offline', base64Data);
            localStorage.setItem('fleteya_viaje_id_offline', viajeActivo.id);
            setRemitoPendienteOffline(base64Data);
            alert('Sin señal 4G. Guardado offline en el teléfono.');
            setSubiendoRemito(false);
            return;
          }

          await updateDoc(doc(db, 'viajes', viajeActivo.id), {
            remitoBase64: base64Data,
            estado: 'entregado',
            alertaRuta: null,
          });
        } catch (err) {
          console.error(err);
          if (viajeActivo) {
            localStorage.setItem('fleteya_remito_offline', img.src);
            localStorage.setItem('fleteya_viaje_id_offline', viajeActivo.id);
            setRemitoPendienteOffline(img.src);
          }
          alert('Remito respaldado en tu teléfono para reintento automático.');
        } finally {
          setSubiendoRemito(false);
        }
      };
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const armarLinkWhatsApp = () => {
    if (!viajeActivo) return '#';
    const etapaActual =
      viajeActivo.etapaRuta === 'llegada_origen'
        ? 'En Carga'
        : viajeActivo.etapaRuta === 'llegada_destino'
        ? 'En Descarga'
        : 'En Tránsito';

    const novedad = viajeActivo.alertaRuta ? ` Alerta: ${viajeActivo.alertaRuta.mensaje}` : '';
    const texto = `Hola Despacho, soy ${nombreChofer} (Patente ${patenteActiva}). Consulta sobre el viaje ${viajeActivo.origen} -> ${viajeActivo.destino}. Estado: ${etapaActual}.${novedad}`;
    return `https://wa.me/${WHATSAPP_DESPACHO}?text=${encodeURIComponent(texto)}`;
  };

  const totalCobrado = historialViajes.reduce((acc, v) => acc + (Number(v.tarifa) || 0), 0);
  const etapaActualId = viajeActivo?.etapaRuta || 'en_transito';

  if (verificandoAuth) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main 
      onClick={desbloquearAudio} 
      className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 flex flex-col items-center select-none"
    >
      <div className="w-full max-w-md space-y-4">
        
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Login</span>
          </button>

          <button
            onClick={handleCerrarSesion}
            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-xl transition"
          >
            Salir
          </button>
        </div>

        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-xs mb-1">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">FleteYa • Portal Chofer</h1>
          <p className="text-xs text-slate-500">Conectado en tiempo real</p>
        </div>

        {/* Barra de estado: GPS y prueba de sonido */}
        <div className="space-y-2">
          {viajeActivo && (
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {gpsActivo && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${gpsActivo ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <span className="font-bold text-slate-700">
                  {gpsActivo ? 'GPS en ruta activo' : 'Esperando señal satelital...'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Transmitiendo a central</span>
            </div>
          )}

          {/* Botón de activación y prueba sonora */}
          <button
            type="button"
            onClick={probarAlertaSonora}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
              audioHabilitado
                ? 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200/60'
                : 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold">
                {audioHabilitado ? 'Altavoz de cabina activado' : 'Activar sonido de nuevos viajes'}
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
              Probar sonido
            </span>
          </button>
        </div>

        {remitoPendienteOffline && (
          <div className="bg-amber-500 text-slate-950 p-3.5 rounded-2xl flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-black">Remito guardado offline</p>
                <p className="text-[10px] font-semibold text-slate-900">Listo para subir al recuperar señal</p>
              </div>
            </div>
            <button
              onClick={sincronizarRemitoOffline}
              disabled={subiendoRemito}
              className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${subiendoRemito ? 'animate-spin' : ''}`} />
              Subir ya
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Camionero activo</p>
            <p className="text-sm font-extrabold text-slate-900">{nombreChofer || 'Cargando datos...'}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Patente: {patenteActiva}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium">Total facturado</p>
              <p className="text-sm font-extrabold text-emerald-600">${totalCobrado.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-slate-400">{historialViajes.length} completado(s)</p>
            </div>

            <button
              onClick={handleCerrarSesion}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Cambiar patente"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              <button onClick={handleCerrarSesion} className="underline font-bold mt-1 block">
                Probar con otra patente
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Carga activa en viaje</h2>
            </div>

            {viajeActivo ? (
              <div className="bg-white border-2 border-blue-400/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    {etapaActualId === 'llegada_origen' ? 'En Planta de Carga' : etapaActualId === 'llegada_destino' ? 'En Punto de Descarga' : 'En Tránsito'}
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    ${Number(viajeActivo.tarifa).toLocaleString('es-AR')}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Paso actual del recorrido
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {ETAPAS.map((et) => {
                      const esActivo = etapaActualId === et.id;
                      return (
                        <button
                          key={et.id}
                          type="button"
                          onClick={() => handleActualizarEtapa(et.id)}
                          className={`py-2 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            esActivo
                              ? 'bg-white text-blue-700 shadow-2xs border border-blue-200'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {esActivo && <CheckCircle className="w-3 h-3 text-blue-600" />}
                          {et.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {viajeActivo.alertaRuta && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">{viajeActivo.alertaRuta.mensaje}</p>
                        <p className="text-[10px] text-amber-700">Avisado a despacho a las {viajeActivo.alertaRuta.hora}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleReportarAlerta(null)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg transition shrink-0"
                    >
                      Reanudar
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">ORIGEN / CARGA</span>
                        <span className="font-bold text-slate-800">{viajeActivo.origen}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viajeActivo.origen)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Abrir GPS"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">DESTINO / ENTREGA</span>
                        <span className="font-bold text-slate-800">{viajeActivo.destino}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viajeActivo.destino)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Abrir GPS"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-0.5">
                  <p className="text-slate-600">
                    <strong>Carga:</strong> {viajeActivo.tipoCarga}
                  </p>
                  <p className="text-slate-600">
                    <strong>Equipo requerido:</strong> {viajeActivo.tipoCamion}
                  </p>
                </div>

                <div className="pt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalAlerta(true)}
                      className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-amber-200 transition"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Avisar demora
                    </button>

                    <a
                      href={armarLinkWhatsApp()}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp Base
                    </a>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleSubirRemito}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoRemito}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5" />
                    {subiendoRemito ? 'Procesando remito...' : 'Sacar foto al Remito firmado'}
                  </button>
                  <p className="text-center text-[11px] text-slate-400">
                    Tomá la foto al finalizar para cerrar el viaje y cobrar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Sin viajes pendientes en este momento</p>
                <p className="text-[11px] text-slate-400">Estás libre para que administración te asigne un flete nuevo.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historial de viajes</h2>
            </div>

            {historialViajes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                Todavía no tenés viajes completados registrados.
              </div>
            ) : (
              <div className="space-y-2.5">
                {historialViajes.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {v.origen} → {v.destino}
                      </span>
                      <span className="font-extrabold text-emerald-600">
                        ${Number(v.tarifa).toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>{v.tipoCarga} • {v.tipoCamion}</span>

                      {v.remitoBase64 ? (
                        <button
                          type="button"
                          onClick={() => setRemitoModal(v.remitoBase64 || null)}
                          className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Ver remito
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Sin remito adjunto</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAlerta && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 relative space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Reportar contingencia</h3>
              </div>
              <button
                onClick={() => setModalAlerta(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Seleccioná el estado actual para que administración lo vea en el panel central:
            </p>

            <div className="space-y-2">
              {OPCIONES_INCIDENCIA.map((opc) => {
                const IconComponent = opc.icon;
                return (
                  <button
                    key={opc.tipo}
                    disabled={enviandoAlerta}
                    onClick={() => handleReportarAlerta(opc.label)}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 flex items-center gap-3 text-left transition disabled:opacity-50"
                  >
                    <div className="p-2 rounded-lg bg-white shadow-2xs border border-slate-200 text-slate-700">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{opc.label}</span>
                  </button>
                );
              })}
            </div>

            {viajeActivo?.alertaRuta && (
              <button
                onClick={() => handleReportarAlerta(null)}
                disabled={enviandoAlerta}
                className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Todo solucionado (Reanudar marcha normal)
              </button>
            )}
          </div>
        </div>
      )}

      {remitoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 relative space-y-3">
            <button
              onClick={() => setRemitoModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-900">Constancia de remito firmado</h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-96">
              <img src={remitoModal} alt="Remito firmado" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}