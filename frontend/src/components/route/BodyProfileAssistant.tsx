"use client";

import { Brain, Check, Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { analyzeBodyProfile } from "@/src/lib/api/bodyProfileClient";
import type { CriteriaWeights } from "@/src/types/ahp";
import type { BodyProfileRecommendation } from "@/src/types/profile";
import type { MobilityMode } from "@/src/types/route";

type BodyProfileAssistantProps = {
  mobilityMode: MobilityMode;
  weights: CriteriaWeights;
  onApply: (recommendation: BodyProfileRecommendation) => void;
};

const modeLabels: Record<MobilityMode, string> = {
  wheelchair: "휠체어",
  walker: "보행 보조기",
  stroller: "유모차",
  walking: "도보",
};

export function BodyProfileAssistant({
  mobilityMode,
  weights,
  onApply,
}: BodyProfileAssistantProps) {
  const [description, setDescription] = useState("");
  const [recommendation, setRecommendation] = useState<BodyProfileRecommendation | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const canAnalyze = description.trim().length >= 2 && status !== "loading";

  async function handleAnalyze() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const result = await analyzeBodyProfile(
        {
          description,
          currentMode: mobilityMode,
          currentWeights: weights,
        },
        controller.signal,
      );
      setRecommendation(result);
      setStatus("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "분석 중 문제가 발생했습니다.",
      );
      setStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="body-profile-heading"
      className="space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-4"
    >
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-teal-900">
          <Sparkles size={17} aria-hidden="true" />
          맞춤 추천
        </p>
        <h2 id="body-profile-heading" className="mt-1 text-base font-black text-slate-950">
          오늘 몸 상태
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          무릎 통증, 피로, 유모차, 휠체어처럼 이동에 영향을 주는 내용을 적어주세요.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        상태 입력
        <textarea
          className="min-h-20 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-teal-700"
          maxLength={900}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="예: 오늘 무릎이 아파서 계단과 급경사를 피하고 싶어요."
          value={description}
        />
      </label>

      <Button className="w-full" disabled={!canAnalyze} onClick={handleAnalyze} variant="primary">
        {status === "loading" ? (
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
        ) : (
          <Brain size={18} aria-hidden="true" />
        )}
        {status === "loading" ? "분석 중" : "추천 받기"}
      </Button>

      {status === "error" ? (
        <p className="rounded-md border border-red-200 bg-white p-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {recommendation ? (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
          <div>
            <p className="text-sm font-bold text-slate-950">{recommendation.summary}</p>
            <p className="mt-1 text-sm text-slate-700">
              추천 이동 방식: <strong>{modeLabels[recommendation.mobilityMode]}</strong>
            </p>
          </div>

          <ul className="space-y-1 text-sm text-slate-700">
            {recommendation.reasons.slice(0, 3).map((reason) => (
              <li className="flex gap-2" key={reason}>
                <Check className="mt-0.5 shrink-0 text-teal-700" size={16} aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          <p className="rounded bg-amber-50 p-2 text-xs leading-5 text-amber-900">
            {recommendation.cautions[0] ??
              "이 추천은 의료 진단이 아니라 경로 탐색 기준 조정입니다."}
          </p>

          <Button className="w-full" onClick={() => onApply(recommendation)} variant="secondary">
            추천 적용
          </Button>
        </div>
      ) : null}
    </section>
  );
}
