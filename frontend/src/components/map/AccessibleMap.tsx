"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { RouteLayers } from "@/src/components/map/RouteLayers";
import { DEFAULT_CENTER, DEFAULT_ZOOM, formatCoordinate } from "@/src/lib/geo/geojson";
import type { LatLngPoint } from "@/src/types/geo";
import type { RouteResponse } from "@/src/types/route";

type AccessibleMapProps = {
  start: LatLngPoint | null;
  end: LatLngPoint | null;
  response: RouteResponse | null;
};

function markerIcon(label: string, className: string) {
  return L.divIcon({
    className: "",
    html: `<span class="${className}">${label}</span>`,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
  });
}

function MapViewportController({
  start,
  end,
}: {
  start: LatLngPoint | null;
  end: LatLngPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (start && end) {
      map.fitBounds(
        [
          [start.lat, start.lng],
          [end.lat, end.lng],
        ],
        { maxZoom: 17, padding: [48, 48] },
      );
      return;
    }

    const point = start ?? end;
    if (point) {
      map.setView([point.lat, point.lng], 17);
    }
  }, [end, map, start]);

  return null;
}

const startIcon = markerIcon(
  "출",
  "grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-white bg-teal-800 text-sm font-black text-white shadow-lg",
);

const endIcon = markerIcon(
  "도",
  "grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-white bg-slate-900 text-sm font-black text-white shadow-lg",
);

export function AccessibleMap({ start, end, response }: AccessibleMapProps) {
  return (
    <div className="relative h-full min-h-[460px] overflow-hidden rounded-none bg-slate-200 lg:min-h-0">
      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        className="h-full w-full"
        keyboard
        scrollWheelZoom
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapViewportController end={end} start={start} />
        <RouteLayers response={response} />
        {start ? (
          <>
            <Marker icon={startIcon} position={[start.lat, start.lng]}>
              <Popup>출발지: {formatCoordinate(start)}</Popup>
            </Marker>
            <Circle
              center={[start.lat, start.lng]}
              pathOptions={{ color: "#0f766e", fillOpacity: 0.08, weight: 2 }}
              radius={22}
            />
          </>
        ) : null}
        {end ? (
          <>
            <Marker icon={endIcon} position={[end.lat, end.lng]}>
              <Popup>목적지: {formatCoordinate(end)}</Popup>
            </Marker>
            <Circle
              center={[end.lat, end.lng]}
              pathOptions={{ color: "#0f172a", fillOpacity: 0.08, weight: 2 }}
              radius={22}
            />
          </>
        ) : null}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[500] rounded-md border border-slate-300 bg-white/95 p-3 text-sm font-bold text-slate-950 shadow-md sm:left-4 sm:right-auto">
        주소 검색 결과를 선택하면 지도에 표시됩니다.
      </div>

      <div className="absolute bottom-3 left-3 z-[500] rounded-md border border-slate-300 bg-white/95 p-3 text-xs font-semibold text-slate-900 shadow-md">
        <h2 className="mb-2 text-sm font-bold">범례</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-0 w-12 border-t-4 border-dashed border-slate-700" />
            최단 경로
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0 w-12 border-t-8 border-solid border-teal-700" />
            맞춤 경로
          </div>
        </div>
      </div>
    </div>
  );
}
