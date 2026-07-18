"use client";

import { AlertTriangle, CheckCircle2, Loader2, Route } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import type { RouteResponse, RouteResponseRoute, RouteStatus } from "@/src/types/route";

type RouteResultCardProps = {
  status: RouteStatus;
  response: RouteResponse | null;
  errorMessage: string | null;
  onRetry: () => void;
};

const routeLabels = {
  shortest: "최단 경로",
  accessible: "맞춤 경로",
} as const;

function routeTone(routeType: RouteResponseRoute["routeType"]) {
  return routeType === "accessible"
    ? "border-teal-700 bg-teal-50"
    : "border-slate-300 bg-white";
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/85 p-2">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function RouteSummary({ route }: { route: RouteResponseRoute }) {
  return (
    <article className={`rounded-md border p-3 ${routeTone(route.routeType)}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <Route size={18} aria-hidden="true" />
          {routeLabels[route.routeType]}
        </h3>
        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">
          부담 {route.burdenScore}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="총 거리" value={`${route.distanceM}m`} />
        <Metric label="예상 시간" value={`${route.durationMin}분`} />
        <Metric label="부담 점수" value={route.burdenScore} />
        <Metric label="계단 수" value={`${route.summary.stairsCount}곳`} />
        <Metric label="급경사 구간" value={`${route.summary.steepSectionCount}곳`} />
        <Metric label="위험 횡단" value={`${route.summary.unsafeCrossingCount}곳`} />
      </dl>
    </article>
  );
}

export function RouteResultCard({
  status,
  response,
  errorMessage,
  onRetry,
}: RouteResultCardProps) {
  const shortest = response?.routes.find((route) => route.routeType === "shortest");
  const accessible = response?.routes.find((route) => route.routeType === "accessible");

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">경로 비교</h2>
          <p className="mt-1 text-sm text-slate-700">부담 점수는 낮을수록 좋습니다.</p>
        </div>
        {status === "success" ? (
          <CheckCircle2 className="text-teal-700" size={22} aria-hidden="true" />
        ) : null}
      </div>

      {status === "idle" || status === "missing-start" || status === "missing-end" ? (
        <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          출발지와 목적지를 선택하면 최단 경로와 맞춤 경로를 비교할 수 있습니다.
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-800">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
          경로를 계산하는 중입니다.
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-4 space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle size={18} aria-hidden="true" />
            경로 계산에 실패했습니다.
          </p>
          <p>{errorMessage ?? "잠시 후 다시 시도해 주세요."}</p>
          <Button onClick={onRetry} variant="danger">
            다시 시도
          </Button>
        </div>
      ) : null}

      {status === "no-route" ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          선택한 조건으로 이동 가능한 경로를 찾지 못했습니다.
        </div>
      ) : null}

      {status === "success" && response ? (
        <div className="mt-4 space-y-3">
          {response.routes.map((route) => (
            <RouteSummary key={route.routeType} route={route} />
          ))}
          {shortest && accessible ? (
            <p className="rounded-md bg-slate-900 p-3 text-sm font-semibold leading-6 text-white">
              맞춤 경로는 {accessible.distanceM - shortest.distanceM}m 더 길지만 부담 점수가{" "}
              {shortest.burdenScore - accessible.burdenScore}점 낮습니다.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
