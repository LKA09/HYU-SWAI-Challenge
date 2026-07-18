import { createMockRouteResponse } from "@/src/data/mockRoutes";
import { isInDaejeonBounds } from "@/src/lib/geo/geojson";
import { calculateRoutesFromNetwork } from "@/src/lib/geo/networkRouting";
import type { RouteRequest, RouteResponse, RouteResponseRoute } from "@/src/types/route";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function shouldUseMockApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

function shouldUseBackendApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_BACKEND_API === "true";
}

function isRouteResponseRoute(value: unknown): value is RouteResponseRoute {
  if (!value || typeof value !== "object") {
    return false;
  }

  const route = value as Partial<RouteResponseRoute>;
  return (
    (route.routeType === "shortest" || route.routeType === "accessible") &&
    typeof route.distanceM === "number" &&
    typeof route.durationMin === "number" &&
    typeof route.burdenScore === "number" &&
    route.geometry?.type === "LineString" &&
    Array.isArray(route.geometry.coordinates) &&
    typeof route.summary?.stairsCount === "number" &&
    typeof route.summary.steepSectionCount === "number" &&
    typeof route.summary.unsafeCrossingCount === "number"
  );
}

function parseRouteResponse(value: unknown): RouteResponse {
  if (!value || typeof value !== "object") {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }

  const response = value as Partial<RouteResponse>;
  if (!Array.isArray(response.routes) || !response.routes.every(isRouteResponseRoute)) {
    throw new Error("경로 결과를 읽을 수 없습니다. 응답 스키마를 확인해 주세요.");
  }

  return { routes: response.routes };
}

export async function requestRoutes(
  request: RouteRequest,
  signal?: AbortSignal,
): Promise<RouteResponse> {
  if (!isInDaejeonBounds(request.start) || !isInDaejeonBounds(request.end)) {
    throw new Error("대전광역시 안의 출발지와 목적지만 경로를 계산할 수 있습니다.");
  }

  if (shouldUseMockApi()) {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return createMockRouteResponse(request.start, request.end);
  }

  if (!shouldUseBackendApi()) {
    return calculateRoutesFromNetwork(request, signal);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/routes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error("경로 서버에 연결할 수 없습니다. 백엔드 상태를 확인해 주세요.");
  }

  if (!response.ok) {
    throw new Error(`경로 계산 요청이 실패했습니다. 상태 코드: ${response.status}`);
  }

  try {
    return parseRouteResponse(await response.json());
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("서버 응답을 JSON으로 해석할 수 없습니다.");
  }
}
