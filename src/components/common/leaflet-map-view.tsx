"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";

interface LeafletMapViewProps {
  lat: number;
  lng: number;
  tileUrl: string;
  attribution: string;
  onPinMoved: (lat: number, lng: number) => void;
  flyToTrigger: { lat: number; lng: number; zoom: number; key: number };
}

// Controller component to handle programmatic flying, resizing, and clicking
function MapEventHandler({
  flyToTrigger,
  onMapClick,
}: {
  flyToTrigger: { lat: number; lng: number; zoom: number; key: number };
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  // Smooth fly to coordinate when triggered
  React.useEffect(() => {
    map.flyTo([flyToTrigger.lat, flyToTrigger.lng], flyToTrigger.zoom, {
      duration: 1.0,
    });
  }, [flyToTrigger, map]);

  // Invalidate size to fill container after dialog opening transition
  React.useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  // Click on map moves the pin
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Precision yellow & black SVG needle pin for high visibility over normal light tiles
const precisionPinIcon = L.divIcon({
  className: "custom-uber-pin",
  html: `
    <div style="position: relative; width: 36px; height: 46px; cursor: grab; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.55)); pointer-events: none;">
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 1C8.611 1 1 8.611 1 18C1 30.2 18 45 18 45C18 45 35 30.2 35 18C35 8.611 27.389 1 18 1Z" fill="#ffcc00" stroke="#000000" stroke-width="2.5"/>
        <circle cx="18" cy="18" r="7.5" fill="#000000"/>
        <circle cx="18" cy="18" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
  popupAnchor: [0, -45],
});

export function LeafletMapView({
  lat,
  lng,
  tileUrl,
  attribution,
  onPinMoved,
  flyToTrigger,
}: LeafletMapViewProps) {
  const eventHandlers = React.useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker) {
          const latLng = marker.getLatLng();
          onPinMoved(latLng.lat, latLng.lng);
        }
      },
    }),
    [onPinMoved]
  );

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={true}
      zoomControl={false}
      className="size-full outline-none"
      style={{ width: "100%", height: "100%", backgroundColor: "#e5e3df" }}
    >
      <TileLayer
        url={tileUrl}
        attribution={attribution}
        maxZoom={20}
        subdomains={["a", "b", "c"]}
      />

      {/* Top right zoom controls */}
      <ZoomControl position="topright" />

      {/* Interactive Map Controller */}
      <MapEventHandler flyToTrigger={flyToTrigger} onMapClick={onPinMoved} />

      {/* Draggable Needle Pin Marker */}
      <Marker
        position={[lat, lng]}
        draggable={true}
        eventHandlers={eventHandlers}
        icon={precisionPinIcon}
      />
    </MapContainer>
  );
}
