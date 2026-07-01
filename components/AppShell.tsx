"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyFilters,
  DEFAULT_FILTERS,
  rankByUrgency,
  sortByDistance,
  type Filters,
  type RankedSpot,
} from "@/lib/filters";
import { haversineMeters } from "@/lib/geo";
import { nolaTime } from "@/lib/hours";
import { NOLA_CENTER } from "@/lib/constants";
import { SPOTS } from "@/lib/spots";
import type { LatLng, LocalTime } from "@/lib/types";
import AboutModal from "./AboutModal";
import EmergencyButton from "./EmergencyButton";
import FilterBar from "./FilterBar";
import Header from "./Header";
import SpotDetail, { type OriginKind } from "./SpotDetail";
import SpotList, { type SpotListItem } from "./SpotList";
import { ChevronIcon } from "./icons";
import { useNolaTime } from "./useNolaTime";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-night-950 text-sm text-ink-500">
      Pouring the map…
    </div>
  ),
});

interface EmergencyState {
  ranked: RankedSpot[];
  index: number;
  originKind: OriginKind;
}

/** Deterministic placeholder used only for the pre-hydration render. */
const FALLBACK_TIME: LocalTime = { day: 3, minutes: 720 };
/** Beyond ~25 miles from Jackson Square you are not "in New Orleans" for our purposes. */
const MAX_LOCAL_DISTANCE_M = 40_000;

const GEO_ERROR_MESSAGES: Record<number, string> = {
  1: "Location permission denied — the list still works fine.",
  2: "Couldn't pin down your location — the list still works fine.",
  3: "Location timed out — the list still works fine.",
};

function getPosition(timeoutMs = 8000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(new Error(GEO_ERROR_MESSAGES[err.code] ?? "Could not determine your location.")),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export default function AppShell() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useNolaTime();
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<EmergencyState | null>(null);
  const [finding, setFinding] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mapCenterRef = useRef<LatLng>(NOLA_CENTER);
  // "Near me" and "GOTTA GEAUX" both geolocate; the newest request wins and
  // a superseded one must never apply its result.
  const geoSeqRef = useRef(0);

  const filtered = useMemo(
    () => applyFilters(SPOTS, filters, now ?? FALLBACK_TIME),
    [filters, now],
  );

  const selectedSpot = useMemo(
    () => SPOTS.find((spot) => spot.id === selectedId) ?? null,
    [selectedId],
  );

  // Markers show the filtered set, plus the selected spot even if filtered out.
  const visibleSpots = useMemo(() => {
    if (selectedSpot && !filtered.some((spot) => spot.id === selectedSpot.id)) {
      return [...filtered, selectedSpot];
    }
    return filtered;
  }, [filtered, selectedSpot]);

  const listItems = useMemo<SpotListItem[]>(() => {
    if (userLoc) return sortByDistance(filtered, userLoc);
    return filtered.map((spot) => ({ spot, meters: null }));
  }, [filtered, userLoc]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    setEmergency(null);
    if (id) setSheetOpen(true);
  }, []);

  const handleMoveEnd = useCallback((center: LatLng) => {
    mapCenterRef.current = center;
  }, []);

  const locate = useCallback(async () => {
    if (locating) return;
    const seq = ++geoSeqRef.current;
    setLocating(true);
    setLocationError(null);
    try {
      const loc = await getPosition();
      if (seq !== geoSeqRef.current) return; // superseded by a newer request
      if (haversineMeters(loc, NOLA_CENTER) > MAX_LOCAL_DISTANCE_M) {
        setUserLoc(null);
        setLocationError("You don't seem to be in New Orleans yet — showing the full list.");
      } else {
        setUserLoc(loc);
      }
    } catch (error: unknown) {
      if (seq !== geoSeqRef.current) return;
      setLocationError(
        error instanceof Error ? error.message : "Could not determine your location.",
      );
    } finally {
      setLocating(false);
    }
  }, [locating]);

  const gottaGeaux = useCallback(async () => {
    if (finding) return;
    const seq = ++geoSeqRef.current;
    setFinding(true);
    let origin = mapCenterRef.current;
    let originKind: OriginKind = "map";
    try {
      const loc = await getPosition(6000);
      if (seq !== geoSeqRef.current) {
        setFinding(false);
        return; // superseded by a newer request
      }
      if (haversineMeters(loc, NOLA_CENTER) <= MAX_LOCAL_DISTANCE_M) {
        origin = loc;
        originKind = "gps";
        setUserLoc(loc);
      } else {
        originKind = "remote";
      }
    } catch {
      // Denied or timed out — rank from the current map view instead.
      if (seq !== geoSeqRef.current) {
        setFinding(false);
        return;
      }
    }
    const ranked = rankByUrgency(SPOTS, origin, now ?? nolaTime());
    if (ranked.length > 0) {
      setEmergency({ ranked, index: 0, originKind });
      setSelectedId(ranked[0].spot.id);
      setSheetOpen(true);
    }
    setFinding(false);
  }, [finding, now]);

  const emergencyNext = useCallback(() => {
    if (!emergency || emergency.index >= emergency.ranked.length - 1) return;
    const index = emergency.index + 1;
    setEmergency({ ...emergency, index });
    setSelectedId(emergency.ranked[index].spot.id);
  }, [emergency]);

  // Only surface the emergency banner while the emergency pick is selected.
  const emergencyCurrent =
    emergency && emergency.ranked[emergency.index]?.spot.id === selectedId ? emergency : null;

  const detailMeters = emergencyCurrent
    ? emergencyCurrent.ranked[emergencyCurrent.index].meters
    : selectedSpot && userLoc
      ? haversineMeters(userLoc, selectedSpot)
      : null;

  const sheetLabel = selectedSpot
    ? selectedSpot.name
    : `${listItems.length} spot${listItems.length === 1 ? "" : "s"}`;

  return (
    <div className="flex h-dvh flex-col">
      <Header onAboutOpen={() => setAboutOpen(true)} />
      <FilterBar
        filters={filters}
        onChange={setFilters}
        shown={filtered.length}
        total={SPOTS.length}
      />

      <div className="relative flex min-h-0 flex-1">
        <aside className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-night-600 bg-night-900/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md md:static md:z-auto md:h-full md:w-[400px] md:shrink-0 md:rounded-none md:border-r md:border-t-0 md:bg-night-900 md:pb-0 md:shadow-none md:backdrop-blur-none">
          {/* Mobile: rides the top edge of the bottom sheet. */}
          <EmergencyButton
            onClick={gottaGeaux}
            finding={finding}
            className="absolute -top-16 right-4 md:hidden"
          />
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            className="flex flex-col items-center gap-1 px-4 pb-2 pt-2 md:hidden"
          >
            <span className="h-1 w-9 rounded-full bg-night-600" aria-hidden="true" />
            <span className="flex max-w-full items-center gap-1.5 text-sm font-medium text-ink-300">
              <span className="truncate">{sheetLabel}</span>
              <ChevronIcon
                className={`h-4 w-4 shrink-0 transition-transform ${sheetOpen ? "" : "rotate-180"}`}
              />
            </span>
          </button>

          <div
            className={`min-h-0 overflow-y-auto transition-[max-height] duration-300 ease-out md:max-h-none md:flex-1 ${
              sheetOpen ? "max-h-[48dvh]" : "max-h-0"
            }`}
          >
            {selectedSpot ? (
              <SpotDetail
                key={selectedSpot.id}
                spot={selectedSpot}
                now={now}
                meters={detailMeters}
                emergency={
                  emergencyCurrent
                    ? {
                        meters: emergencyCurrent.ranked[emergencyCurrent.index].meters,
                        rank: emergencyCurrent.index + 1,
                        openCount: emergencyCurrent.ranked.filter((r) => r.open).length,
                        originKind: emergencyCurrent.originKind,
                        hasNext:
                          emergencyCurrent.index < emergencyCurrent.ranked.length - 1,
                        onNext: emergencyNext,
                      }
                    : null
                }
                onBack={() => handleSelect(null)}
              />
            ) : (
              <SpotList
                items={listItems}
                now={now}
                onSelect={handleSelect}
                hasLocation={userLoc !== null}
                locating={locating}
                locationError={locationError}
                onLocate={locate}
                onReset={() => setFilters(DEFAULT_FILTERS)}
              />
            )}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <MapView
            spots={visibleSpots}
            selectedSpot={selectedSpot}
            userLoc={userLoc}
            onSelect={handleSelect}
            onMoveEnd={handleMoveEnd}
          />
        </div>

        {/* Desktop: floats in the map corner. */}
        <EmergencyButton
          onClick={gottaGeaux}
          finding={finding}
          className="absolute bottom-6 right-5 z-30 hidden md:flex"
        />
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
