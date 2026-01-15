import { useEffect, useRef, useState } from "react";

/* ---------- Types ---------- */
type Path = {
  id: string;
  coordinates: number[][];
  condition: string;
};

type MapViewProps = {
  currentLocation?: [number, number];
  paths: Path[];
};

declare global {
  interface Window {
    google: any;
  }
}

/* ---------- Google Maps Loader ---------- */
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    if (window.google?.maps) return resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/* ---------- Utils ---------- */
function getPathColor(condition: string) {
  switch (condition) {
    case "good":
      return "#22c55e";
    case "fair":
      return "#f59e0b";
    case "poor":
      return "#ef4444";
    default:
      return "#3b82f6";
  }
}

/* ---------- Component ---------- */
export default function MapView({ currentLocation, paths }: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineMapRef = useRef<Map<string, any>>(new Map());

  const [mapReady, setMapReady] = useState(false);

  /* ---------- Init Map ---------- */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapDivRef.current) return;

    let mounted = true;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (!mounted) return;

      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(mapDivRef.current, {
          center: { lat: 45.4642, lng: 9.19 }, // Milan
          zoom: 13,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });

        setMapReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Center on current location ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !currentLocation) return;

    mapRef.current.setCenter({
      lat: currentLocation[0],
      lng: currentLocation[1],
    });
  }, [currentLocation, mapReady]);

  /* ---------- ✅ Render paths（关键修复） ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!paths || paths.length === 0) return;

    const google = window.google;
    const polylineMap = polylineMapRef.current;

    // 清空旧路线
    polylineMap.forEach((line) => line.setMap(null));
    polylineMap.clear();

    // 重新画所有路线
    paths.forEach((path) => {
      console.log("Drawing polyline:", path.id, path.coordinates.length);

      const polyline = new google.maps.Polyline({
        path: path.coordinates.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: getPathColor(path.condition),
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: mapRef.current,
      });

      polylineMap.set(path.id, polyline);
    });
  }, [paths, mapReady]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapDivRef} className="absolute inset-0" />
    </div>
  );
}
