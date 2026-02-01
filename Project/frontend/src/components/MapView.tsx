import { useEffect, useMemo, useRef, useState } from "react";

type IssueMarker = {
  location: [number, number];
  type?: string;
};
type ColoredPath = {
  id: string;
  path: [number, number][];
  color: string;
  weight?: number; // bold line, used when it's selected
};


type MapViewProps = {
  paths?: ColoredPath[]; 
  highlightedPath?: [number, number][];
  currentLocation?: [number, number];
  

 /* onRoutesReady?: (payload: {
    routes: Array<{
      index: number;
      summary?: string;
      distance: number;
      duration: number;
      path: [number, number][];
    }>;
    pickedIndex: number;
  }) => void;*/

  userPath?: [number, number][];
  issues?: IssueMarker[];
  onMapClick?: (latLng: [number, number]) => void;
  selectedSegment?: {
    startIndex: number | null;
    endIndex: number | null;
  };

  // recording page: follow user
  // confirmation page: do not follow (to avoid interrupting user pan/zoom)
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
  highlightedPath, 
  paths = [],
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

  // Fit bounds only once (avoid re-zooming on every path update)
  const didFitBoundsRef = useRef(false);

  const fallbackCenter = useMemo(() => {
    if (currentLocation) return { lat: currentLocation[0], lng: currentLocation[1] };
    if (userPath.length) return { lat: userPath[userPath.length - 1][0], lng: userPath[userPath.length - 1][1] };
    return { lat: 45.4642, lng: 9.19 }; 
  }, [currentLocation, userPath]);

  const didSnapToUserRef = useRef(false);
  const multiPathPolylinesRef = useRef<any[]>([]);

  const fitToLatLngPaths = (pathsToFit: [number, number][][]) => {
    if (!mapRef.current || !window.google?.maps) return;
    const google = window.google;

    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    pathsToFit.forEach((path) => {
      path.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
        count++;
      });
    });

    if (count === 0) return;

    // ✅ Fix offset caused by container size changes
    google.maps.event.trigger(mapRef.current, "resize");
    mapRef.current.fitBounds(bounds, 40); // padding 40px
  };

  


  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!currentLocation) return;
    if (didSnapToUserRef.current) return;

    mapRef.current.setCenter({ lat: currentLocation[0], lng: currentLocation[1] });
    mapRef.current.setZoom(16);
    didSnapToUserRef.current = true;
  }, [mapReady, currentLocation]);

  /* ---------- Init Map (only do once) ---------- */
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

  /* ---------- draw multiple paths ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

  // 1️⃣ Clear existing multi-path polylines
    multiPathPolylinesRef.current.forEach((pl) => pl.setMap(null));
    multiPathPolylinesRef.current = [];

    if (!paths || paths.length === 0) return;

  // 2️⃣ Render each path
    paths.forEach((p) => {
      if (!p.path || p.path.length < 2) return;

      const polyline = new google.maps.Polyline({
        path: p.path.map(([lat, lng]) => ({ lat, lng })),
        geodesic: true,
        strokeColor: p.color,
        strokeOpacity: 0.85,
        strokeWeight: p.weight ?? 5,
        zIndex: 5,
      });

      polyline.setMap(mapRef.current);
      multiPathPolylinesRef.current.push(polyline);
    });
  }, [mapReady, paths]);

/* ---------- Bind click events ---------- */
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
  

/* ---------- Fit bounds once when userPath becomes available ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (!followUser) return;
    if (didFitBoundsRef.current) return;
    if (userPath.length < 2) return;

    const google = window.google;
    const bounds = new google.maps.LatLngBounds();
    userPath.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    mapRef.current.fitBounds(bounds);
    didFitBoundsRef.current = true;
  }, [mapReady, userPath]);

/* ---------- Update center (follow only when followUser = true) ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!followUser) return;

    mapRef.current.setCenter(fallbackCenter);
  }, [mapReady, fallbackCenter, followUser]);

  /* ---------- 自动根据路线调整视野（results / detail） ---------- */
 /* useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 1) 详情页：优先 fit highlightedPath
    if (highlightedPath && highlightedPath.length >= 2) {
      requestAnimationFrame(() => fitToLatLngPaths([highlightedPath]));
      const t = window.setTimeout(() => fitToLatLngPaths([highlightedPath]), 150);
      return () => window.clearTimeout(t);
    }

    // 2) results 页：fit 所有 routes
    if (paths && paths.length > 0) {
      const all = paths
        .map((p) => p.path)
        .filter((p) => p && p.length >= 2);

      if (!all.length) return;

      requestAnimationFrame(() => fitToLatLngPaths(all));
      const t = window.setTimeout(() => fitToLatLngPaths(all), 150);
      return () => window.clearTimeout(t);
    }
  }, [mapReady, highlightedPath, paths]);


  /* ---------- current user location marker ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (!currentLocation) return;

    const google = window.google;
    const pos = { lat: currentLocation[0], lng: currentLocation[1] };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        // ✅ a simple blue point 
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


  /* ---------- draw userPath polyline ---------- */
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

  /* ---------- draw issues markers ---------- */
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


/* ---------- Highlight segment (supports both index- and path-based modes) ---------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;

    // Clear previous highlight
    if (selectedSegmentPolylineRef.current) {
      selectedSegmentPolylineRef.current.setMap(null);
      selectedSegmentPolylineRef.current = null;
    }

    let pathToHighlight: [number, number][] | null = null;

    // ⭐ Prefer highlightedPath (road condition scenario)
    if (highlightedPath && highlightedPath.length >= 2) {
      pathToHighlight = highlightedPath;
    }
    // 🟡 Backward compatibility: highlight by index
    else if (selectedSegment && userPath.length) {
      const { startIndex, endIndex } = selectedSegment;
      if (startIndex !== null) {
        const s = startIndex;
        const e = endIndex ?? startIndex;
        const seg = userPath.slice(
          Math.min(s, e),
          Math.max(s, e) + 1
        );
        if (seg.length >= 2) {
          pathToHighlight = seg;
        }
      }
    }

    if (!pathToHighlight) return;

    selectedSegmentPolylineRef.current = new google.maps.Polyline({
      path: pathToHighlight.map(([lat, lng]) => ({ lat, lng })),
      geodesic: true,
      strokeOpacity: 1,
      strokeWeight: 7,
      strokeColor: "#f97316", // 🟠 Highlight color (orange)
      zIndex: 10,
    });

    selectedSegmentPolylineRef.current.setMap(mapRef.current);
  }, [mapReady, highlightedPath, selectedSegment, userPath]);


  return (
    <div className="w-full h-full relative">
      <div ref={mapDivRef} className="absolute inset-0" />
    </div>
  );
}
