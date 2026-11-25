export type RolUsuario = 'fletero' | 'transportista';

export type EstadoSemaforo = 'verde' | 'rojo' | 'amarillo' | 'azul';

export type TipoLiquidacion = 'KM' | 'TN' | 'CERRADO';

export interface RepartoEntrega {
  orden: number;
  cliente: string;
  direccion: string;
  localidad: string;
  producto: string;
  toneladas: number;
}

export interface RequisitosSeguridad {
  cadenas: number;
  fajas: number;
  cunas: number;
  otrosSujecion?: string;
  epp: {
    casco: boolean;
    chaleco: boolean;
    borceguies: boolean;
    ropaSeguridad: boolean;
    otrosEpp?: string;
  };
}

export interface OfertaViaje {
  id: string;
  guia: string; // Ej: "30272756"
  fleteroId: string;
  fleteroNombre: string;
  contactoFlete: string;

  // Fechas y horarios de control (Sidersa style)
  fechaOfrecimiento: string; // DD/MM/YYYY
  horaOfrecimiento: string;  // HH:mm
  fechaPedido: string;       // DD/MM/YYYY
  horaPedido: string;        // HH:mm

  // Semáforo y estado
  estadoSemaforo: EstadoSemaforo;
  ofrecimientoSimultaneo: boolean;

  // Origen y Ubicación
  origenLocalidad: string;
  linkGoogleMaps: string;

  // Unidad y Carga
  tipoVehiculo: string;
  categoriaTransporte: 'Interjurisdiccional' | 'No interjurisdiccional' | 'Especial / Local';
  tipoContrato?: string;
  cupoTotal?: number;
  cupoPendiente?: number;

  // Repartos / Clientes multiparada
  repartos: RepartoEntrega[];
  toneladasTotales: number;

  // Liquidación y Kilometraje
  tipoLiquidacion: TipoLiquidacion;
  kmReales: number;
  kmLiquidar: number;
  tarifaReferencia?: number;

  // Seguridad y observaciones
  seguridad: RequisitosSeguridad;
  observaciones: string;

  // Adjudicación (cuando pasa a Amarillo o Azul)
  transportistaAsignado?: {
    patenteTractor: string;
    patenteSemi?: string;
    nombreChofer: string;
    telefono: string;
    tarifaCotizada?: number;
  } | null;

  // Tracking operativo (heredado de V1 una vez asignado)
  etapaRuta?: 'llegada_origen' | 'en_transito' | 'llegada_destino' | 'entregado' | null;
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

export const CATALOGO_VEHICULOS = {
  Camiones: [
    'Camión arenero',
    'Camión expreso',
    'Camión local',
    'Camión tolva',
    'Chasis (camión)',
    'Cisterna',
    'Furgón',
  ],
  'Tractores y unidades de arrastre': [
    'Semi largo 13,5 mts',
    'Semi largo 14,5 mts',
    'Semirremolque',
    'Semirremolque portacontenedor',
    'Tractor (para semi)',
    'Acoplado',
    'Tráiler',
    'Tráiler / carretón',
    'Carretón',
    'Carro playo',
    'Tolva',
    'Containeras',
  ],
  'Livianos y Especiales': [
    'Camioneta / Utilitario',
    'Tanque de combustible / apoyo',
    'Carro de agua',
    'Monotolva',
  ],
} as const;

export const ZONAS_ARGENTINA = [
  'AMBA / Buenos Aires',
  'Rosario y Cordón Industrial',
  'Santa Fe Centro / Norte',
  'Córdoba',
  'Cuyo (Mendoza / San Juan / San Luis)',
  'NOA (Tucumán / Salta / Jujuy)',
  'NEA (Chaco / Corrientes / Misiones / Entre Ríos)',
  'La Pampa y Patagonia Norte',
  'Patagonia Sur',
] as const;
export interface DocumentoAdjunto {
  nombreArchivo: string;
  base64: string;
  fechaSubida: string;
}

export interface VehiculoLegajo {
  id?: string;
  // Pestaña 1: Vehículo
  empresa: string;
  proveedorActivo: string;
  contratistaPrincipal: string;
  tipoDominio: string;
  dominio: string;        // Patente tractor
  segundoDominio: string; // Patente semi / acoplado
  estado: 'Activo' | 'Inactivo';
  anio: string;
  marca: string;
  modelo: string;
  tipoVehiculo: string;

  // Pestaña 2: Características
  tipoHabilitacion: string;
  actividadOrganismo: string;
  rastreadorSatelital: string;
  usuarioSatelital: string;
  passwordSatelital: string;
  altaTemprana: string;
  altaCliente: string;
  potencia: string;
  cargaUtil: string;
  largo: number;
  ancho: number;
  alto: number;
  pallets: number;

  // Pestaña 3: Info Adicional
  tipoEquipo: string;
  zonasPreferidas: string[];
  provincia: string;
  tipoFlota: string;
  pesoBrutoCarga: number;
  tarjetaCombustible: string;
  clientePreferido: string;

  // Pestaña 4: Edificios / Plantas habilitadas
  edificiosHabilitados: string[];

  // Pestaña 5: Adjuntar Archivo (Documentación obligatoria)
  documentos: {
    cedulaVerde?: DocumentoAdjunto | null;
    dniChofer?: DocumentoAdjunto | null;
    licenciaConducir?: DocumentoAdjunto | null;
    seguroVigente?: DocumentoAdjunto | null;
    vtv?: DocumentoAdjunto | null;
    certificadoSatelital?: DocumentoAdjunto | null;
  };

  // Auditoría al pie
  usuarioCreacion: string;
  fechaCreacion: string;
  usuarioUltimoCambio: string;
  fechaUltimoCambio: string;
  cuentaOrigen: string;
}
