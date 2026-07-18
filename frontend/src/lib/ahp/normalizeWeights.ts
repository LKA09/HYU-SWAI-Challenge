import type { CriteriaWeights, CriterionKey } from "@/src/types/ahp";

const CRITERION_KEYS: CriterionKey[] = [
  "distance",
  "slope",
  "stairs",
  "sidewalk",
  "crossing",
];

export function normalizeWeights(weights: CriteriaWeights): CriteriaWeights {
  const total = CRITERION_KEYS.reduce((sum, key) => sum + weights[key], 0);

  if (total <= 0) {
    const equalShare = 100 / CRITERION_KEYS.length;
    return Object.fromEntries(
      CRITERION_KEYS.map((key) => [key, equalShare]),
    ) as CriteriaWeights;
  }

  return Object.fromEntries(
    CRITERION_KEYS.map((key) => [key, (weights[key] / total) * 100]),
  ) as CriteriaWeights;
}

export function formatNormalizedPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
