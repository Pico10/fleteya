'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const COORDENADAS: Record<string, [number, number]> = {
  'Rosario, Santa Fe': [-32.9468, -60.6393],
  'San Lorenzo, Santa Fe': [-32.7471, -60.7328],
  'Santa Fe Capital': [-31.6333, -60.7000],
  'Buenos Aires (~300 km)': [-34.6037, -58.3816],
  'Córdoba (~400 km)': [-31.4201, -64.1888],
  'Santa teresa': [-33.4022, -60.8524],
  'San lorenzo': [-32.7471, -60.7328],
  'Rosario': [-32.9468, -60.6393],
  'Puerto rosario': [-32.9600, -60.6200],
};

function normalizarCiudad(nombre: string): [number, number] {
  const limpio = nombre.trim();
  for (const [key, val] of Object.entries(COORDENADAS)) {
    if (limpio.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(limpio.toLowerCase())) {
      return val;
    }
  }
  return [-32.9468, -60.6393]; // Default Rosario
}

function RecenterMap({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

interface TrackingMapProps {
  origen: string;
  destino: string;
}

export default function TrackingMap({ origen, destino }: TrackingMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        Cargando mapa de ruta...
      </div>
    );
  }

  const coordOrigen = normalizarCiudad(origen);
  const coordDestino = normalizarCiudad(destino);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer
        center={coordOrigen}
        zoom={7}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={coordOrigen}>
          <Popup>
            <strong>Origen:</strong> {origen}
          </Popup>
        </Marker>

        <Marker position={coordDestino}>
          <Popup>
            <strong>Destino:</strong> {destino}
          </Popup>
        </Marker>

        <Polyline
          positions={[coordOrigen, coordDestino]}
          pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8, 8' }}
        />

        <RecenterMap coords={[coordOrigen, coordDestino]} />
      </MapContainer>
    </div>
  );
}