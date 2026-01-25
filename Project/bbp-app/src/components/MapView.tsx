import { useEffect, useMemo, useRef, useState } from "react";

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
  routeRequest?: {
    origin: string | { lat: number; lng: number };
    destination: string | { lat: number; lng: number };
    travelMode?: "BICYCLING" | "WALKING" | "DRIVING";
    alternatives?: boolean; // 默认 true
    /** 只显示一条：你可以传 "shortest" */
    pick?: "shortest" | "first";
  };

  onRoutesReady?: (payload: {
    routes: Array<{
      index: number;
      summary?: string;
      distanceKm: number;
      durationMin: number;
      path: [number, number][];
    }>;
    pickedIndex: number;
  }) => void;

  userPath?: [number, number][];
  issues?: IssueMarker[];
  onMapClick?: (latLng: [number, number]) => void;
  selectedSegment?: {
    startIndex: number | null;
    endIndex: number | null;
  };

  /** 录制页：跟随定位；确认页：不跟随（避免抢拖动） */
  followUser?: boolean;
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
  followUser = false,
  weather,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const userMarkerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);

  // overlays refs
  const routePolylinesRef = useRef<any[]>([]);
  const userPathPolylineRef = useRef<any>(null);
  const selectedSegmentPolylineRef = useRef<any>(null);
  const issueMarkersRef = useRef<any[]>([]);
  const clickListenerRef = useRef<any>(null);

  // 只 fitBounds 一次（避免每次 path 更新都缩放）
  const didFitBoundsRef = useRef(false);
  const userLocationMarkerRef = useRef<any>(null);


  const fallbackCenter = useMemo(() => {
    if (currentLocation) return { lat: currentLocation[0], lng: currentLocation[1] };
    if (userPath.length) return { lat: userPath[userPath.length - 1][0], lng: userPath[userPath.length - 1][1] };
    return { lat: 45.4642, lng: 9.19 }; // ✅ 不要默认北京
  }, [currentLocation, userPath]);

  const didSnapToUserRef = useRef(false);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!currentLocation) return;
    if (didSnapToUserRef.current) return;

    mapRef.current.setCenter({ lat: currentLocation[0], lng: currentLocation[1] });
    mapRef.current.setZoom(16);
    didSnapToUserRef.current = true;
  }, [mapReady, currentLocation]);

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

  /* ---------- 绑定点击事件 ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (onMapClick) {
      clickListenerRef.current = mapRef.current.addListener("click", (e: any) => {
        onMapClick([e.latLng.lat(), e.latLng.lng()]);
      });
    }

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [mapReady, onMapClick]);

  /* ---------- userPath 首次可用时 fitBounds 一次 ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (didFitBoundsRef.current) return;
    if (userPath.length < 2) return;

    const google = window.google;
    const bounds = new google.maps.LatLngBounds();
    userPath.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    mapRef.current.fitBounds(bounds);
    didFitBoundsRef.current = true;
  }, [mapReady, userPath]);

  /* ---------- 更新中心点（仅在 followUser=true 时跟随） ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!followUser) return;

    mapRef.current.setCenter(fallbackCenter);
  }, [mapReady, fallbackCenter]);

  /* ---------- 当前用户位置 marker ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (!currentLocation) return;

    const google = window.google;
    const pos = { lat: currentLocation[0], lng: currentLocation[1] };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        // ✅ 一个简单的“蓝点”样式
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillOpacity: 1,
          fillColor: "#2563eb",    // 蓝色
          strokeOpacity: 1,
          strokeColor: "#ffffff",  // 白边
          strokeWeight: 2,
        },
        zIndex: 9999,
        title: "You are here",
      });
    } else {
      userMarkerRef.current.setPosition(pos);
      userMarkerRef.current.setMap(mapRef.current);
    }
  }, [mapReady, currentLocation]);


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
  /* ---------- Draw current user location ---------- */
useEffect(() => {
  if (!mapReady || !mapRef.current || !window.google?.maps) return;
  if (!currentLocation) return;

  const google = window.google;
  const [lat, lng] = currentLocation;

  // 如果已经有 marker，先移除
  if (userLocationMarkerRef.current) {
    userLocationMarkerRef.current.setMap(null);
    userLocationMarkerRef.current = null;
  }

  userLocationMarkerRef.current = new google.maps.Marker({
    position: { lat, lng },
    map: mapRef.current,
    zIndex: 999, // 永远在最上面
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#2563eb", // 蓝色（像导航）
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    },
  });
}, [mapReady, currentLocation]);


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
