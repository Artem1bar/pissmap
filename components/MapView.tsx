"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { CATEGORY_META } from "@/lib/categories";
import { INITIAL_ZOOM, MAP_MAX_BOUNDS, MAP_STYLE_URL, NOLA_CENTER } from "@/lib/constants";
import type { LatLng, Spot } from "@/lib/types";
import { pinSvg } from "./icons";

interface MapViewProps {
  spots: readonly Spot[];
  selectedSpot: Spot | null;
  userLoc: LatLng | null;
  onSelect: (id: string | null) => void;
  onMoveEnd: (center: LatLng) => void;
}

/**
 * MapLibre positions the marker element itself via an inline `transform`, so
 * any CSS transform/animation of ours must live on an inner element — never
 * on the element handed to the Marker, or the pin teleports to the map origin.
 */
function buildPinElement(spot: Spot, onClick: () => void): HTMLDivElement {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pin";
  button.setAttribute("aria-label", spot.name);
  button.innerHTML = pinSvg(CATEGORY_META[spot.category].color);
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  wrapper.appendChild(button);
  return wrapper;
}

function pinButtonOf(marker: maplibregl.Marker): HTMLButtonElement | null {
  return marker.getElement().querySelector("button.pin");
}

export default function MapView({ spots, selectedSpot, userLoc, onSelect, onMoveEnd }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onMoveEndRef = useRef(onMoveEnd);

  // Keep latest callbacks available to map listeners without re-binding them.
  useEffect(() => {
    onSelectRef.current = onSelect;
    onMoveEndRef.current = onMoveEnd;
  });

  // Map lifecycle — created once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [NOLA_CENTER.lng, NOLA_CENTER.lat],
      zoom: INITIAL_ZOOM,
      maxBounds: [
        [MAP_MAX_BOUNDS[0], MAP_MAX_BOUNDS[1]],
        [MAP_MAX_BOUNDS[2], MAP_MAX_BOUNDS[3]],
      ],
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", () => onSelectRef.current(null));
    map.on("moveend", () => {
      const c = map.getCenter();
      onMoveEndRef.current({ lat: c.lat, lng: c.lng });
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      // Handle for dev tooling / QA scripts.
      (window as unknown as { __pissmap?: maplibregl.Map }).__pissmap = map;
    }
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = new Map();
      userMarkerRef.current = null;
    };
  }, []);

  // Marker diffing + selection styling.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const wanted = new Set(spots.map((s) => s.id));
    for (const [id, marker] of markers) {
      if (!wanted.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    for (const spot of spots) {
      if (!markers.has(spot.id)) {
        const marker = new maplibregl.Marker({
          element: buildPinElement(spot, () => onSelectRef.current(spot.id)),
          anchor: "bottom",
        })
          .setLngLat([spot.lng, spot.lat])
          .addTo(map);
        markers.set(spot.id, marker);
      }
    }
    for (const [id, marker] of markers) {
      const selected = id === selectedSpot?.id;
      pinButtonOf(marker)?.classList.toggle("pin--selected", selected);
      marker.getElement().style.zIndex = selected ? "10" : "";
    }
  }, [spots, selectedSpot]);

  // Fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSpot) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const center: [number, number] = [selectedSpot.lng, selectedSpot.lat];
    const zoom = Math.max(map.getZoom(), 15.4);
    // Negative y keeps the pin clear of the mobile bottom sheet.
    const offsetY = isDesktop ? 0 : -110;

    // rAF-throttled environments (background tabs, low-power webviews) stall
    // camera animations mid-flight. Watch the animation; if it reports moving
    // while the camera is frozen, snap straight to the destination.
    const snapToDestination = () => {
      map.stop();
      map.jumpTo({ center, zoom });
      if (offsetY !== 0) {
        const container = map.getContainer();
        map.jumpTo({
          center: map.unproject([
            container.clientWidth / 2,
            container.clientHeight / 2 - offsetY,
          ]),
          zoom,
        });
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      snapToDestination();
      return;
    }

    map.flyTo({ center, zoom, offset: [0, offsetY], duration: 900, essential: true });
    let last = map.getCenter();
    let ticks = 0;
    const watchdog = window.setInterval(() => {
      ticks += 1;
      if (!map.isMoving() || ticks > 8) {
        window.clearInterval(watchdog);
        return;
      }
      if (map.dragPan.isActive()) return; // never fight the user's finger
      const current = map.getCenter();
      if (current.lng === last.lng && current.lat === last.lat) {
        window.clearInterval(watchdog);
        snapToDestination();
        return;
      }
      last = current;
    }, 300);
    return () => window.clearInterval(watchdog);
  }, [selectedSpot]);

  // User location dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLoc) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-dot";
      el.setAttribute("aria-label", "Your location");
      userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([
        userLoc.lng,
        userLoc.lat,
      ]);
      userMarkerRef.current.addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLoc.lng, userLoc.lat]);
    }
  }, [userLoc]);

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="Map of restroom spots in New Orleans" />;
}
