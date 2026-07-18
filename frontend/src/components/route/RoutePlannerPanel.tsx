"use client";

import { Navigation } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { BodyProfileAssistant } from "@/src/components/route/BodyProfileAssistant";
import { LocationSelector } from "@/src/components/route/LocationSelector";
import { MobilitySelector } from "@/src/components/route/MobilitySelector";
import type { CriteriaWeights } from "@/src/types/ahp";
import type { LatLngPoint } from "@/src/types/geo";
import type { BodyProfileRecommendation } from "@/src/types/profile";
import type { MobilityMode, RouteStatus } from "@/src/types/route";

type RoutePlannerPanelProps = {
  start: LatLngPoint | null;
  end: LatLngPoint | null;
  mobilityMode: MobilityMode;
  weights: CriteriaWeights;
  status: RouteStatus;
  onLocationSelect: (mode: "start" | "end", point: LatLngPoint) => void;
  onSwap: () => void;
  onReset: () => void;
  onMobilityModeChange: (mode: MobilityMode) => void;
  onApplyBodyProfile: (recommendation: BodyProfileRecommendation) => void;
  onFindRoute: () => void;
};

export function RoutePlannerPanel({
  start,
  end,
  mobilityMode,
  weights,
  status,
  onLocationSelect,
  onSwap,
  onReset,
  onMobilityModeChange,
  onApplyBodyProfile,
  onFindRoute,
}: RoutePlannerPanelProps) {
  const canSearch = Boolean(start && end) && status !== "loading";

  return (
    <aside className="flex h-full max-h-[58dvh] flex-col bg-white lg:max-h-none">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-800">
          Steping Route
        </p>
        <h1 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
          디딤돌
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          주소를 검색하고 몸 상태를 입력하면 부담이 낮은 경로를 찾아드립니다.
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
        <LocationSelector
          end={end}
          onLocationSelect={onLocationSelect}
          onReset={onReset}
          onSwap={onSwap}
          start={start}
        />
        <MobilitySelector onChange={onMobilityModeChange} value={mobilityMode} />
        <BodyProfileAssistant
          mobilityMode={mobilityMode}
          onApply={onApplyBodyProfile}
          weights={weights}
        />
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
        <Button
          className="w-full text-base"
          disabled={!canSearch}
          onClick={onFindRoute}
          variant="primary"
        >
          <Navigation size={19} aria-hidden="true" />
          {status === "loading" ? "계산 중" : "경로 찾기"}
        </Button>
        {!start ? (
          <p className="mt-2 text-center text-sm font-semibold text-slate-700">
            출발지를 먼저 선택하세요.
          </p>
        ) : null}
        {start && !end ? (
          <p className="mt-2 text-center text-sm font-semibold text-slate-700">
            목적지를 선택하면 경로 찾기를 사용할 수 있습니다.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
