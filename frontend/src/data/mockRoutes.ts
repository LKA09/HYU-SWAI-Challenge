import {
  createMockRouteLine,
  DEFAULT_CENTER,
  toGeoJsonLine,
} from "@/src/lib/geo/geojson";
import type { LatLngPoint } from "@/src/types/geo";
import type { RouteComparison, RouteResponse } from "@/src/types/route";

export const initialWeights = {
  distance: 20,
  slope: 30,
  stairs: 25,
  sidewalk: 15,
  crossing: 10,
};

export const routeComparison: RouteComparison = {
  shortest: {
    distanceM: 820,
    durationMin: 12,
    burdenScore: 74,
    stairsCount: 2,
    steepSectionCount: 3,
    unsafeCrossingCount: 2,
  },
  accessible: {
    distanceM: 1030,
    durationMin: 17,
    burdenScore: 31,
    stairsCount: 0,
    steepSectionCount: 1,
    unsafeCrossingCount: 0,
  },
};

export const demoStart: LatLngPoint = {
  lat: DEFAULT_CENTER.lat + 0.0018,
  lng: DEFAULT_CENTER.lng - 0.0024,
};

export const demoEnd: LatLngPoint = {
  lat: DEFAULT_CENTER.lat - 0.0014,
  lng: DEFAULT_CENTER.lng + 0.0022,
};

export const staticMockRoutes: RouteResponse = {
  routes: [
    {
      routeType: "shortest",
      distanceM: routeComparison.shortest.distanceM,
      durationMin: routeComparison.shortest.durationMin,
      burdenScore: routeComparison.shortest.burdenScore,
      geometry: toGeoJsonLine([
        demoStart,
        { lat: DEFAULT_CENTER.lat + 0.0002, lng: DEFAULT_CENTER.lng - 0.0004 },
        demoEnd,
      ]),
      summary: {
        stairsCount: routeComparison.shortest.stairsCount,
        steepSectionCount: routeComparison.shortest.steepSectionCount,
        unsafeCrossingCount: routeComparison.shortest.unsafeCrossingCount,
      },
    },
    {
      routeType: "accessible",
      distanceM: routeComparison.accessible.distanceM,
      durationMin: routeComparison.accessible.durationMin,
      burdenScore: routeComparison.accessible.burdenScore,
      geometry: toGeoJsonLine([
        demoStart,
        { lat: DEFAULT_CENTER.lat + 0.001, lng: DEFAULT_CENTER.lng + 0.0007 },
        { lat: DEFAULT_CENTER.lat - 0.0006, lng: DEFAULT_CENTER.lng + 0.0013 },
        demoEnd,
      ]),
      summary: {
        stairsCount: routeComparison.accessible.stairsCount,
        steepSectionCount: routeComparison.accessible.steepSectionCount,
        unsafeCrossingCount: routeComparison.accessible.unsafeCrossingCount,
      },
    },
  ],
};

export function createMockRouteResponse(start: LatLngPoint, end: LatLngPoint): RouteResponse {
  return {
    routes: [
      {
        routeType: "shortest",
        distanceM: routeComparison.shortest.distanceM,
        durationMin: routeComparison.shortest.durationMin,
        burdenScore: routeComparison.shortest.burdenScore,
        geometry: createMockRouteLine(start, end, 0.00025),
        summary: {
          stairsCount: routeComparison.shortest.stairsCount,
          steepSectionCount: routeComparison.shortest.steepSectionCount,
          unsafeCrossingCount: routeComparison.shortest.unsafeCrossingCount,
        },
      },
      {
        routeType: "accessible",
        distanceM: routeComparison.accessible.distanceM,
        durationMin: routeComparison.accessible.durationMin,
        burdenScore: routeComparison.accessible.burdenScore,
        geometry: createMockRouteLine(start, end, 0.0011),
        summary: {
          stairsCount: routeComparison.accessible.stairsCount,
          steepSectionCount: routeComparison.accessible.steepSectionCount,
          unsafeCrossingCount: routeComparison.accessible.unsafeCrossingCount,
        },
      },
    ],
  };
}
