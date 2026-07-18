export type CriterionKey =
  | "distance"
  | "slope"
  | "stairs"
  | "sidewalk"
  | "crossing";

export type CriteriaWeights = Record<CriterionKey, number>;

export type PairwiseValue = 0.2 | 0.3333333333333333 | 1 | 3 | 5;

export type PairwiseComparison = {
  id: string;
  leftCriterion: CriterionKey;
  rightCriterion: CriterionKey;
  value: PairwiseValue;
};

export type CriterionMeta = {
  key: CriterionKey;
  label: string;
  description: string;
};
