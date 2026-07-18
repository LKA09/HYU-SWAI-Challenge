import type { LatLngPoint } from "@/src/types/geo";

export type PlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  position: LatLngPoint;
  category?: string;
};
