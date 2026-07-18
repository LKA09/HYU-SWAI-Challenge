import { NextResponse } from "next/server";
import type { PlaceSearchResult } from "@/src/types/place";

const DAEJEON_VIEWBOX = "127.22,36.47,127.51,36.26";

const localPlaces: PlaceSearchResult[] = [
  {
    id: "local-daejeon-station",
    name: "대전역",
    address: "대전광역시 동구 중앙로 215",
    position: { lat: 36.3322, lng: 127.4342 },
    category: "railway_station",
  },
  {
    id: "local-chungnam-national-university",
    name: "충남대학교",
    address: "대전광역시 유성구 대학로 99",
    position: { lat: 36.3684, lng: 127.3457 },
    category: "university",
  },
  {
    id: "local-kaist",
    name: "KAIST",
    address: "대전광역시 유성구 대학로 291",
    position: { lat: 36.3722, lng: 127.3604 },
    category: "university",
  },
  {
    id: "local-daejeon-city-hall",
    name: "대전광역시청",
    address: "대전광역시 서구 둔산로 100",
    position: { lat: 36.3504, lng: 127.3845 },
    category: "public_service",
  },
  {
    id: "local-government-complex",
    name: "정부청사역",
    address: "대전광역시 서구 둔산동",
    position: { lat: 36.3575, lng: 127.3818 },
    category: "subway_station",
  },
  {
    id: "local-yuseong-spa",
    name: "유성온천역",
    address: "대전광역시 유성구 계룡로",
    position: { lat: 36.3537, lng: 127.3417 },
    category: "subway_station",
  },
  {
    id: "local-hanbat-arboretum",
    name: "한밭수목원",
    address: "대전광역시 서구 둔산대로 169",
    position: { lat: 36.3664, lng: 127.3883 },
    category: "park",
  },
];

type NominatimPlace = {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
  };
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/대전광역시|대전시|대전/g, "")
    .replace(/[\s\-_.(),]/g, "")
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function fuzzyScore(query: string, place: PlaceSearchResult) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(place.name);
  const targets = [place.name, place.address, place.category ?? ""]
    .join(" ")
    .split(/[\s,]+/)
    .map(normalizeSearchText)
    .filter(Boolean);
  const fullTarget = normalizeSearchText(`${place.name}${place.address}${place.category ?? ""}`);

  if (!normalizedQuery) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 0;
  }

  if (normalizedQuery.length <= 2) {
    return levenshteinDistance(normalizedQuery, normalizedName);
  }

  if (fullTarget.includes(normalizedQuery)) {
    return 0;
  }

  let best = Number.POSITIVE_INFINITY;
  for (const target of [fullTarget, ...targets]) {
    if (!target) {
      continue;
    }

    if (normalizedQuery.includes(target)) {
      best = Math.min(best, 0);
      continue;
    }

    best = Math.min(best, levenshteinDistance(normalizedQuery, target));

    if (target.length > normalizedQuery.length) {
      for (let start = 0; start <= target.length - normalizedQuery.length; start += 1) {
        const segment = target.slice(start, start + normalizedQuery.length);
        best = Math.min(best, levenshteinDistance(normalizedQuery, segment));
      }
    }
  }

  return best;
}

function searchLocalPlaces(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const maxDistance = Math.max(1, Math.ceil(normalizedQuery.length * 0.34));

  return localPlaces
    .map((place) => ({ place, score: fuzzyScore(query, place) }))
    .filter(({ score }) => score <= maxDistance)
    .sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name, "ko"))
    .map(({ place }) => place);
}

function toPlaceSearchResult(place: NominatimPlace): PlaceSearchResult | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const fallbackName =
    place.address?.road ??
    place.address?.neighbourhood ??
    place.address?.suburb ??
    place.address?.city ??
    place.address?.town ??
    place.display_name.split(",")[0];

  return {
    id: String(place.place_id),
    name: place.name || fallbackName,
    address: place.display_name,
    position: { lat, lng },
    category: place.type || place.class,
  };
}

async function searchNominatim(query: string): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query.includes("대전") ? query : `${query} 대전`,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "kr",
    viewbox: DAEJEON_VIEWBOX,
    bounded: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "BarrierFreeRoute/0.1 contact: local-development",
      Referer: "http://localhost:3000",
    },
  });

  if (!response.ok) {
    throw new Error("Nominatim search failed");
  }

  const places = (await response.json()) as NominatimPlace[];
  return places
    .map(toPlaceSearchResult)
    .filter((place): place is PlaceSearchResult => place !== null);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const localResults = searchLocalPlaces(query);

  try {
    const remoteResults = await searchNominatim(query);
    const merged = [...localResults, ...remoteResults].filter(
      (place, index, places) => places.findIndex((item) => item.id === place.id) === index,
    );
    return NextResponse.json(merged.slice(0, 6));
  } catch {
    return NextResponse.json(localResults.slice(0, 6));
  }
}
