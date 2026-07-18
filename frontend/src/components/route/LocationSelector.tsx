"use client";

import { ArrowUpDown, Loader2, MapPin, RotateCcw, Search } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { searchPlaces } from "@/src/lib/api/placeSearchClient";
import { formatCoordinate } from "@/src/lib/geo/geojson";
import type { LatLngPoint } from "@/src/types/geo";
import type { PlaceSearchResult } from "@/src/types/place";

type LocationSelectorProps = {
  start: LatLngPoint | null;
  end: LatLngPoint | null;
  onLocationSelect: (mode: "start" | "end", point: LatLngPoint) => void;
  onSwap: () => void;
  onReset: () => void;
};

type SearchState = {
  query: string;
  results: PlaceSearchResult[];
  status: "idle" | "loading" | "error";
  errorMessage: string | null;
};

const emptySearchState: SearchState = {
  query: "",
  results: [],
  status: "idle",
  errorMessage: null,
};

export function LocationSelector({
  start,
  end,
  onLocationSelect,
  onSwap,
  onReset,
}: LocationSelectorProps) {
  const [startSearch, setStartSearch] = useState<SearchState>(emptySearchState);
  const [endSearch, setEndSearch] = useState<SearchState>(emptySearchState);
  const abortRef = useRef<AbortController | null>(null);

  function setSearchState(mode: "start" | "end", nextState: SearchState) {
    if (mode === "start") {
      setStartSearch(nextState);
      return;
    }

    setEndSearch(nextState);
  }

  async function handleSearch(mode: "start" | "end") {
    const state = mode === "start" ? startSearch : endSearch;
    if (state.query.trim().length < 2) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearchState(mode, {
      ...state,
      status: "loading",
      errorMessage: null,
    });

    try {
      const results = await searchPlaces(state.query, controller.signal);
      setSearchState(mode, {
        ...state,
        results,
        status: "idle",
        errorMessage: results.length === 0 ? "검색 결과가 없습니다. 장소명을 조금 더 구체적으로 입력해 주세요." : null,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setSearchState(mode, {
        ...state,
        results: [],
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "장소 검색 중 문제가 발생했습니다.",
      });
    }
  }

  function handlePick(mode: "start" | "end", place: PlaceSearchResult) {
    onLocationSelect(mode, place.position);
    setSearchState(mode, {
      query: place.name,
      results: [],
      status: "idle",
      errorMessage: null,
    });
  }

  return (
    <section aria-labelledby="location-heading" className="space-y-4">
      <div>
        <h2 id="location-heading" className="text-base font-bold text-slate-950">
          출발지와 목적지
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          장소명을 검색한 뒤 결과에서 출발지와 목적지를 선택하세요.
        </p>
      </div>

      <PlaceSearchBox
        label="출발 위치"
        mode="start"
        onPick={handlePick}
        onQueryChange={(query) =>
          setStartSearch({ ...startSearch, query, errorMessage: null })
        }
        onSearch={handleSearch}
        point={start}
        search={startSearch}
      />

      <PlaceSearchBox
        label="목적지"
        mode="end"
        onPick={handlePick}
        onQueryChange={(query) => setEndSearch({ ...endSearch, query, errorMessage: null })}
        onSearch={handleSearch}
        point={end}
        search={endSearch}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button disabled={!start && !end} onClick={onSwap}>
          <ArrowUpDown size={18} aria-hidden="true" />
          바꾸기
        </Button>
        <Button disabled={!start && !end} onClick={onReset} variant="danger">
          <RotateCcw size={18} aria-hidden="true" />
          초기화
        </Button>
      </div>
    </section>
  );
}

type PlaceSearchBoxProps = {
  label: string;
  mode: "start" | "end";
  point: LatLngPoint | null;
  search: SearchState;
  onQueryChange: (query: string) => void;
  onSearch: (mode: "start" | "end") => void;
  onPick: (mode: "start" | "end", place: PlaceSearchResult) => void;
};

function PlaceSearchBox({
  label,
  mode,
  point,
  search,
  onQueryChange,
  onSearch,
  onPick,
}: PlaceSearchBoxProps) {
  const inputId = `${mode}-place-search`;

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <label className="grid gap-2 text-sm font-semibold text-slate-800" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-teal-700"
          id={inputId}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch(mode);
            }
          }}
          placeholder={mode === "start" ? "예: 대전역" : "예: 충남대학교"}
          value={search.query}
        />
        <Button
          aria-label={`${label} 검색`}
          className="px-3"
          disabled={search.query.trim().length < 2 || search.status === "loading"}
          onClick={() => onSearch(mode)}
        >
          {search.status === "loading" ? (
            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
        </Button>
      </div>

      <p className="text-xs font-semibold text-slate-600">
        {point ? formatCoordinate(point) : "아직 선택된 위치가 없습니다."}
      </p>

      {search.errorMessage ? (
        <p className="rounded bg-amber-50 p-2 text-sm font-semibold text-amber-900">
          {search.errorMessage}
        </p>
      ) : null}

      {search.results.length > 0 ? (
        <ul className="space-y-2" aria-label={`${label} 검색 결과`}>
          {search.results.map((place) => (
            <li key={place.id}>
              <button
                className="flex w-full items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                onClick={() => onPick(mode, place)}
                type="button"
              >
                <MapPin className="mt-0.5 shrink-0 text-teal-800" size={17} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold text-slate-950">{place.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-700">
                    {place.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
