// src/components/MapView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type IssueMarker = {
  location: [number, number];
  type?: string;
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
};

declare global {
  interface Window {
    google: any;
  }
}

/* ---------- Google Maps Loader（只加载一次） ---------- */
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

export default function MapView({
  currentLocation,
  userPath = [],
  issues = [],
  onMapClick,
  selectedSegment,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false); // ✅ 一定要在组件里面

  // overlays
  const userPathPolylineRef = useRef<any>(null);
  const selectedSegmentPolylineRef = useRef<any>(null);
  const issueMarkersRef = useRef<any[]>([]);
  const clickListenerRef = useRef<any>(null);

  const fallbackCenter = useMemo(() => {
    if (currentLocation) return { lat: currentLocation[0], lng: currentLocation[1] };
    if (userPath.length) return { lat: userPath[userPath.length - 1][0], lng: userPath[userPath.length - 1][1] };
    return { lat: 39.9042, lng: 116.4074 };
  }, [currentLocation, userPath]);

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

      setMapReady(true); // ✅ 地图 ready 了
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 绑定点击事件（地图 ready 后 & onMapClick 变化都要重新绑定） ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    // 清旧 listener
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    // 绑定新 listener
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

  /* ---------- 更新中心点 ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setCenter(fallbackCenter);
  }, [mapReady, fallbackCenter]);

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
