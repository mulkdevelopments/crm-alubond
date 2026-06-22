'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';

import { MapInteractionOverlay } from '@/components/map/MapInteractionOverlay';
import { useScrollFriendlyMap } from '@/components/map/useScrollFriendlyMap';

const DEFAULT_CENTER: LatLngExpression = [20, 0];

// Use hosted marker assets so pins render correctly in Next.js.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterOnPosition({
  lat,
  lng,
  focusZoom = 10,
}: {
  lat: number | null;
  lng: number | null;
  focusZoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), focusZoom), { animate: true });
  }, [map, lat, lng, focusZoom]);

  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  onPick,
  interactive = true,
  initialZoom = 2,
  focusZoom = 10,
  heightClassName = 'h-[220px]',
}: {
  lat: number | null;
  lng: number | null;
  onPick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  initialZoom?: number;
  focusZoom?: number;
  heightClassName?: string;
}) {
  const center = useMemo<LatLngExpression>(() => {
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return DEFAULT_CENTER;
    }
    return [lat, lng];
  }, [lat, lng]);

  const markerPosition = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
    ? ([lat, lng] as LatLngExpression)
    : null;

  const mapInteraction = useScrollFriendlyMap();
  const mapInteractive = interactive && mapInteraction.interactive;

  return (
    <div className={`relative ${heightClassName}`}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        minZoom={2}
        maxZoom={18}
        dragging={mapInteractive}
        touchZoom={mapInteractive}
        doubleClickZoom={mapInteractive}
        boxZoom={mapInteractive}
        keyboard={mapInteractive}
        scrollWheelZoom={false}
        className="h-full"
        attributionControl
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnPosition lat={lat} lng={lng} focusZoom={focusZoom} />
      {interactive && onPick && <ClickHandler onPick={onPick} />}
      {markerPosition && <Marker position={markerPosition} draggable={interactive && Boolean(onPick)} eventHandlers={{ dragend: (event) => {
        if (!onPick) return;
        const marker = event.target;
        const pos = marker.getLatLng();
        onPick(pos.lat, pos.lng);
      } }} />}
      </MapContainer>
      {interactive ? (
        <MapInteractionOverlay
          visible={mapInteraction.isMobile}
          active={mapInteraction.active}
          onActivate={mapInteraction.activate}
          onDeactivate={mapInteraction.deactivate}
        />
      ) : null}
    </div>
  );
}
