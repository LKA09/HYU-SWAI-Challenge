import { NextResponse } from "next/server";
import type { CriteriaWeights, CriterionKey } from "@/src/types/ahp";
import type { MobilityMode } from "@/src/types/route";
import type {
  BodyProfileRecommendation,
  BodyProfileRequest,
} from "@/src/types/profile";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.5-flash";
const CRITERIA_KEYS: CriterionKey[] = [
  "distance",
  "slope",
  "stairs",
  "sidewalk",
  "crossing",
];

function clampWeight(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeRecommendation(
  recommendation: Partial<BodyProfileRecommendation>,
  fallback: BodyProfileRequest,
): BodyProfileRecommendation {
  const weights = recommendation.weights ?? fallback.currentWeights;

  return {
    mobilityMode: isMobilityMode(recommendation.mobilityMode)
      ? recommendation.mobilityMode
      : fallback.currentMode,
    weights: {
      distance: clampWeight(weights.distance),
      slope: clampWeight(weights.slope),
      stairs: clampWeight(weights.stairs),
      sidewalk: clampWeight(weights.sidewalk),
      crossing: clampWeight(weights.crossing),
    },
    summary:
      typeof recommendation.summary === "string" && recommendation.summary.trim()
        ? recommendation.summary
        : "입력한 상태를 바탕으로 부담 요소를 보수적으로 조정했습니다.",
    reasons: Array.isArray(recommendation.reasons)
      ? recommendation.reasons.slice(0, 4).filter((reason) => typeof reason === "string")
      : ["경사, 계단, 보도 품질처럼 이동 부담에 직접 영향을 주는 요소를 우선했습니다."],
    cautions: Array.isArray(recommendation.cautions)
      ? recommendation.cautions.slice(0, 3).filter((caution) => typeof caution === "string")
      : ["이 추천은 의료 판단이 아니며, 실제 이동 전 본인 상태와 현장 상황을 확인하세요."],
  };
}

function isMobilityMode(value: unknown): value is MobilityMode {
  return (
    value === "wheelchair" ||
    value === "walker" ||
    value === "stroller" ||
    value === "walking"
  );
}

function isCriteriaWeights(value: unknown): value is CriteriaWeights {
  if (!value || typeof value !== "object") {
    return false;
  }

  const weights = value as Partial<CriteriaWeights>;
  return CRITERIA_KEYS.every((key) => typeof weights[key] === "number");
}

function parseBodyProfileRequest(value: unknown): BodyProfileRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const request = value as Partial<BodyProfileRequest>;
  if (
    typeof request.description !== "string" ||
    request.description.trim().length < 2 ||
    !isMobilityMode(request.currentMode) ||
    !isCriteriaWeights(request.currentWeights)
  ) {
    return null;
  }

  return {
    description: request.description.slice(0, 900),
    currentMode: request.currentMode,
    currentWeights: request.currentWeights,
  };
}

function heuristicAnalyze(request: BodyProfileRequest): BodyProfileRecommendation {
  const text = request.description.toLowerCase();
  const weights: CriteriaWeights = { ...request.currentWeights };
  let mobilityMode = request.currentMode;
  const reasons: string[] = [];

  const add = (key: CriterionKey, amount: number, reason: string) => {
    weights[key] = clampWeight(weights[key] + amount);
    if (!reasons.includes(reason)) {
      reasons.push(reason);
    }
  };

  if (/(무릎|관절|다리|발목|허리|통증|아프|pain|knee|back)/i.test(text)) {
    add("slope", 25, "통증이나 관절 부담이 언급되어 경사 회피 비중을 높였습니다.");
    add("stairs", 25, "계단과 턱은 통증을 악화시킬 수 있어 회피 비중을 높였습니다.");
    mobilityMode = mobilityMode === "walking" ? "walker" : mobilityMode;
  }

  if (/(휠체어|wheelchair)/i.test(text)) {
    mobilityMode = "wheelchair";
    add("stairs", 35, "휠체어 이동에는 계단과 턱 회피가 가장 중요합니다.");
    add("sidewalk", 20, "휠체어 이동 안정성을 위해 보도 품질 비중을 높였습니다.");
  }

  if (/(유모차|stroller|아이|아기)/i.test(text)) {
    mobilityMode = "stroller";
    add("stairs", 25, "유모차 이동은 계단 없는 동선이 중요합니다.");
    add("sidewalk", 20, "유모차 바퀴 안정성을 위해 보도 품질 비중을 높였습니다.");
  }

  if (/(시각|저시력|밤|어두|cross|횡단|신호)/i.test(text)) {
    add("crossing", 30, "시야나 횡단 안전 관련 표현이 있어 안전한 횡단 비중을 높였습니다.");
  }

  if (/(피곤|숨|호흡|체력|천천히|지침|fatigue|breath)/i.test(text)) {
    add("distance", 15, "피로와 체력 부담이 언급되어 이동 거리 비중을 높였습니다.");
    add("slope", 15, "체력 부담을 줄이기 위해 급경사 회피 비중을 함께 높였습니다.");
  }

  if (reasons.length === 0) {
    add("slope", 10, "명확한 제약이 적어도 보행 부담을 줄이도록 경사 비중을 조금 높였습니다.");
    add("sidewalk", 10, "일반 보행 안정성을 위해 보도 품질 비중을 조금 높였습니다.");
  }

  return {
    mobilityMode,
    weights,
    summary: "입력한 몸 상태를 바탕으로 경로 선호도를 조정했습니다.",
    reasons,
    cautions: [
      "이 추천은 의료 진단이 아니라 경로 탐색 기준 조정입니다.",
      "실제 이동 전 현장 공사, 날씨, 통행 제한을 확인하세요.",
    ],
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text;
}

async function analyzeWithGemini(request: BodyProfileRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const prompt = `
사용자의 이동 관련 몸 상태 설명을 분석해서 무장애 보행 경로 탐색 가중치를 추천하세요.
의료 진단을 하지 말고, 경로 탐색 기준 조정만 제안하세요.

반드시 아래 JSON 형식만 반환하세요.
{
  "mobilityMode": "wheelchair" | "walker" | "stroller" | "walking",
  "weights": {
    "distance": 0-100,
    "slope": 0-100,
    "stairs": 0-100,
    "sidewalk": 0-100,
    "crossing": 0-100
  },
  "summary": "짧은 한국어 요약",
  "reasons": ["추천 이유 1", "추천 이유 2"],
  "cautions": ["주의 문구"]
}

현재 이동 방식: ${request.currentMode}
현재 가중치: ${JSON.stringify(request.currentWeights)}
사용자 설명: ${request.description}
`;

  const response = await fetch(
    `${GEMINI_ENDPOINT}/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini 분석 요청이 실패했습니다. 상태 코드: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  return JSON.parse(extractJson(text)) as Partial<BodyProfileRecommendation>;
}

export async function POST(request: Request) {
  const parsed = parseBodyProfileRequest(await request.json().catch(() => null));

  if (!parsed) {
    return NextResponse.json(
      { message: "몸 상태 설명과 현재 설정을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const geminiRecommendation = await analyzeWithGemini(parsed);
    return NextResponse.json(
      normalizeRecommendation(geminiRecommendation ?? heuristicAnalyze(parsed), parsed),
    );
  } catch {
    return NextResponse.json(normalizeRecommendation(heuristicAnalyze(parsed), parsed));
  }
}
