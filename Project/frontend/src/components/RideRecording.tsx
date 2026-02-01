import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  StopCircleIcon,
} from "lucide-react";
import MapView from "./MapView";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { Issue } from "../types/issue";
import { getCurrentRide, saveRideLocal } from "../services/rideStorage";
import { rideRouteService } from "../services/reportService";
import type { Ride } from "../types/ride";
import type { RideStreet } from "../types/rideStreet";



/**
 * TRACK_MODE:
 * - "real": use real GPS track (watchPosition)
 * - "demo": simulate movement along backend Directions route
 *           (follows roads, no cutting through buildings)
 */

const TRACK_MODE: "real" | "demo" = "real";

/** Demo speed (m/s): 4–7 feels like cycling */
const DEMO_SPEED_MPS = 5.5;

/**
 * GPS noise (meters)
 * ✅ To avoid "cutting through buildings", keep it at 0–1m
 * Increasing noise will cause points to drift off the road
 */

const DEMO_NOISE_M = 0.5;

// Recording filters (cycling-friendly)
const MIN_DIST_M = 8; // ✅ 50 is too large; 8–12 feels more natural for cycling
const MIN_TIME_MS = 2500;
const MIN_TURN_DEG = 25;

// ---------- helpers ----------
const toRad = (d: number) => (d * Math.PI) / 180;
const splitRouteByProgress = (
  route: [number, number][],
  current: [number, number] | undefined
) => {
  if (!current || route.length < 2) {
    return {
      passed: [],
      remaining: route,
    };
  }

  let minDist = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(route[i], current);
    if (d < minDist) {
      minDist = d;
      closestIndex = i;
    }
  }

  return {
    passed: route.slice(0, closestIndex + 1),
    remaining: route.slice(closestIndex),
  };
};
const snapToRoute = (
  route: [number, number][],
  current: [number, number]
): [number, number] => {
  let minDist = Infinity;
  let snapped: [number, number] = route[0];

  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(route[i], current);
    if (d < minDist) {
      minDist = d;
      snapped = route[i];
    }
  }

  return snapped;
};



const haversineMeters = (a: [number, number], b: [number, number]) => {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(q));
};


const bearingDeg = (a: [number, number], b: [number, number]) => {
  const [lat1, lng1] = a.map(toRad) as [number, number];
  const [lat2, lng2] = b.map(toRad) as [number, number];
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const angleDiff = (a: number, b: number) => {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const metersToLat = (m: number) => m / 111111;
const metersToLng = (m: number, lat: number) =>
  m / (111111 * Math.cos((lat * Math.PI) / 180));
type Segment = {
  a: [number, number];
  b: [number, number];
  index: number; // index in route
};

const buildSegments = (route: [number, number][]): Segment[] => {
  const segments: Segment[] = [];

  for (let i = 0; i < route.length - 1; i++) {
    segments.push({
      a: route[i],
      b: route[i + 1],
      index: i,
    });
  }

  return segments;
};
const projectPointToSegment = (
  p: [number, number],
  a: [number, number],
  b: [number, number]
): {
  projected: [number, number];
  t: number; // 0–1, position on segment a → b
  dist: number; // distance from the projected point to p in meter
} => {
  const ax = a[1];
  const ay = a[0];
  const bx = b[1];
  const by = b[0];
  const px = p[1];
  const py = p[0];

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abLen2 = abx * abx + aby * aby;

  let t = abLen2 === 0 ? 0 : (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t)); // clamp within segment

  const projX = ax + abx * t;
  const projY = ay + aby * t;

  const projected: [number, number] = [projY, projX];

  const dist = haversineMeters(p, projected);

  return { projected, t, dist };
};
const findClosestSegmentOnRoute = (
  route: [number, number][],
  current: [number, number]
): {
  segmentIndex: number;
  projected: [number, number];
} | null => {
  if (route.length < 2) return null;

  const segments = buildSegments(route);

  let minDist = Infinity;
  let best: {
    segmentIndex: number;
    projected: [number, number];
  } | null = null;

  for (const seg of segments) {
    const { projected, dist } = projectPointToSegment(
      current,
      seg.a,
      seg.b
    );

    if (dist < minDist) {
      minDist = dist;
      best = {
        segmentIndex: seg.index,
        projected,
      };
    }
  }

  return best;
};




// path([lat,lng]) -> GeoJSON([lng,lat])
const pathToGeoJson = (path: [number, number][]): GeoJSON.LineString => ({
  type: "LineString",
  coordinates: path.map(([lat, lng]) => [lng, lat]),
});

// GeoJSON([lng,lat]) -> path([lat,lng])
const geoJsonToPath = (geo: GeoJSON.LineString): [number, number][] => {
  return geo.coordinates.map(([lng, lat]) => [lat, lng]);
};

// Track point with timestamp (for accurate speed calculation)
type TrackPoint = { lat: number; lng: number; t: number };

const computeStatsFromTrack = (track: TrackPoint[]) => {
  let distM = 0;
  let maxMps = 0;

  for (let i = 1; i < track.length; i++) {
    const a: [number, number] = [track[i - 1].lat, track[i - 1].lng];
    const b: [number, number] = [track[i].lat, track[i].lng];
    const d = haversineMeters(a, b);
    distM += d;

    const dt = Math.max((track[i].t - track[i - 1].t) / 1000, 0.001);
    const mps = d / dt;
    if (mps > maxMps) maxMps = mps;
  }

  const distKm = distM / 1000;
  const durationSec =
    track.length >= 2
      ? Math.max((track[track.length - 1].t - track[0].t) / 1000, 1)
      : 1;

  const avgKmh = distKm / (durationSec / 3600) || 0;
  const maxKmh = maxMps * 3.6;

  return { distKm, durationSec, avgKmh, maxKmh };
};

export default function RideRecording() {
  const navigate = useNavigate();

  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const location = useLocation();
  const selectedRoute = location.state?.route;



  const [path, setPath] = useState<[number, number][]>([]);
  const currentLocation: [number, number] | undefined =
  path.length > 0 ? path[path.length - 1] : undefined;

  const [detectedIssues] = useState<Issue[]>([]);
  const [activeNavRoute, setActiveNavRoute] =
  useState<[number, number][]>([]);


  // Track point with timestamp (for accurate speed calculation)
  const baseRef = useRef<[number, number] | null>(null);

  // Actual recorded track with timestamps
  const trackRef = useRef<TrackPoint[]>([]);
  const lastKeptAtRef = useRef<number>(0);

  // Demo mode refs
  const demoRouteRef = useRef<[number, number][]>([]);
  const demoRouteReadyRef = useRef(false);
  const demoSegRef = useRef(0); 
  const demoTRef = useRef(0); 
  const preparingDemoRouteRef = useRef(false);

  const getBase = useMemo(() => {
    return () => baseRef.current ?? [45.4642, 9.19];
  }, []);

  // Unified point ingestion:
  // distance threshold + turn threshold + time fallback
  const pushPoint = (p: [number, number], t: number) => {
    const pts = trackRef.current;

    if (pts.length === 0) {
      trackRef.current = [{ lat: p[0], lng: p[1], t }];
      lastKeptAtRef.current = t;
      setPath([p]);
      return;
    }

    const last = pts[pts.length - 1];
    const lastP: [number, number] = [last.lat, last.lng];
    const dist = haversineMeters(lastP, p);

    const timeOk = t - lastKeptAtRef.current >= MIN_TIME_MS;
    if (dist < MIN_DIST_M && !timeOk) return;

    let turnOk = false;
    if (pts.length >= 2) {
      const prev = pts[pts.length - 2];
      const b1 = bearingDeg([prev.lat, prev.lng], [last.lat, last.lng]);
      const b2 = bearingDeg([last.lat, last.lng], p);
      turnOk = angleDiff(b1, b2) >= MIN_TURN_DEG;
    }

    if (dist >= MIN_DIST_M || turnOk || timeOk) {
      trackRef.current = [...pts, { lat: p[0], lng: p[1], t }].slice(-3000);
      lastKeptAtRef.current = t;
      setPath(trackRef.current.map((x) => [x.lat, x.lng]));
    }
  };

  /**
   * ✅ Key step: prepare the demo route (road-following)
   * Uses `routes[0].path` ([lat, lng][]) returned by the backend `/map/analyze`
   * endpoint as the trajectory template for demo mode.
   */
  const prepareDemoRoute = async (base: [number, number]) => {
    if (preparingDemoRouteRef.current) return;
    preparingDemoRouteRef.current = true;

    const origin = { lat: base[0], lng: base[1] };

    // demo 用一个附近目的地（约 1~2km 外）
    const destination = {
      lat: origin.lat + 0.01,
      lng: origin.lng + 0.01,
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/map/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin,
            destination,
            travelMode: "BICYCLING",
          }),
        }
      );
      

      const data = await res.json();
      const demoPath = data?.routes?.[0]?.path as [number, number][] | undefined;

      if (!demoPath || demoPath.length < 2) {
        toast.error("Demo route not available (backend returned empty path).");
        demoRouteRef.current = [];
        demoRouteReadyRef.current = false;
        return;
      }

      demoRouteRef.current = demoPath;
      demoRouteReadyRef.current = true;
      setActiveNavRoute(demoPath);

      demoSegRef.current = 0;
      demoTRef.current = 0;

      // Align the starting position to the first route point to avoid an initial jump
      baseRef.current = demoPath[0];
      pushPoint(demoPath[0], Date.now());
    } catch (e) {
      console.error("prepareDemoRoute failed", e);
      toast.error("Failed to prepare demo route.");
      demoRouteRef.current = [];
      demoRouteReadyRef.current = false;
    } finally {
      preparingDemoRouteRef.current = false;
    }
  };

  // Initial positioning: correct first frame and demo route preparation

  useEffect(() => {
    let cancelled = false;
    const fallback: [number, number] = [45.4642, 9.19];

    const initWithBase = async (p: [number, number]) => {
      baseRef.current = p;

      // reset track
      trackRef.current = [];
      lastKeptAtRef.current = 0;
      pushPoint(p, Date.now());

      if (TRACK_MODE === "demo") {
        await prepareDemoRoute(p);
      }
    };

    if (!("geolocation" in navigator)) {
      initWithBase(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        initWithBase(p);
      },
      () => {
        if (cancelled) return;
        toast.error("Location permission denied, using demo location.");
        initWithBase(fallback);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
useEffect(() => {
  if (TRACK_MODE === "real" && selectedRoute?.path?.length >= 2) {
    setActiveNavRoute(selectedRoute.path);
  }
}, [selectedRoute]);

  // 计时：只负责 UI 时间；距离/速度用真实 track 算
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);

      const stats = computeStatsFromTrack(trackRef.current);
      setDistance(stats.distKm);
      setSpeed(stats.avgKmh);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 轨迹录制：REAL / DEMO
  useEffect(() => {
    if (TRACK_MODE === "real") {
      if (!("geolocation" in navigator)) return;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const p: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          baseRef.current = p;
          pushPoint(p, Date.now());
        },
        (err) => {
          console.error(err);
          toast.error("GPS tracking failed.");
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }

    // DEMO：沿后端路线推进（沿道路）+ 极小噪声（可选）
    const interval = setInterval(() => {
      // 保险：如果还没准备好，就用当前位置再拉一次
      if (!demoRouteReadyRef.current) {
        const b = getBase();
        prepareDemoRoute(b);
        return;
      }

      const route = demoRouteRef.current;
      if (route.length < 2) return;

      let seg = demoSegRef.current;
      let tt = demoTRef.current;

      let a = route[seg];
      let b = route[seg + 1];

      const stepM = DEMO_SPEED_MPS; // 每秒前进的米数
      const segLenM = haversineMeters(a, b);
      const dt = segLenM > 0 ? stepM / segLenM : 1;

      tt += dt;

      while (tt >= 1 && seg < route.length - 2) {
        tt -= 1;
        seg += 1;
        a = route[seg];
        b = route[seg + 1];
      }

      // 到终点：循环（你也可以改成 stop）
      if (seg >= route.length - 1) {
        seg = 0;
        tt = 0;
        a = route[0];
        b = route[1];
      }

      // 插值推进（仍然沿路的 polyline 点连线）
      let lat = lerp(a[0], b[0], tt);
      let lng = lerp(a[1], b[1], tt);

      // ✅ 极小噪声（0~1m），保持“像 GPS”，但不会明显偏离道路
      if (DEMO_NOISE_M > 0) {
        const nLat = (Math.random() - 0.5) * 2 * metersToLat(DEMO_NOISE_M);
        const nLng = (Math.random() - 0.5) * 2 * metersToLng(DEMO_NOISE_M, lat);
        lat += nLat;
        lng += nLng;
      }

      const next: [number, number] = [lat, lng];

      demoSegRef.current = seg;
      demoTRef.current = tt;

      baseRef.current = next;
      pushPoint(next, Date.now());

      // issue demo（可选）
      if (Math.random() < 0.03) {
        const issueLoc: [number, number] = [
          next[0] + (Math.random() - 0.5) * metersToLat(2),
          next[1] + (Math.random() - 0.5) * metersToLng(2, next[0]),
        ];

        const newIssue: Issue = {
          id: `issue-${Date.now()}`,
          type: "pothole",
          location: issueLoc,
          severity: "medium",
          status: "pending",
          date: new Date().toISOString(),
          autoDetected: true,
        };

        setCurrentIssue(newIssue);
        setShowIssueAlert(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getBase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };


  const handleStop = async () => {
    console.log("stop clicked");
    
    const storedRide = getCurrentRide();
    if (!storedRide) return;
    const baseRide: Ride = { ...storedRide };

    if (trackRef.current.length < 2) {
      toast.error("Route too short. Ride was not saved.");
     
    
      // ❌ 不保存，直接返回地图
      navigate("/map", { replace: true });
    
      return;
    }
    

    const recordedPath: [number, number][] = trackRef.current.map((p) => [
      p.lat,
      p.lng,
    ]);

    const routeGeoJson = pathToGeoJson(recordedPath);

    let streets: RideStreet[] = [];
    try {
      streets = await rideRouteService.resolveStreetsFromRouteGeoJson(
        routeGeoJson
      );
    } catch (err) {
      console.error("RideRecording>> resolve streets failed", err);
    }

    const stats = computeStatsFromTrack(trackRef.current);

    const rideForlocalStorage = {
      ...baseRide,
      endedAt: new Date(),
      routeGeoJson,
      streets,
    };

    const updatedRide = {
      ...rideForlocalStorage,
      avgSpeed: Number(stats.avgKmh.toFixed(1)),
      date: new Date().toISOString(),
      distance: Number(stats.distKm.toFixed(2)),
      duration: Math.round(stats.durationSec),
      maxSpeed: Number(stats.maxKmh.toFixed(1)),
      path: geoJsonToPath(routeGeoJson),
      issues: detectedIssues,
      uploadStatus: "draft",
    };

    saveRideLocal(rideForlocalStorage);
    navigate("/ride/confirm", { state: { ride: updatedRide } });
  };
const navigationPaths = useMemo(() => {
  if (!activeNavRoute.length || !currentLocation) return [];

  const closest = findClosestSegmentOnRoute(
    activeNavRoute,
    currentLocation
  );

  if (!closest) {
    return [
      {
        id: "route-all",
        path: activeNavRoute,
        color: "#2563eb",
        weight: 6,
      },
    ];
  }

  const { segmentIndex, projected } = closest;

  const passed = [
    ...activeNavRoute.slice(0, segmentIndex + 1),
    projected,
  ];

  const remaining = [
    projected,
    ...activeNavRoute.slice(segmentIndex + 1),
  ];

  return [
    {
      id: "route-passed",
      path: passed,
      color: "#94a3b8", // 灰
      weight: 6,
    },
    {
      id: "route-remaining",
      path: remaining,
      color: "#2563eb", // 蓝
      weight: 6,
    },
  ];
}, [activeNavRoute, currentLocation]);

  return (
    <div className="h-screen flex flex-col bg-white relative">
      <div className="flex-1 relative">
        <MapView
          userPath={path}
          currentLocation={path.length ? path[path.length - 1] : undefined}
            paths={navigationPaths}
          issues={detectedIssues.map((issue) => ({
            location: issue.location,
            type: issue.type,
          }))}
          followUser
          
        />
      </div>

      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-900 mb-1">{formatTime(duration)}</p>
            <p className="text-gray-600">Duration</p>
          </div>
          <div>
            <p className="text-gray-900 mb-1">{distance.toFixed(2)} km</p>
            <p className="text-gray-600">Distance</p>
          </div>
          <div>
            <p className="text-gray-900 mb-1">{speed.toFixed(1)} km/h</p>
            <p className="text-gray-600">Speed</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <Button
          className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl"
          onClick={handleStop}
        >
          <StopCircleIcon className="w-10 h-10" />
        </Button>
      </motion.div>

      {detectedIssues.length > 0 && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute top-32 right-4 bg-orange-600 text-white rounded-full px-4 py-2 shadow-lg"
        >
          <span>{detectedIssues.length} issues</span>
        </motion.div>
      )}
    </div>
  );
}