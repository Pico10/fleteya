'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  CATALOGO_VEHICULOS,
  ZONAS_ARGENTINA,
  VehiculoLegajo,
  DocumentoAdjunto,
} from '@/types/logistica';
import {
  X,
  Truck,
  CheckCircle2,
  FolderOpen,
  FileCheck2,
  Building2,
  ShieldAlert,
  Save,
  Plus,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Pestana = 'vehiculo' | 'caracteristicas' | 'info_adicional' | 'edificios' | 'archivos';

const PLANTAS_DISPONIBLES = [
  'Planta Siderúrgica San Nicolás',
  'Planta Villa Constitución',
  'Terminal Portuaria Puerto San Martín',
  'Centro Logístico Rosario Sur',
  'Depósito Córdoba Capital',
  'Planta Industrial Cuyo (Mendoza)',
];

const PROVINCIAS_AR = [
  'Buenos Aires',
  'CABA',
  'Santa Fe',
  'Córdoba',
  'Entre Ríos',
  'Mendoza',
  'San Luis',
  'La Pampa',
  'Tucumán',
  'Salta',
  'Chaco',
  'Corrientes',
  'Neuquén',
  'Río Negro',
];

export default function FichaVehiculoModal({ onClose }: Props) {
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>('vehiculo');
  const [vehiculosGuardados, setVehiculosGuardados] = useState<VehiculoLegajo[]>([]);
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const ahoraStr = () =>
    new Date().toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Pestaña 1: Vehículo
  const [empresa, setEmpresa] = useState('Transporte Independiente S.R.L.');
  const [proveedorActivo, setProveedorActivo] = useState('');
  const [contratistaPrincipal, setContratistaPrincipal] = useState('');
  const [tipoDominio, setTipoDominio] = useState('Dominio Argentino');
  const [dominio, setDominio] = useState('');
  const [segundoDominio, setSegundoDominio] = useState('');
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [anio, setAnio] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('Semi largo 13,5 mts');

  // Pestaña 2: Características
  const [tipoHabilitacion, setTipoHabilitacion] = useState('No Requiere');
  const [actividadOrganismo, setActividadOrganismo] = useState('NO requiere');
  const [rastreadorSatelital, setRastreadorSatelital] = useState('');
  const [usuarioSatelital, setUsuarioSatelital] = useState('');
  const [passwordSatelital, setPasswordSatelital] = useState('');
  const [altaTemprana, setAltaTemprana] = useState('');
  const [altaCliente, setAltaCliente] = useState('');
  const [potencia, setPotencia] = useState('');
  const [cargaUtil, setCargaUtil] = useState('28.000 kg');
  const [largo, setLargo] = useState<number>(0);
  const [ancho, setAncho] = useState<number>(0);
  const [alto, setAlto] = useState<number>(0);
  const [pallets, setPallets] = useState<number>(0);

  // Pestaña 3: Info Adicional
  const [tipoEquipo, setTipoEquipo] = useState('Tractor + Semi');
  const [zonasPreferidas, setZonasPreferidas] = useState<string[]>(['Rosario y Cordón Industrial']);
  const [provincia, setProvincia] = useState('Santa Fe');
  const [tipoFlota, setTipoFlota] = useState('Terceros / Fletero');
  const [pesoBrutoCarga, setPesoBrutoCarga] = useState<number>(45000);
  const [tarjetaCombustible, setTarjetaCombustible] = useState('');
  const [clientePreferido, setClientePreferido] = useState('');

  // Pestaña 4: Edificios
  const [edificiosHabilitados, setEdificiosHabilitados] = useState<string[]>([
    'Planta Siderúrgica San Nicolás',
  ]);

  // Pestaña 5: Adjuntar Archivo
  const [documentos, setDocumentos] = useState<VehiculoLegajo['documentos']>({
    cedulaVerde: null,
    dniChofer: null,
    licenciaConducir: null,
    seguroVigente: null,
    vtv: null,
    certificadoSatelital: null,
  });

  // Auditoría
  const [auditoria, setAuditoria] = useState({
    usuarioCreacion: 'Transportista (Portal Web)',
    fechaCreacion: ahoraStr(),
    usuarioUltimoCambio: 'Transportista (Portal Web)',
    fechaUltimoCambio: ahoraStr(),
    cuentaOrigen: 'FleteYa B2B',
  });

  useEffect(() => {
    const q = query(collection(db, 'vehiculos_legajos'), orderBy('dominio', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const lista: VehiculoLegajo[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VehiculoLegajo, 'id'>),
      }));
      setVehiculosGuardados(lista);
    });
    return () => unsub();
  }, []);

  const limpiarFormulario = () => {
    setIdEditando(null);
    setDominio('');
    setSegundoDominio('');
    setAnio('');
    setMarca('');
    setModelo('');
    setEstado('Activo');
    setRastreadorSatelital('');
    setUsuarioSatelital('');
    setPasswordSatelital('');
    setLargo(0);
    setAncho(0);
    setAlto(0);
    setPallets(0);
    setDocumentos({
      cedulaVerde: null,
      dniChofer: null,
      licenciaConducir: null,
      seguroVigente: null,
      vtv: null,
      certificadoSatelital: null,
    });
    setAuditoria({
      usuarioCreacion: 'Transportista (Portal Web)',
      fechaCreacion: ahoraStr(),
      usuarioUltimoCambio: 'Transportista (Portal Web)',
      fechaUltimoCambio: ahoraStr(),
      cuentaOrigen: 'FleteYa B2B',
    });
    setPestanaActiva('vehiculo');
  };

  const cargarVehiculoParaEditar = (v: VehiculoLegajo) => {
    setIdEditando(v.id || null);
    setEmpresa(v.empresa || '');
    setProveedorActivo(v.proveedorActivo || '');
    setContratistaPrincipal(v.contratistaPrincipal || '');
    setTipoDominio(v.tipoDominio || 'Dominio Argentino');
    setDominio(v.dominio || '');
    setSegundoDominio(v.segundoDominio || '');
    setEstado(v.estado || 'Activo');
    setAnio(v.anio || '');
    setMarca(v.marca || '');
    setModelo(v.modelo || '');
    setTipoVehiculo(v.tipoVehiculo || 'Semi largo 13,5 mts');

    setTipoHabilitacion(v.tipoHabilitacion || 'No Requiere');
    setActividadOrganismo(v.actividadOrganismo || 'NO requiere');
    setRastreadorSatelital(v.rastreadorSatelital || '');
    setUsuarioSatelital(v.usuarioSatelital || '');
    setPasswordSatelital(v.passwordSatelital || '');
    setAltaTemprana(v.altaTemprana || '');
    setAltaCliente(v.altaCliente || '');
    setPotencia(v.potencia || '');
    setCargaUtil(v.cargaUtil || '');
    setLargo(v.largo || 0);
    setAncho(v.ancho || 0);
    setAlto(v.alto || 0);
    setPallets(v.pallets || 0);

    setTipoEquipo(v.tipoEquipo || '');
    setZonasPreferidas(v.zonasPreferidas || []);
    setProvincia(v.provincia || 'Santa Fe');
    setTipoFlota(v.tipoFlota || '');
    setPesoBrutoCarga(v.pesoBrutoCarga || 0);
    setTarjetaCombustible(v.tarjetaCombustible || '');
    setClientePreferido(v.clientePreferido || '');

    setEdificiosHabilitados(v.edificiosHabilitados || []);
    setDocumentos(v.documentos || {});
    setAuditoria({
      usuarioCreacion: v.usuarioCreacion || 'Transportista',
      fechaCreacion: v.fechaCreacion || ahoraStr(),
      usuarioUltimoCambio: v.usuarioUltimoCambio || 'Transportista',
      fechaUltimoCambio: v.fechaUltimoCambio || ahoraStr(),
      cuentaOrigen: v.cuentaOrigen || 'FleteYa B2B',
    });
  };

  const toggleZona = (zona: string) => {
    setZonasPreferidas((prev) =>
      prev.includes(zona) ? prev.filter((z) => z !== zona) : [...prev, zona]
    );
  };

  const toggleEdificio = (planta: string) => {
    setEdificiosHabilitados((prev) =>
      prev.includes(planta) ? prev.filter((p) => p !== planta) : [...prev, planta]
    );
  };

  const handleAdjuntarArchivo = (
    clave: keyof VehiculoLegajo['documentos'],
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 900 * 1024) {
      alert('El archivo supera los 900 KB. Subí una foto más liviana o PDF comprimido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const adjunto: DocumentoAdjunto = {
        nombreArchivo: file.name,
        base64: reader.result as string,
        fechaSubida: ahoraStr(),
      };
      setDocumentos((prev) => ({ ...prev, [clave]: adjunto }));
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dominio.trim()) {
      alert('Ingresá al menos el Dominio (patente) del vehículo.');
      setPestanaActiva('vehiculo');
      return;
    }

    setGuardando(true);
    try {
      const payload: Omit<VehiculoLegajo, 'id'> = {
        empresa,
        proveedorActivo,
        contratistaPrincipal,
        tipoDominio,
        dominio: dominio.trim().toUpperCase(),
        segundoDominio: segundoDominio.trim().toUpperCase(),
        estado,
        anio,
        marca,
        modelo,
        tipoVehiculo,
        tipoHabilitacion,
        actividadOrganismo,
        rastreadorSatelital,
        usuarioSatelital,
        passwordSatelital,
        altaTemprana,
        altaCliente,
        potencia,
        cargaUtil,
        largo: Number(largo) || 0,
        ancho: Number(ancho) || 0,
        alto: Number(alto) || 0,
        pallets: Number(pallets) || 0,
        tipoEquipo,
        zonasPreferidas,
        provincia,
        tipoFlota,
        pesoBrutoCarga: Number(pesoBrutoCarga) || 0,
        tarjetaCombustible,
        clientePreferido,
        edificiosHabilitados,
        documentos,
        usuarioCreacion: auditoria.usuarioCreacion,
        fechaCreacion: auditoria.fechaCreacion,
        usuarioUltimoCambio: 'Transportista (Portal Web)',
        fechaUltimoCambio: ahoraStr(),
        cuentaOrigen: auditoria.cuentaOrigen,
      };

      if (idEditando) {
        await updateDoc(doc(db, 'vehiculos_legajos', idEditando), payload);
        alert(`Legajo de unidad ${payload.dominio} actualizado.`);
      } else {
        await addDoc(collection(db, 'vehiculos_legajos'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        alert(`Unidad ${payload.dominio} registrada con su legajo técnico.`);
      }
      limpiarFormulario();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el legajo del vehículo.');
    } finally {
      setGuardando(false);
    }
  };

  const docsRequeridos: { key: keyof VehiculoLegajo['documentos']; label: string }[] = [
    { key: 'cedulaVerde', label: 'Cédula Verde / Título del Automotor' },
    { key: 'dniChofer', label: 'DNI del Chofer Titular' },
    { key: 'licenciaConducir', label: 'Licencia de Conducir / LiNTI Vigente' },
    { key: 'seguroVigente', label: 'Póliza y Comprobante de Seguro Vigente' },
    { key: 'vtv', label: 'VTV / RTO (Revisión Técnica Obligatoria)' },
    { key: 'certificadoSatelital', label: 'Certificado de Rastreo Satelital' },
  ];

  const cantidadDocsCargados = Object.values(documentos).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 md:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden text-xs">
        {/* Encabezado Estilo Corporativo (Captura VEHÍCULO: Datos Principales) */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-red-700 font-extrabold text-sm tracking-tight">
              VEHÍCULO: Datos Principales
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold text-white ${
                estado === 'Activo' ? 'bg-emerald-600' : 'bg-slate-500'
              }`}
            >
              {estado.toUpperCase()}
            </span>
            {dominio && (
              <span className="font-mono font-bold bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-800">
                {dominio} {segundoDominio ? `/ ${segundoDominio}` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={limpiarFormulario}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-bold text-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Unidad
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector rápido de unidades ya cargadas */}
        {vehiculosGuardados.length > 0 && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-sky-900 shrink-0">Flota registrada:</span>
            {vehiculosGuardados.map((v) => {
              const docsCount = Object.values(v.documentos || {}).filter(Boolean).length;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => cargarVehiculoParaEditar(v)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold shrink-0 flex items-center gap-1.5 transition ${
                    idEditando === v.id
                      ? 'bg-sky-700 text-white border-sky-800'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-sky-500'
                  }`}
                >
                  <Truck className="w-3 h-3" />
                  {v.dominio} ({docsCount}/6 docs)
                </button>
              );
            })}
          </div>
        )}

        {/* Barra de 5 Pestañas Exactas de las Capturas */}
        <div className="flex border-b border-slate-300 bg-slate-50 px-3 pt-2 gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'vehiculo', label: 'Vehículo' },
            { id: 'caracteristicas', label: 'Características' },
            { id: 'info_adicional', label: 'Info Adicional' },
            { id: 'edificios', label: 'Edificios' },
            {
              id: 'archivos',
              label: `Adjuntar Archivo (${cantidadDocsCargados}/6)`,
            },
          ].map((tab) => {
            const activa = pestanaActiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPestanaActiva(tab.id as Pestana)}
                className={`px-4 py-2 rounded-t-lg text-xs font-bold border-t border-x transition whitespace-nowrap ${
                  activa
                    ? 'bg-white text-red-700 border-slate-300 -mb-px shadow-2xs'
                    : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido del Formulario */}
        <form onSubmit={handleGuardar} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* PESTAÑA 1: VEHÍCULO */}
            {pestanaActiva === 'vehiculo' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Empresa:</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Proveedores Activos:</label>
                    <input
                      type="text"
                      placeholder="<<Seleccione o escriba Proveedor>>"
                      value={proveedorActivo}
                      onChange={(e) => setProveedorActivo(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tipo Dominio:</label>
                    <select
                      value={tipoDominio}
                      onChange={(e) => setTipoDominio(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                    >
                      <option value="Dominio Argentino">Dominio Argentino</option>
                      <option value="Dominio Mercosur">Dominio Mercosur</option>
                      <option value="Dominio Extranjero">Dominio Extranjero</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Dominio (Tractor) *:</label>
                    <input
                      type="text"
                      required
                      placeholder="DOMINIO"
                      value={dominio}
                      onChange={(e) => setDominio(e.target.value.toUpperCase())}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold uppercase outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Segundo Dominio (Semi):</label>
                    <input
                      type="text"
                      placeholder="SEGUNDO DOMINIO"
                      value={segundoDominio}
                      onChange={(e) => setSegundoDominio(e.target.value.toUpperCase())}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold uppercase outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Contratista Principal:</label>
                    <input
                      type="text"
                      value={contratistaPrincipal}
                      onChange={(e) => setContratistaPrincipal(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Estado:</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}
                      className="w-full border border-slate-300 rounded p-2 font-bold bg-white"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Año:</label>
                    <input
                      type="text"
                      placeholder="Ej: 2022"
                      value={anio}
                      onChange={(e) => setAnio(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Marca:</label>
                    <input
                      type="text"
                      placeholder="Ej: Scania / Mercedes-Benz / Iveco"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Modelo:</label>
                    <input
                      type="text"
                      placeholder="Ej: R450 / Actros 2651"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tipo de Unidad:</label>
                    <select
                      value={tipoVehiculo}
                      onChange={(e) => setTipoVehiculo(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-bold bg-white"
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
                </div>
              </div>
            )}

            {/* PESTAÑA 2: CARACTERÍSTICAS */}
            {pestanaActiva === 'caracteristicas' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tipo Habilitación:</label>
                    <select
                      value={tipoHabilitacion}
                      onChange={(e) => setTipoHabilitacion(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                    >
                      <option value="No Requiere">No Requiere</option>
                      <option value="Carga General">Carga General</option>
                      <option value="Cargas Peligrosas">Cargas Peligrosas</option>
                      <option value="SENASA">SENASA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Rastreador Satelital:</label>
                    <input
                      type="text"
                      placeholder="Ej: LoJack / Megatrans / Ituran"
                      value={rastreadorSatelital}
                      onChange={(e) => setRastreadorSatelital(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Actividad / Organismo:</label>
                    <input
                      type="text"
                      value={actividadOrganismo}
                      onChange={(e) => setActividadOrganismo(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Usuario (Rastreador Satelital):</label>
                    <input
                      type="text"
                      placeholder="Usuario espejo para auditoría"
                      value={usuarioSatelital}
                      onChange={(e) => setUsuarioSatelital(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Password (Rastreador Satelital):</label>
                    <input
                      type="text"
                      placeholder="Clave espejo"
                      value={passwordSatelital}
                      onChange={(e) => setPasswordSatelital(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Alta Temprana:</label>
                    <input
                      type="date"
                      value={altaTemprana}
                      onChange={(e) => setAltaTemprana(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Alta Cliente:</label>
                    <input
                      type="date"
                      value={altaCliente}
                      onChange={(e) => setAltaCliente(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Potencia:</label>
                    <input
                      type="text"
                      placeholder="Ej: 450 CV"
                      value={potencia}
                      onChange={(e) => setPotencia(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Carga Útil:</label>
                    <input
                      type="text"
                      placeholder="Ej: 28.500 kg"
                      value={cargaUtil}
                      onChange={(e) => setCargaUtil(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Largo (mts):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={largo}
                      onChange={(e) => setLargo(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Ancho (mts):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ancho}
                      onChange={(e) => setAncho(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Alto (mts):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={alto}
                      onChange={(e) => setAlto(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Pallets (capacidad):</label>
                    <input
                      type="number"
                      value={pallets}
                      onChange={(e) => setPallets(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: INFO ADICIONAL Y ZONAS PREFERIDAS */}
            {pestanaActiva === 'info_adicional' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tipo Equipo:</label>
                    <input
                      type="text"
                      value={tipoEquipo}
                      onChange={(e) => setTipoEquipo(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Provincia Base:</label>
                    <select
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                    >
                      {PROVINCIAS_AR.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tipos de Flota:</label>
                    <select
                      value={tipoFlota}
                      onChange={(e) => setTipoFlota(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                    >
                      <option value="Propia">Flota Propia</option>
                      <option value="Terceros / Fletero">Terceros / Fletero</option>
                      <option value="Contratada Fija">Contratada Fija</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Peso Bruto de Carga (kg):</label>
                    <input
                      type="number"
                      value={pesoBrutoCarga}
                      onChange={(e) => setPesoBrutoCarga(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-red-700 font-bold block mb-1">Tarjeta Combustible / Esso:</label>
                    <input
                      type="text"
                      placeholder="00000"
                      value={tarjetaCombustible}
                      onChange={(e) => setTarjetaCombustible(e.target.value)}
                      className="w-full border border-slate-300 rounded p-2 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-red-700 font-bold block mb-1">Cliente Preferido (Código):</label>
                  <input
                    type="text"
                    placeholder="000001"
                    value={clientePreferido}
                    onChange={(e) => setClientePreferido(e.target.value)}
                    className="w-full md:w-1/2 border border-slate-300 rounded p-2 font-mono"
                  />
                </div>

                {/* Zonas preferidas del transportista */}
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 space-y-2">
                  <label className="text-sky-900 font-extrabold block">
                    Regiones / Zonas Preferidas de Destino (Como en Sidersa):
                  </label>
                  <p className="text-[11px] text-slate-600">
                    Seleccioná los corredores habituales hacia donde este camión acepta viajes:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    {ZONAS_ARGENTINA.map((zona) => (
                      <label
                        key={zona}
                        className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded cursor-pointer hover:border-sky-400"
                      >
                        <input
                          type="checkbox"
                          checked={zonasPreferidas.includes(zona)}
                          onChange={() => toggleZona(zona)}
                        />
                        <span className="font-semibold text-slate-700">{zona}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 4: EDIFICIOS / PLANTAS HABILITADAS */}
            {pestanaActiva === 'edificios' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-bold">
                  <Building2 className="w-4 h-4" />
                  <span>Plantas, Puertos y Edificios habilitados para ingreso de la unidad:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PLANTAS_DISPONIBLES.map((planta) => (
                    <label
                      key={planta}
                      className="flex items-center gap-2.5 p-3 border border-slate-300 rounded-lg bg-slate-50 cursor-pointer hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={edificiosHabilitados.includes(planta)}
                        onChange={() => toggleEdificio(planta)}
                      />
                      <span className="font-bold text-slate-800">{planta}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* PESTAÑA 5: ADJUNTAR ARCHIVO (DOCUMENTACIÓN OBLIGATORIA) */}
            {pestanaActiva === 'archivos' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Para operar cargas en planta, cada chofer y camión debe tener subida su documentación en regla (JPG, PNG o PDF hasta 900 KB).
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docsRequeridos.map((item) => {
                    const adj = documentos[item.key];
                    return (
                      <div
                        key={item.key}
                        className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-red-700 font-bold">{item.label}:</label>
                          {adj ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3" /> Cargado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <label className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs cursor-pointer font-bold text-slate-700 transition">
                          <FolderOpen className="w-4 h-4 text-slate-600" />
                          <span>Seleccione Archivo</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleAdjuntarArchivo(item.key, e)}
                            className="hidden"
                          />
                        </label>

                        {adj && (
                          <p className="text-[11px] text-slate-600 truncate">
                            Archivo: <strong>{adj.nombreArchivo}</strong> ({adj.fechaSubida})
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pie de Auditoría + Botones Guardar/Cancelar */}
          <div className="bg-slate-100 border-t border-slate-300 px-5 py-3 shrink-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-red-800 font-semibold border-b border-slate-200 pb-2">
              <div>
                <p>Usuario último Cambio Estado: <span className="text-slate-700">{auditoria.usuarioUltimoCambio}</span></p>
                <p>Cuenta Origen: <span className="text-slate-700">{auditoria.cuentaOrigen}</span></p>
              </div>
              <div>
                <p>Fecha último Cambio de Estado: <span className="text-slate-700">{auditoria.fechaUltimoCambio}</span></p>
                <p>Usuario Creación: <span className="text-slate-700">{auditoria.usuarioCreacion}</span></p>
              </div>
              <div>
                <p>Fecha de Creación: <span className="text-slate-700">{auditoria.fechaCreacion}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded shadow-2xs transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}