"use client";

import { Polyline } from "react-leaflet";
import { lineStringToLatLngs } from "@/src/lib/geo/geojson";
import type { RouteResponse } from "@/src/types/route";

type RouteLayersProps = {
  response: RouteResponse | null;
};

export function RouteLayers({ response }: RouteLayersProps) {
  if (!response) {
    return null;
  }

  return (
    <>
      {response.routes.map((route) => {
        const isAccessible = route.routeType === "accessible";
        const positions = lineStringToLatLngs(route.geometry).map((point) => [
          point.lat,
          point.lng,
        ] as [number, number]);

        return (
          <Polyline
            dashArray={isAccessible ? undefined : "8 8"}
            key={route.routeType}
            pathOptions={{
              className: isAccessible ? "route-line-accessible" : "route-line-shortest",
              color: isAccessible ? "#0f766e" : "#334155",
              lineCap: "round",
              lineJoin: "round",
              opacity: 0.95,
              weight: isAccessible ? 8 : 4,
            }}
            positions={positions}
          />
        );
      })}
    </>
  );
}
