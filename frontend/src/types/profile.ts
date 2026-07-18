import type { CriteriaWeights } from "@/src/types/ahp";
import type { MobilityMode } from "@/src/types/route";

export type BodyProfileRequest = {
  description: string;
  currentMode: MobilityMode;
  currentWeights: CriteriaWeights;
};

export type BodyProfileRecommendation = {
  mobilityMode: MobilityMode;
  weights: CriteriaWeights;
  summary: string;
  reasons: string[];
  cautions: string[];
};
