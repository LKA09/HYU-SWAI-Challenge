"use client";

import { AlertTriangle, CircleAlert, Construction, Footprints, ShieldAlert } from "lucide-react";
import { CircleMarker, Popup } from "react-leaflet";
import type { AccessibilityBarrier, BarrierType } from "@/src/types/geo";

type AccessibilityMarkersProps = {
  barriers: AccessibilityBarrier[];
};

const barrierIconText: Record<BarrierType, string> = {
  stairs: "계",
  "steep-slope": "경",
  "damaged-sidewalk": "파",
  "narrow-sidewalk": "폭",
  "unsignalized-crossing": "횡",
  "curb-obstacle": "턱",
};

const riskColor = {
  낮음: "#047857",
  보통: "#b45309",
  높음: "#b91c1c",
};

function PopupIcon({ type }: { type: BarrierType }) {
  const className = "text-slate-800";
  if (type === "stairs" || type === "curb-obstacle") {
    return <Construction className={className} size={18} aria-hidden="true" />;
  }
  if (type === "steep-slope") {
    return <Footprints className={className} size={18} aria-hidden="true" />;
  }
  if (type === "unsignalized-crossing") {
    return <ShieldAlert className={className} size={18} aria-hidden="true" />;
  }
  if (type === "damaged-sidewalk") {
    return <AlertTriangle className={className} size={18} aria-hidden="true" />;
  }

  return <CircleAlert className={className} size={18} aria-hidden="true" />;
}

export function AccessibilityMarkers({ barriers }: AccessibilityMarkersProps) {
  return (
    <>
      {barriers.map((barrier) => (
        <CircleMarker
          center={[barrier.position.lat, barrier.position.lng]}
          key={barrier.id}
          pathOptions={{
            color: riskColor[barrier.riskLevel],
            fillColor: "#fff7ed",
            fillOpacity: 0.95,
            opacity: 1,
            weight: 3,
          }}
          radius={13}
        >
          <Popup>
            <div className="min-w-56 space-y-2 text-sm text-slate-800">
              <p className="flex items-center gap-2 text-base font-bold text-slate-950">
                <PopupIcon type={barrier.type} />
                {barrier.label}
              </p>
              <p>
                <strong>유형:</strong> {barrier.label} ({barrierIconText[barrier.type]})
              </p>
              <p>
                <strong>위험도:</strong> {barrier.riskLevel}
              </p>
              <p>
                <strong>설명:</strong> {barrier.description}
              </p>
              <p>
                <strong>개선 제안:</strong> {barrier.recommendation}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
