import { useEffect, useMemo, useRef, useState } from "react";

type IssueMarker = {
  location: [number, number];
  type?: string;
};

type MapViewProps = {
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
};

declare global {
  interface Window {
    google: any;
  }
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    if (window.google?.maps) return resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function MapView({
  currentLocation,
  userPath = [],
  issues = [],
  onMapClick,
  selectedSegment,
  followUser = false,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const userMarkerRef = useRef<any>(null);


  // overlays
  const userPathPolylineRef = useRef<any>(null);
  const selectedSegmentPolylineRef = useRef<any>(null);
  const issueMarkersRef = useRef<any[]>([]);
  const clickListenerRef = useRef<any>(null);

  // 只 fitBounds 一次（避免每次 path 更新都缩放）
  const didFitBoundsRef = useRef(false);

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

  /* ---------- Init Map (只执行一次) ---------- */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapDivRef.current) return;

    let isMounted = true;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (!isMounted) return;

      const google = window.google;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapDivRef.current!, {
          center: fallbackCenter,
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
      }

      setMapReady(true);
    })();

    return () => {
      isMounted = false;
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
  }, [mapReady, fallbackCenter, followUser]);

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


  /* ---------- 画 userPath polyline ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    if (userPathPolylineRef.current) {
      userPathPolylineRef.current.setMap(null);
      userPathPolylineRef.current = null;
    }

    if (!userPath.length) return;

    userPathPolylineRef.current = new google.maps.Polyline({
      path: userPath.map(([lat, lng]) => ({ lat, lng })),
      geodesic: true,
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });

    userPathPolylineRef.current.setMap(mapRef.current);
  }, [mapReady, userPath]);

  /* ---------- 画 issues markers ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    issueMarkersRef.current.forEach((m) => m.setMap(null));
    issueMarkersRef.current = [];

    issues.forEach((issue) => {
      const marker = new google.maps.Marker({
        position: { lat: issue.location[0], lng: issue.location[1] },
        map: mapRef.current,
      });
      issueMarkersRef.current.push(marker);
    });
  }, [mapReady, issues]);

  /* ---------- 高亮 segment ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    if (selectedSegmentPolylineRef.current) {
      selectedSegmentPolylineRef.current.setMap(null);
      selectedSegmentPolylineRef.current = null;
    }

    if (!selectedSegment || !userPath.length) return;

    const { startIndex, endIndex } = selectedSegment;
    if (startIndex === null) return;

    const s = startIndex;
    const e = endIndex ?? startIndex;
    const seg = userPath.slice(Math.min(s, e), Math.max(s, e) + 1);
    if (!seg.length) return;

    selectedSegmentPolylineRef.current = new google.maps.Polyline({
      path: seg.map(([lat, lng]) => ({ lat, lng })),
      geodesic: true,
      strokeOpacity: 1,
      strokeWeight: 7,
    });

    selectedSegmentPolylineRef.current.setMap(mapRef.current);
  }, [mapReady, selectedSegment, userPath]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapDivRef} className="absolute inset-0" />
    </div>
  );
}
