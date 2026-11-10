'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
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
  ArrowLeft,
  Printer,
  Navigation,
  Radio,
  UserCheck,
  BarChart3,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Route,
  Award
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
  tarifaKm?: number;
  estado: 'pendiente' | 'en_curso' | 'entregado';
  etapaRuta?: 'llegada_origen' | 'en_transito' | 'llegada_destino' | null;
  chofer?: {
    nombre: string;
    patenteTractor: string;
    telefono?: string;
  } | null;
  ubicacionActual?: {
    lat: number;
    lng: number;
    hora: string;
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
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [tab, setTab] = useState<'cotizar' | 'viajes' | 'choferes' | 'metricas'>('cotizar');

  const [origen, setOrigen] = useState('Rosario, Santa Fe');
  const [destino, setDestino] = useState('Buenos Aires (~300 km)');
  const [tipoCamion, setTipoCamion] = useState<'Camión' | 'Semi' | 'Batea'>('Camión');
  const [tarifaKmManual, setTarifaKmManual] = useState<number>(700);
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
  const [modalGps, setModalGps] = useState<Viaje | null>(null);

  const [viajeParaAsignar, setViajeParaAsignar] = useState<Viaje | null>(null);
  const [patenteSeleccionadaModal, setPatenteSeleccionadaModal] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const [alertaFlotante, setAlertaFlotante] = useState<{ chofer: string; patente: string; mensaje: string; hora: string } | null>(null);
  const alertasConocidasRef = useRef<Set<string>>(new Set());

  // Guard de sesión Admin
  useEffect(() => {
    const autenticado = localStorage.getItem('fleteya_admin_autenticado');
    if (!autenticado) {
      router.replace('/login');
    } else {
      setVerificandoAuth(false);
    }
  }, [router]);

  useEffect(() => {
    if (verificandoAuth) return;

    const q = query(collection(db, 'choferes'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Chofer[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Chofer, 'id'>),
      }));
      setChoferes(data);
    });
    return () => unsub();
  }, [verificandoAuth]);

  useEffect(() => {
    if (verificandoAuth) return;

    const q = query(collection(db, 'viajes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: Viaje[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Viaje, 'id'>),
      }));
      setViajes(docs);

      if (modalGps) {
        const viajeActualizado = docs.find((x) => x.id === modalGps.id);
        if (viajeActualizado) setModalGps(viajeActualizado);
      }

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
  }, [verificandoAuth, modalGps?.id]);

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
  
  const tarifaTotal = distanciaKm * (tarifaKmManual || 0);
  const comision = Math.round(tarifaTotal * 0.1);

  const seleccionarTipoCamion = (tipo: 'Camión' | 'Semi' | 'Batea') => {
    setTipoCamion(tipo);
    const sugerido = tipo === 'Camión' ? 700 : tipo === 'Semi' ? 900 : 1100;
    setTarifaKmManual(sugerido);
  };

  // Cálculos de Métricas
  const totalFacturacion = viajes.reduce((acc, v) => acc + (Number(v.tarifa) || 0), 0);
  const totalComisiones = viajes.reduce((acc, v) => acc + (Number(v.comision) || Math.round((Number(v.tarifa) || 0) * 0.1)), 0);
  const viajesCompletados = viajes.filter((v) => v.estado === 'entregado').length;
  const viajesEnCurso = viajes.filter((v) => v.estado === 'en_curso').length;
  const viajesPendientes = viajes.filter((v) => v.estado === 'pendiente').length;
  const ticketPromedio = viajes.length > 0 ? Math.round(totalFacturacion / viajes.length) : 0;

  const rutasMap = new Map<string, number>();
  viajes.forEach((v) => {
    const rutaKey = `${v.origen} → ${v.destino}`;
    rutasMap.set(rutaKey, (rutasMap.get(rutaKey) || 0) + 1);
  });
  const rankingRutas = Array.from(rutasMap.entries()).sort((a, b) => b[1] - a[1]);

  const equiposMap = { 'Camión': 0, 'Semi': 0, 'Batea': 0 };
  viajes.forEach((v) => {
    if (v.tipoCamion in equiposMap) {
      equiposMap[v.tipoCamion as keyof typeof equiposMap]++;
    }
  });

  const choferesStatsMap = new Map<string, { nombre: string; viajes: number; total: number }>();
  viajes.forEach((v) => {
    if (v.chofer?.patenteTractor) {
      const pat = v.chofer.patenteTractor.toUpperCase();
      const actual = choferesStatsMap.get(pat) || { nombre: v.chofer.nombre, viajes: 0, total: 0 };
      actual.viajes += 1;
      actual.total += Number(v.tarifa) || 0;
      choferesStatsMap.set(pat, actual);
    }
  });
  const rankingChoferes = Array.from(choferesStatsMap.entries()).sort((a, b) => b[1].viajes - a[1].viajes);

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
        tarifaKm: tarifaKmManual,
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
        ubicacionActual: null,
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

  const handleConfirmarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viajeParaAsignar || !patenteSeleccionadaModal) return;

    setGuardandoAsignacion(true);
    try {
      const choferSeleccionado = flotaTotal.find(
        (c) => c.patenteTractor.replace(/\s+/g, '').toUpperCase() === patenteSeleccionadaModal.replace(/\s+/g, '').toUpperCase()
      );

      if (!choferSeleccionado) {
        alert('Chofer no encontrado');
        return;
      }

      await updateDoc(doc(db, 'viajes', viajeParaAsignar.id), {
        chofer: {
          nombre: choferSeleccionado.nombre,
          patenteTractor: choferSeleccionado.patenteTractor,
          telefono: choferSeleccionado.telefono || '',
        },
        estado: 'en_curso',
        etapaRuta: 'en_transito',
      });

      alert(`Flete asignado exitosamente a ${choferSeleccionado.nombre} (${choferSeleccionado.patenteTractor})`);
      setViajeParaAsignar(null);
      setPatenteSeleccionadaModal('');
    } catch (err) {
      console.error(err);
      alert('Error al asignar el chofer.');
    } finally {
      setGuardandoAsignacion(false);
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

  const imprimirOrdenDeCarga = (v: Viaje) => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('Por favor habilitá las ventanas emergentes en tu navegador.');
      return;
    }

    const comisionEst = Number(v.comision) || Math.round((Number(v.tarifa) || 0) * 0.1);
    const netoChofer = Number(v.tarifa) - comisionEst;

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Carga - ${v.id.slice(0, 8).toUpperCase()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
          .title { font-size: 16px; font-weight: 700; text-transform: uppercase; color: #475569; }
          .badge-id { font-family: monospace; font-size: 13px; background: #e2e8f0; padding: 4px 8px; border-radius: 6px; }
          .section { margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .item-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
          .item-value { font-size: 14px; font-weight: 700; color: #0f172a; }
          .firmas { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .firma-box { border-top: 1px dashed #64748b; padding-top: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #475569; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">FleteYa • Logística & Despacho</div>
            <div class="title">Hoja de Ruta / Orden de Carga Oficial</div>
          </div>
          <div>
            <span class="badge-id">VIAJE #${v.id.toUpperCase()}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Itinerario y Trayecto</div>
          <div class="grid-2">
            <div>
              <div class="item-label">Origen / Lugar de Carga</div>
              <div class="item-value">${v.origen}</div>
            </div>
            <div>
              <div class="item-label">Destino / Lugar de Descarga</div>
              <div class="item-value">${v.destino}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Datos de Carga y Equipo Requerido</div>
          <div class="grid-2">
            <div>
              <div class="item-label">Tipo de Mercadería</div>
              <div class="item-value">${v.tipoCarga}</div>
            </div>
            <div>
              <div class="item-label">Peso Estimado</div>
              <div class="item-value">${v.peso || 'N/A'}</div>
            </div>
            <div>
              <div class="item-label">Tipo de Camión / Acoplado</div>
              <div class="item-value">${v.tipoCamion}</div>
            </div>
            <div>
              <div class="item-label">Fecha Programada de Retiro</div>
              <div class="item-value">${v.fechaRetiro || new Date().toLocaleDateString('es-AR')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Transportista Designado</div>
          <div class="grid-2">
            <div>
              <div class="item-label">Chofer Conductor</div>
              <div class="item-value">${v.chofer?.nombre || 'Pendiente de designación'}</div>
            </div>
            <div>
              <div class="item-label">Patente Tractor</div>
              <div class="item-value">${v.chofer?.patenteTractor || '-'}</div>
            </div>
            <div>
              <div class="item-label">Teléfono de Enlace</div>
              <div class="item-value">${v.chofer?.telefono || 'Sin registrar'}</div>
            </div>
            <div>
              <div class="item-label">Estado de Operación</div>
              <div class="item-value" style="text-transform: uppercase;">${v.estado}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. Liquidación y Cobranza</div>
          <div class="grid-2">
            <div>
              <div class="item-label">Tarifa Bruta Pactada</div>
              <div class="item-value" style="font-size: 16px;">$${Number(v.tarifa).toLocaleString('es-AR')}</div>
            </div>
            <div>
              <div class="item-label">Neto Chofer (A Liquidar con Remito)</div>
              <div class="item-value" style="font-size: 16px; color: #166534;">$${netoChofer.toLocaleString('es-AR')}</div>
            </div>
          </div>
        </div>

        <div class="firmas">
          <div class="firma-box">
            Firma y Aclaración de Despacho Central
          </div>
          <div class="firma-box">
            Firma y Conformidad del Conductor
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  const exportarReportePDF = () => {
    if (viajes.length === 0) {
      alert('No hay viajes para exportar.');
      return;
    }

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
            <div class="card-val" style="color: #0f172a;">$${totalFacturacion.toLocaleString('es-AR')}</div>
          </div>
          <div class="card">
            <div class="card-title">Comisión Neta FleteYa (10%)</div>
            <div class="card-val" style="color: #047857;">$${totalComisiones.toLocaleString('es-AR')}</div>
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
    localStorage.removeItem('fleteya_rol_activo');
    router.push('/login');
  };

  if (verificandoAuth) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800">
      {/* Banner de alerta */}
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

      {/* Header */}
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
              <button
                onClick={() => setTab('metricas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  tab === 'metricas' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Métricas
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

                {/* Peso y Tipo de carga con selección y escritura libre */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Peso estimado</label>
                    <input
                      list="opciones-peso"
                      type="text"
                      value={peso}
                      onChange={(e) => setPeso(e.target.value)}
                      placeholder="Elegir o escribir peso..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                    <datalist id="opciones-peso">
                      <option value="Hasta 5 tn" />
                      <option value="5-12 tn" />
                      <option value="12-25 tn" />
                      <option value="25-30 tn" />
                      <option value="30-45 tn (Escalar)" />
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de carga</label>
                    <input
                      list="opciones-tipo-carga"
                      type="text"
                      value={tipoCarga}
                      onChange={(e) => setTipoCarga(e.target.value)}
                      placeholder="Elegir o escribir mercadería..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                    <datalist id="opciones-tipo-carga">
                      <option value="General / pallet" />
                      <option value="Granel / cereal" />
                      <option value="Bobinas / siderurgia" />
                      <option value="Refrigerada / perecederos" />
                      <option value="Maquinaria / sobredimensionada" />
                      <option value="Líquidos / cisterna" />
                    </datalist>
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
                        onClick={() => seleccionarTipoCamion(t)}
                        className={`p-3 rounded-xl border text-center transition ${
                          tipoCamion === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <p className="text-xs font-bold">{t}</p>
                      </button>
                    ))}
                  </div>

                  {/* Campo Editable de Tarifa por Kilómetro */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Tarifa por KM ($)</label>
                      <span className="text-[10px] text-slate-400 font-semibold">Editable libremente</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                      <input
                        type="number"
                        min="1"
                        value={tarifaKmManual || ''}
                        onChange={(e) => setTarifaKmManual(Number(e.target.value) || 0)}
                        placeholder="700"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Sugerido para {tipoCamion}: ${tipoCamion === 'Camión' ? '700' : tipoCamion === 'Semi' ? '900' : '1.100'}/km
                    </p>
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
                      <th className="p-3.5 text-right">Comprobantes & Acción</th>
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
                              <button
                                onClick={() => {
                                  setViajeParaAsignar(v);
                                  setPatenteSeleccionadaModal('');
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Asignar chofer
                              </button>
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
                          <td className="p-3.5 text-right space-y-1">
                            <div className="flex items-center justify-end gap-1.5">
                              {v.estado === 'en_curso' && (
                                <button
                                  onClick={() => setModalGps(v)}
                                  className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 transition"
                                  title="Ver ubicación satelital del camión"
                                >
                                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                                  <span>GPS en vivo</span>
                                </button>
                              )}

                              <button
                                onClick={() => imprimirOrdenDeCarga(v)}
                                className="text-slate-700 hover:text-blue-700 font-bold inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition"
                                title="Imprimir / Guardar Hoja de Ruta"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Orden</span>
                              </button>
                            </div>

                            <div>
                              {v.remitoBase64 ? (
                                <button
                                  onClick={() => setRemitoModal(v.remitoBase64 || null)}
                                  className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  Ver remito
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Sin remito aún</span>
                              )}
                            </div>
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

        {/* Pestaña de Métricas y Analítica */}
        {tab === 'metricas' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Panel de Métricas & Rendimiento</h1>
              <p className="text-xs text-slate-500">Visión analítica de facturación, comisiones y volumen operativo</p>
            </div>

            {/* Fila de Tarjetas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Facturación Total</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">${totalFacturacion.toLocaleString('es-AR')}</p>
                <p className="text-[10px] text-slate-400 font-medium">Volumen bruto pactado</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Comisión Neta (10%)</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600">${totalComisiones.toLocaleString('es-AR')}</p>
                <p className="text-[10px] text-emerald-700 font-medium">Ganancia neta FleteYa</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Viajes Concluidos</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">{viajesCompletados} <span className="text-sm font-semibold text-slate-400">/ {viajes.length}</span></p>
                <p className="text-[10px] text-slate-400 font-medium">{viajesEnCurso} en curso • {viajesPendientes} pendientes</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Promedio</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">${ticketPromedio.toLocaleString('es-AR')}</p>
                <p className="text-[10px] text-slate-400 font-medium">Por servicio de flete</p>
              </div>
            </div>

            {/* Grilla 2: Rutas y Demanda */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Rutas y Corredores más Frecuentes</h3>
                </div>

                {rankingRutas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Sin viajes registrados aún.</p>
                ) : (
                  <div className="space-y-3">
                    {rankingRutas.slice(0, 5).map(([ruta, cantidad]) => {
                      const porcentaje = Math.round((cantidad / viajes.length) * 100);
                      return (
                        <div key={ruta} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{ruta}</span>
                            <span>{cantidad} viaje(s) ({porcentaje}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Demanda por Tipo de Equipo</h3>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {(['Camión', 'Semi', 'Batea'] as const).map((tipo) => {
                    const cant = equiposMap[tipo] || 0;
                    const pct = viajes.length > 0 ? Math.round((cant / viajes.length) * 100) : 0;
                    return (
                      <div key={tipo} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">{tipo}</span>
                        <p className="text-xl font-extrabold text-slate-900">{cant}</p>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                          {pct}% del total
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex pt-0.5">
                  <div 
                    title="Camión" 
                    className="h-full bg-blue-500" 
                    style={{ width: `${viajes.length > 0 ? (equiposMap['Camión'] / viajes.length) * 100 : 0}%` }} 
                  />
                  <div 
                    title="Semi" 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${viajes.length > 0 ? (equiposMap['Semi'] / viajes.length) * 100 : 0}%` }} 
                  />
                  <div 
                    title="Batea" 
                    className="h-full bg-amber-500" 
                    style={{ width: `${viajes.length > 0 ? (equiposMap['Batea'] / viajes.length) * 100 : 0}%` }} 
                  />
                </div>
                <div className="flex justify-center gap-4 text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Camión</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Semi</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Batea</span>
                </div>
              </div>
            </div>

            {/* Ranking Choferes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">Rendimiento Operativo por Chofer</h3>
              </div>

              {rankingChoferes.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No hay actividad de choferes asignada todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Chofer Conductor</th>
                        <th className="p-3">Patente Tractor</th>
                        <th className="p-3 text-center">Viajes Asignados</th>
                        <th className="p-3 text-right">Volumen Bruto Gestionado</th>
                        <th className="p-3 text-right">Neto Liquidado Estimado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rankingChoferes.map(([patente, stat], index) => {
                        const neto = stat.total - Math.round(stat.total * 0.1);
                        return (
                          <tr key={patente} className="hover:bg-slate-50/70">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              {index === 0 && <span className="text-sm">🥇</span>}
                              {index === 1 && <span className="text-sm">🥈</span>}
                              {index === 2 && <span className="text-sm">🥉</span>}
                              <span>{stat.nombre}</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600">{patente}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{stat.viajes}</td>
                            <td className="p-3 text-right font-extrabold text-slate-900">${stat.total.toLocaleString('es-AR')}</td>
                            <td className="p-3 text-right font-extrabold text-emerald-600">${neto.toLocaleString('es-AR')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Asignar Chofer */}
      {viajeParaAsignar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmarAsignacion} className="bg-white rounded-3xl max-w-md w-full p-6 relative space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">Asignar Unidad al Viaje</h3>
              </div>
              <button type="button" onClick={() => setViajeParaAsignar(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{viajeParaAsignar.origen} → {viajeParaAsignar.destino}</p>
              <p className="text-slate-500">{viajeParaAsignar.tipoCarga} • {viajeParaAsignar.tipoCamion}</p>
              <p className="font-extrabold text-emerald-700">${Number(viajeParaAsignar.tarifa).toLocaleString('es-AR')}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Seleccionar chofer disponible</label>
              <select
                required
                value={patenteSeleccionadaModal}
                onChange={(e) => setPatenteSeleccionadaModal(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-500"
              >
                <option value="">-- Elegir chofer de la flota --</option>
                {flotaTotal.map((c) => {
                  const ocupado = patentesOcupadas.has(c.patenteTractor.replace(/\s+/g, '').toUpperCase());
                  return (
                    <option
                      key={c.patenteTractor}
                      value={c.patenteTractor}
                      disabled={ocupado}
                      className={ocupado ? 'text-red-600 font-bold bg-red-50' : 'text-emerald-700 font-bold'}
                    >
                      {ocupado ? '🔴 [OCUPADO EN VIAJE]' : '🟢 [DISPONIBLE]'} {c.nombre} • {c.patenteTractor} ({c.tipoCamion})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setViajeParaAsignar(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoAsignacion || !patenteSeleccionadaModal}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition disabled:opacity-50"
              >
                {guardandoAsignacion ? 'Asignando...' : 'Confirmar y Despachar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal GPS */}
      {modalGps && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 relative space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Radio className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Posición Satelital • {modalGps.chofer?.nombre || 'Chofer'} ({modalGps.chofer?.patenteTractor})
                  </h3>
                  <p className="text-[11px] text-slate-500">{modalGps.origen} → {modalGps.destino}</p>
                </div>
              </div>
              <button
                onClick={() => setModalGps(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalGps.ubicacionActual ? (
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-slate-200 h-72 w-full bg-slate-100 relative">
                  <iframe
                    title="Mapa en Vivo"
                    className="w-full h-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${modalGps.ubicacionActual.lng - 0.015}%2C${modalGps.ubicacionActual.lat - 0.015}%2C${modalGps.ubicacionActual.lng + 0.015}%2C${modalGps.ubicacionActual.lat + 0.015}&layer=mapnik&marker=${modalGps.ubicacionActual.lat}%2C${modalGps.ubicacionActual.lng}`}
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Coordenadas</span>
                    <span className="font-mono font-bold text-slate-800">
                      {modalGps.ubicacionActual.lat.toFixed(5)}, {modalGps.ubicacionActual.lng.toFixed(5)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Última señal</span>
                    <span className="font-bold text-emerald-700">A las {modalGps.ubicacionActual.hora} hs</span>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${modalGps.ubicacionActual.lat},${modalGps.ubicacionActual.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Navigation className="w-4 h-4" />
                  Abrir en Google Maps / Waze
                </a>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                <p className="text-xs font-bold text-slate-700">Esperando primera señal GPS del teléfono del conductor...</p>
                <p className="text-[11px] text-slate-400">
                  El chofer debe tener el portal abierto con permisos de ubicación habilitados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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