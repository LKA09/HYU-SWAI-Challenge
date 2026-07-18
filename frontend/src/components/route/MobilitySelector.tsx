"use client";

import { Accessibility, Baby, Footprints, PersonStanding } from "lucide-react";
import type { ComponentType } from "react";
import type { MobilityMode } from "@/src/types/route";

type MobilityOption = {
  key: MobilityMode;
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

const options: MobilityOption[] = [
  {
    key: "wheelchair",
    label: "휠체어",
    description: "계단과 턱을 강하게 피합니다.",
    Icon: Accessibility,
  },
  {
    key: "walker",
    label: "보행 보조기",
    description: "보도 폭과 노면을 중요하게 봅니다.",
    Icon: PersonStanding,
  },
  {
    key: "stroller",
    label: "유모차",
    description: "완만하고 끊김 없는 길을 우선합니다.",
    Icon: Baby,
  },
  {
    key: "walking",
    label: "도보",
    description: "일반 보행 기준으로 탐색합니다.",
    Icon: Footprints,
  },
];

type MobilitySelectorProps = {
  value: MobilityMode;
  onChange: (value: MobilityMode) => void;
};

export function MobilitySelector({ value, onChange }: MobilitySelectorProps) {
  return (
    <section aria-labelledby="mobility-heading" className="space-y-3">
      <h2 id="mobility-heading" className="text-base font-bold text-slate-950">
        이동 방식
      </h2>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="이동 방식">
        {options.map(({ key, label, description, Icon }) => {
          const selected = value === key;

          return (
            <button
              aria-checked={selected}
              className={`min-h-24 rounded-md border p-3 text-left transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:min-h-28 ${
                selected
                  ? "border-teal-800 bg-teal-50 text-teal-950 ring-2 ring-teal-800"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              key={key}
              onClick={() => onChange(key)}
              role="radio"
              type="button"
            >
              <span className="flex items-center gap-2 font-bold">
                <Icon size={19} aria-hidden={true} />
                {label}
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-700">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
