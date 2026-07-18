export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type BarrierType =
  | "stairs"
  | "steep-slope"
  | "damaged-sidewalk"
  | "narrow-sidewalk"
  | "unsignalized-crossing"
  | "curb-obstacle";

export type RiskLevel = "낮음" | "보통" | "높음";

export type AccessibilityBarrier = {
  id: string;
  type: BarrierType;
  label: string;
  position: LatLngPoint;
  riskLevel: RiskLevel;
  description: string;
  recommendation: string;
};
