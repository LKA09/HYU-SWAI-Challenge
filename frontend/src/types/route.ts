import type { CriteriaWeights } from "@/src/types/ahp";
import type { LatLngPoint } from "@/src/types/geo";

export type MobilityMode = "wheelchair" | "walker" | "stroller" | "walking";

export type RouteType = "shortest" | "accessible";

export type RouteStatus =
  | "idle"
  | "missing-start"
  | "missing-end"
  | "loading"
  | "success"
  | "no-route"
  | "error";

export type RouteRequest = {
  start: LatLngPoint;
  end: LatLngPoint;
  mobilityMode: MobilityMode;
  weights: CriteriaWeights;
};

export type RouteResponseRoute = {
  routeType: RouteType;
  distanceM: number;
  durationMin: number;
  burdenScore: number;
  geometry: GeoJSON.LineString;
  summary: {
    stairsCount: number;
    steepSectionCount: number;
    unsafeCrossingCount: number;
  };
};

export type RouteResponse = {
  routes: RouteResponseRoute[];
};

export type RouteComparisonItem = {
  distanceM: number;
  durationMin: number;
  burdenScore: number;
  stairsCount: number;
  steepSectionCount: number;
  unsafeCrossingCount: number;
};

export type RouteComparison = {
  shortest: RouteComparisonItem;
  accessible: RouteComparisonItem;
};
