import type { PlaceSearchResult } from "@/src/types/place";

function isPlaceSearchResult(value: unknown): value is PlaceSearchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<PlaceSearchResult>;
  return (
    typeof result.id === "string" &&
    typeof result.name === "string" &&
    typeof result.address === "string" &&
    typeof result.position?.lat === "number" &&
    typeof result.position.lng === "number"
  );
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("장소 검색에 실패했습니다.");
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !data.every(isPlaceSearchResult)) {
    throw new Error("장소 검색 결과 형식이 올바르지 않습니다.");
  }

  return data;
}
