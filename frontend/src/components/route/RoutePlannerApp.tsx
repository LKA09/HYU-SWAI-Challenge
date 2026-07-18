"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { RoutePlannerPanel } from "@/src/components/route/RoutePlannerPanel";
import { RouteResultCard } from "@/src/components/route/RouteResultCard";
import { initialWeights } from "@/src/data/mockRoutes";
import { requestRoutes } from "@/src/lib/api/routingClient";
import type { CriteriaWeights } from "@/src/types/ahp";
import type { LatLngPoint } from "@/src/types/geo";
import type { MobilityMode, RouteResponse, RouteStatus } from "@/src/types/route";

const AccessibleMap = dynamic(
  () => import("@/src/components/map/AccessibleMap").then((mod) => mod.AccessibleMap),
  {
    loading: () => (
      <div className="grid h-full min-h-[420px] place-items-center bg-slate-100 text-sm font-bold text-slate-700">
        지도를 불러오는 중입니다.
      </div>
    ),
    ssr: false,
  },
);

function nextSelectionMode(start: LatLngPoint | null, end: LatLngPoint | null) {
  if (!start) {
    return "start";
  }
  if (!end) {
    return "end";
  }
  return "start";
}

export function RoutePlannerApp() {
  const [start, setStart] = useState<LatLngPoint | null>(null);
  const [end, setEnd] = useState<LatLngPoint | null>(null);
  const [mobilityMode, setMobilityMode] = useState<MobilityMode>("wheelchair");
  const [weights, setWeights] = useState<CriteriaWeights>(initialWeights);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [routeResponse, setRouteResponse] = useState<RouteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetRoutes = useCallback(() => {
    abortControllerRef.current?.abort();
    setRouteResponse(null);
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const handleLocationSelect = useCallback(
    (mode: "start" | "end", point: LatLngPoint) => {
      resetRoutes();
      if (mode === "start") {
        setStart(point);
        return;
      }

      setEnd(point);
    },
    [resetRoutes],
  );

  const handleSwap = useCallback(() => {
    resetRoutes();
    setStart(end);
    setEnd(start);
    nextSelectionMode(end, start);
  }, [end, resetRoutes, start]);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    setStart(null);
    setEnd(null);
    setRouteResponse(null);
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const findRoute = useCallback(async () => {
    if (!start) {
      setStatus("missing-start");
      return;
    }

    if (!end) {
      setStatus("missing-end");
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await requestRoutes(
        {
          start,
          end,
          mobilityMode,
          weights,
        },
        controller.signal,
      );

      setRouteResponse(response);
      setStatus(response.routes.length > 0 ? "success" : "no-route");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setRouteResponse(null);
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
      setStatus("error");
    }
  }, [end, mobilityMode, start, weights]);

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <div className="grid min-h-dvh grid-rows-[minmax(360px,52dvh)_auto_auto] lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-1">
        <div className="order-2 border-t border-slate-300 bg-white shadow-2xl lg:order-1 lg:h-dvh lg:border-r lg:border-t-0 lg:shadow-none">
          <RoutePlannerPanel
            end={end}
            mobilityMode={mobilityMode}
            onApplyBodyProfile={(recommendation) => {
              resetRoutes();
              setMobilityMode(recommendation.mobilityMode);
              setWeights(recommendation.weights);
            }}
            onFindRoute={findRoute}
            onLocationSelect={handleLocationSelect}
            onMobilityModeChange={(mode) => {
              resetRoutes();
              setMobilityMode(mode);
            }}
            onReset={handleReset}
            onSwap={handleSwap}
            start={start}
            status={status}
            weights={weights}
          />
        </div>

        <section
          aria-label="지도와 경로 결과"
          className="relative order-1 min-h-[360px] lg:order-2 lg:min-h-dvh"
        >
          <AccessibleMap end={end} response={routeResponse} start={start} />

          <div className="absolute right-3 top-20 z-[600] hidden w-[min(420px,calc(100%-1.5rem))] lg:block">
            <RouteResultCard
              errorMessage={errorMessage}
              onRetry={findRoute}
              response={routeResponse}
              status={status}
            />
          </div>

          <div className="absolute right-3 top-3 z-[600]">
            <Button
              aria-label="선택 초기화"
              className="px-3 shadow-md"
              disabled={!start && !end}
              onClick={handleReset}
            >
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
          </div>
        </section>

        <div className="order-3 border-t border-slate-200 bg-slate-100 p-3 lg:hidden">
          <RouteResultCard
            errorMessage={errorMessage}
            onRetry={findRoute}
            response={routeResponse}
            status={status}
          />
        </div>
      </div>
    </main>
  );
}
