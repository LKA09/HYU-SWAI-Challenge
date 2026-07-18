import type { LatLngPoint } from "@/src/types/geo";

export const DEFAULT_CENTER: LatLngPoint = {
  lat: 36.3885,
  lng: 127.3765,
};

export const DEFAULT_ZOOM = 16;

export function toGeoJsonLine(points: LatLngPoint[]): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: points.map((point) => [point.lng, point.lat]),
  };
}

export function lineStringToLatLngs(line: GeoJSON.LineString): LatLngPoint[] {
  return line.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function formatCoordinate(point: LatLngPoint | null): string {
  if (!point) {
    return "";
  }

  return `위도 ${point.lat.toFixed(5)}, 경도 ${point.lng.toFixed(5)}`;
}

export function createMockRouteLine(
  start: LatLngPoint,
  end: LatLngPoint,
  offset: number,
): GeoJSON.LineString {
  const midpoint = {
    lat: (start.lat + end.lat) / 2 + offset,
    lng: (start.lng + end.lng) / 2 - offset,
  };

  return toGeoJsonLine([start, midpoint, end]);
}
