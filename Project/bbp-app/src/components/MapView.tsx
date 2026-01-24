// src/components/MapView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= Utils ================= */
function isValidLatLng(lat: any, lng: any) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/* ================= Types ================= */
type IssueMarker = {
  location: [number, number];
  type?: string;
};

type Path = {
  id: string;
  coordinates: [number, number][];
  condition: string;
};

type MapViewProps = {
  paths: Path[];
  currentLocation?: [number, number];
  userPath?: [number, number][];
  issues?: IssueMarker[];
  onMapClick?: (latLng: [number, number]) => void;
  selectedSegment?: {
    startIndex: number | null;
    endIndex: number | null;
  };
   weather?: {
    weather: string;
    temperature: number;
    windDirection: string;
  } | null;
};

declare global {
  interface Window {
    google: any;
  }
}

/* ================= Google Maps Loader ================= */
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    if (window.google?.maps) return resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/* ================= Component ================= */
export default function MapView({
  paths,
  currentLocation,
  userPath = [],
  issues = [],
  onMapClick,
  selectedSegment,
  weather,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);

  // overlays refs
  const routePolylinesRef = useRef<any[]>([]);
  const userPathPolylineRef = useRef<any>(null);
  const selectedSegmentPolylineRef = useRef<any>(null);
  const issueMarkersRef = useRef<any[]>([]);
  const clickListenerRef = useRef<any>(null);

 const fallbackCenter = useMemo(() => {
  if (currentLocation && isValidLatLng(currentLocation[0], currentLocation[1])) {
    return { lat: currentLocation[0], lng: currentLocation[1] };
  }

  // 🇮🇹 Milan（固定默认）
  return { lat: 45.4642, lng: 9.19 };
}, [currentLocation]);


  /* ---------- Init map ---------- */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapDivRef.current) return;

    let mounted = true;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (!mounted) return;

      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(mapDivRef.current, {
          center: fallbackCenter,
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
      }

      setMapReady(true);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Update center ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setCenter(fallbackCenter);
  }, [mapReady, fallbackCenter]);

  /* ================= Draw backend routes（⭐核心⭐） ================= */
  const ROUTE_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
];

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];

    paths.forEach((path, index) => {

      const safeCoords = path.coordinates
        .filter(([lat, lng]) => isValidLatLng(lat, lng))
        .map(([lat, lng]) => ({ lat, lng }));

      if (safeCoords.length < 2) {
        console.warn("skipped invalid route:", path.id);
        return;
      }

      const polyline = new google.maps.Polyline({
        path: safeCoords,
        geodesic: true,
        strokeColor: ROUTE_COLORS[index % ROUTE_COLORS.length],
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: mapRef.current,
      });

      routePolylinesRef.current.push(polyline);
    });
  }, [mapReady, paths]);

  /* ---------- Draw userPath ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    if (userPathPolylineRef.current) {
      userPathPolylineRef.current.setMap(null);
      userPathPolylineRef.current = null;
    }

    const safeUserPath = userPath
      .filter(([lat, lng]) => isValidLatLng(lat, lng))
      .map(([lat, lng]) => ({ lat, lng }));

    if (safeUserPath.length < 2) return;

    userPathPolylineRef.current = new google.maps.Polyline({
      path: safeUserPath,
      geodesic: true,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map: mapRef.current,
    });
  }, [mapReady, userPath]);

  /* ---------- Draw selected segment ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    if (selectedSegmentPolylineRef.current) {
      selectedSegmentPolylineRef.current.setMap(null);
      selectedSegmentPolylineRef.current = null;
    }

    if (!selectedSegment || selectedSegment.startIndex === null) return;

    const s = selectedSegment.startIndex;
    const e = selectedSegment.endIndex ?? s;

    const seg = userPath
      .slice(Math.min(s, e), Math.max(s, e) + 1)
      .filter(([lat, lng]) => isValidLatLng(lat, lng))
      .map(([lat, lng]) => ({ lat, lng }));

    if (seg.length < 2) return;

    selectedSegmentPolylineRef.current = new google.maps.Polyline({
      path: seg,
      geodesic: true,
      strokeOpacity: 1,
      strokeWeight: 7,
      map: mapRef.current,
    });
  }, [mapReady, selectedSegment, userPath]);

  /* ---------- Draw issues ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    issueMarkersRef.current.forEach((m) => m.setMap(null));
    issueMarkersRef.current = [];

    issues.forEach((issue) => {
      const [lat, lng] = issue.location;
      if (!isValidLatLng(lat, lng)) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
      });

      issueMarkersRef.current.push(marker);
    });
  }, [mapReady, issues]);

  /* ---------- Map click ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !onMapClick) return;

    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
    }

    clickListenerRef.current = mapRef.current.addListener("click", (e: any) => {
      onMapClick([e.latLng.lat(), e.latLng.lng()]);
    });

    return () => {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [mapReady, onMapClick]);

 return (
  <div className="w-full h-full relative">
    <div ref={mapDivRef} className="absolute inset-0" />

    {weather && (
      <div className="absolute top-4 right-4 z-[9999] bg-white rounded-lg shadow-lg px-4 py-3 text-sm">
        <div className="font-semibold">{weather.weather}</div>
        <div>{weather.temperature} °C</div>
        <div>Wind: {weather.windDirection}</div>
      </div>
    )}
  </div>
);

}
