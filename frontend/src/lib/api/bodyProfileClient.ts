import type {
  BodyProfileRecommendation,
  BodyProfileRequest,
} from "@/src/types/profile";

function isBodyProfileRecommendation(value: unknown): value is BodyProfileRecommendation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const recommendation = value as Partial<BodyProfileRecommendation>;
  const weights = recommendation.weights;

  return (
    typeof recommendation.summary === "string" &&
    Array.isArray(recommendation.reasons) &&
    Array.isArray(recommendation.cautions) &&
    (recommendation.mobilityMode === "wheelchair" ||
      recommendation.mobilityMode === "walker" ||
      recommendation.mobilityMode === "stroller" ||
      recommendation.mobilityMode === "walking") &&
    Boolean(weights) &&
    typeof weights?.distance === "number" &&
    typeof weights.slope === "number" &&
    typeof weights.stairs === "number" &&
    typeof weights.sidewalk === "number" &&
    typeof weights.crossing === "number"
  );
}

export async function analyzeBodyProfile(
  request: BodyProfileRequest,
  signal?: AbortSignal,
): Promise<BodyProfileRecommendation> {
  const response = await fetch("/api/body-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error("몸 상태 분석 요청에 실패했습니다.");
  }

  const data = (await response.json()) as unknown;
  if (!isBodyProfileRecommendation(data)) {
    throw new Error("분석 결과 형식이 올바르지 않습니다.");
  }

  return data;
}
