import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  StopCircleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XIcon,
} from "lucide-react";
import MapView from "./MapView";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import type { Issue } from "../types/issue";
import { getCurrentRide, saveRideLocal } from "../services/rideStorage";
import { rideRouteService } from "../services/reportService";
import type { Ride } from "../types/ride";
import type { RideStreet } from "../types/rideStreet";
import type { GeoJSON } from "geojson";
import type { Route } from "../types/route";

/**
 * TRACK_MODE:
 * - "real": 用真实 GPS 轨迹（watchPosition）
 * - "demo": 用预设路线 + 速度推进 + 少量 GPS 抖动（更像真实骑行）
 */
const TRACK_MODE: "real" | "demo" = "real";
/**S
 * Demo 路线（[lat, lng]）
 * 这里是一条带转弯的小路线（点与点别太远，demo 更自然）
 */
const DEMO_ROUTE_TEMPLATE: [number, number][] = [
  [45.46350, 9.18760],
  [45.46355, 9.18820],
  [45.46360, 9.18890],
  [45.46362, 9.18940],
  [45.46390, 9.18980],
  [45.46440, 9.18985],
  [45.46495, 9.18988],
  [45.46530, 9.19020],
  [45.46560, 9.19060],
];

/** Demo 速度（m/s）：4~7 比较像骑行 */
const DEMO_SPEED_MPS = 5.5;
/** GPS 抖动（米）：2~6 比较真实 */
const DEMO_NOISE_M = 3;


// 录制过滤参数（骑行友好）
const MIN_DIST_M = 50; // demo/真实都更自然一点
const MIN_TIME_MS = 4000;
const MIN_TURN_DEG = 30;

// ---------- helpers ----------
const toRad = (d: number) => (d * Math.PI) / 180;

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

// path([lat,lng]) -> GeoJSON([lng,lat])
const pathToGeoJson = (path: [number, number][]): GeoJSON.LineString => ({
  type: "LineString",
  coordinates: path.map(([lat, lng]) => [lng, lat]),
});

// GeoJSON([lng,lat]) -> path([lat,lng])
const geoJsonToPath = (geo: GeoJSON.LineString): [number, number][] => {
  return geo.coordinates.map(([lng, lat]) => [lat, lng]);
};

// 点带时间戳：用于正确计算速度
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
    track.length >= 2 ? Math.max((track[track.length - 1].t - track[0].t) / 1000, 1) : 1;

  const avgKmh = (distKm / (durationSec / 3600)) || 0;
  const maxKmh = maxMps * 3.6;

  return { distKm, durationSec, avgKmh, maxKmh };
  
};


export default function RideRecording() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRoute = location.state?.route as Route | undefined;


  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);

  const [path, setPath] = useState<[number, number][]>([]);
  const [detectedIssues, setDetectedIssues] = useState<Issue[]>([]);
  const [showIssueAlert, setShowIssueAlert] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null);

  const baseRef = useRef<[number, number] | null>(null);

  // 真正录制：带 timestamp
  const trackRef = useRef<TrackPoint[]>([]);
  const lastKeptAtRef = useRef<number>(0);

  // demo：沿 route 前进
  const demoSegRef = useRef(0);
  const demoTRef = useRef(0);
  const demoRouteRef = useRef<[number, number][]>(DEMO_ROUTE_TEMPLATE);
  const demoRouteReadyRef = useRef(false);
  const demoPosRef = useRef<[number, number] | null>(null);
  const demoHeadingRef = useRef<number>(0); // 0~360

  const getBase = useMemo(() => {
    return () => baseRef.current ?? [45.4642, 9.19];
  }, []);

  // demo 路线平移到用户当前位置（关键：防止跨城直线）
  const alignDemoRouteToBase = (base: [number, number]) => {
    const [baseLat, baseLng] = base;
    const [tplLat, tplLng] = DEMO_ROUTE_TEMPLATE[0];
    const dLat = baseLat - tplLat;
    const dLng = baseLng - tplLng;

    demoRouteRef.current = DEMO_ROUTE_TEMPLATE.map(([lat, lng]) => [
      lat + dLat,
      lng + dLng,
    ]);

    demoRouteReadyRef.current = true;
    demoSegRef.current = 0;
    demoTRef.current = 0;
  };

  // 统一入点：距离阈值 + 转弯阈值 + 时间兜底
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

  // 初始化定位：第一帧正确 + demo 路线对齐
  useEffect(() => {
    let cancelled = false;
    const fallback: [number, number] = [45.4642, 9.19];

    if (!("geolocation" in navigator)) {
      baseRef.current = fallback;
      if (TRACK_MODE === "demo") alignDemoRouteToBase(fallback);

      trackRef.current = [];
      lastKeptAtRef.current = 0;
      pushPoint(fallback, Date.now());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        baseRef.current = p;

        if (TRACK_MODE === "demo") alignDemoRouteToBase(p);

        trackRef.current = [];
        lastKeptAtRef.current = 0;
        pushPoint(p, Date.now());
      },
      () => {
        if (cancelled) return;
        baseRef.current = fallback;

        if (TRACK_MODE === "demo") alignDemoRouteToBase(fallback);

        trackRef.current = [];
        lastKeptAtRef.current = 0;
        pushPoint(fallback, Date.now());
        toast.error("Location permission denied, using demo location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // DEMO：沿平移后的路线前进 + 少量噪声
    const interval = setInterval(() => {
      if (!demoRouteReadyRef.current) {
        // 保险：如果初始化没拿到 base，也对齐一次
        alignDemoRouteToBase(getBase());
      }

      const route = demoRouteRef.current;
      if (route.length < 2) return;

      let seg = demoSegRef.current;
      let tt = demoTRef.current;

      let a = route[seg];
      let b = route[seg + 1];

      const stepM = DEMO_SPEED_MPS;
      const segLenM = haversineMeters(a, b);
      const dt = segLenM > 0 ? stepM / segLenM : 1;

      tt += dt;

      while (tt >= 1 && seg < route.length - 2) {
        tt -= 1;
        seg += 1;
        a = route[seg];
        b = route[seg + 1];
      }

      if (seg >= route.length - 1) {
        seg = 0;
        tt = 0;
        a = route[0];
        b = route[1];
      }

      let lat = lerp(a[0], b[0], tt);
      let lng = lerp(a[1], b[1], tt);

      const nLat = (Math.random() - 0.5) * 2 * metersToLat(DEMO_NOISE_M);
      const nLng = (Math.random() - 0.5) * 2 * metersToLng(DEMO_NOISE_M, lat);

      const next: [number, number] = [lat + nLat, lng + nLng];

      demoSegRef.current = seg;
      demoTRef.current = tt;

      pushPoint(next, Date.now());

      // issue demo
      if (Math.random() < 0.03) {
        const issueLoc: [number, number] = [
          next[0] + (Math.random() - 0.5) * metersToLat(5),
          next[1] + (Math.random() - 0.5) * metersToLng(5, next[0]),
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

  const handleConfirmIssue = () => {
    if (currentIssue) {
      setDetectedIssues((prev) => [
        ...prev,
        { ...currentIssue, status: "confirmed" },
      ]);
    }
    setShowIssueAlert(false);
    setCurrentIssue(null);
    toast.success("Issue confirmed");
  };

  const handleIgnoreIssue = () => {
    setShowIssueAlert(false);
    setCurrentIssue(null);
  };

  const handleStop = async () => {
    const storedRide = getCurrentRide();
    if (!storedRide) return;
    const baseRide: Ride = { ...storedRide };

    if (trackRef.current.length < 2) {
      toast.error("Not enough points recorded.");
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

  return (
    <div className="h-screen flex flex-col bg-white relative">
      <div className="flex-1 relative">
        <MapView
  userPath={path}
  highlightedPath={selectedRoute?.path}
  currentLocation={path.length ? path[path.length - 1] : undefined}
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

      <AnimatePresence>
        {showIssueAlert && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-80"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <AlertCircleIcon className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            </motion.div>

            <h3 className="text-gray-900 text-center mb-2">
              Road Issue Detected
            </h3>
            <p className="text-gray-600 text-center mb-6">
              System auto-detected possible pothole. Confirm?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleIgnoreIssue}
              >
                <XIcon className="w-5 h-5 mr-2" />
                Ignore
              </Button>
              <Button
                className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
                onClick={handleConfirmIssue}
              >
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
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
