import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { getCurrentRide,saveRideLocal } from '../services/rideStorage';


/**
 * TRACK_MODE:
 * - "real": 用真实 GPS 轨迹（watchPosition）
 * - "demo": 用真实定位作为 base，然后附近随机抖动（演示用）
 */
const TRACK_MODE: "real" | "demo" = "demo";

// demo 抖动幅度（单位：度）
// 0.001 ≈ 111m（纬度方向），demo 用 0.0003~0.001 比较舒服
const DEMO_JITTER = 0.0006;

export default function RideRecording() {
  const navigate = useNavigate();


  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);

  const [path, setPath] = useState<[number, number][]>([]);
  const [detectedIssues, setDetectedIssues] = useState<Issue[]>([]);
  const [showIssueAlert, setShowIssueAlert] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null);

  // 真实定位 base（用于 demo/兜底）
  const baseRef = useRef<[number, number] | null>(null);

  // 让 issue 生成也跟着 base
  const getBase = useMemo(() => {
    return () => baseRef.current ?? [45.4642, 9.19]; // Milan fallback
  }, []);

  // 1) 初始化：获取一次定位，确保 path 第一帧不是北京
  useEffect(() => {
    let cancelled = false;

    const fallback: [number, number] = [45.4642, 9.19]; // Milan

    if (!("geolocation" in navigator)) {
      baseRef.current = fallback;
      setPath([fallback]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        baseRef.current = p;
        setPath([p]); // ✅ 第一帧就定位到当前城市
      },
      () => {
        if (cancelled) return;
        baseRef.current = fallback;
        setPath([fallback]);
        toast.error("Location permission denied, using demo location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) 计时/里程/速度（你原来的 demo 逻辑）
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);

      // demo 距离累加：每秒 0.01km = 10m/s（只是示意）
      setDistance((prev) => prev + 0.01);

      // demo 速度
      setSpeed(Math.random() * 15 + 10);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3) 轨迹录制：REAL / DEMO 二选一
  useEffect(() => {
    if (TRACK_MODE === "real") {
      // --- REAL GPS ---
      if (!("geolocation" in navigator)) return;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          baseRef.current = p; // 顺便更新 base，给 issue 用
          setPath((prev) => {
            if (!prev.length) return [p];
            const last = prev[prev.length - 1];

            // 防抖：点太密的话可过滤（这里简单过滤重复点）
            if (last[0] === p[0] && last[1] === p[1]) return prev;
            return [...prev, p].slice(-3000); // 防止无限增长
          });
        },
        (err) => {
          console.error(err);
          toast.error("GPS tracking failed, switching to demo.");
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }

    // --- DEMO ---
    const interval = setInterval(() => {
      const base = getBase();
      const [bLat, bLng] = base;

      const next: [number, number] = [
        bLat + (Math.random() - 0.5) * DEMO_JITTER,
        bLng + (Math.random() - 0.5) * DEMO_JITTER,
      ];

      setPath((prev) => [...prev, next].slice(-3000));

      // issue demo：概率触发，地点跟 base 走
      if (Math.random() < 0.05) {
        const issueLoc: [number, number] = [
          bLat + (Math.random() - 0.5) * DEMO_JITTER,
          bLng + (Math.random() - 0.5) * DEMO_JITTER,
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

        toast.warning("Road issue detected", {
          description: "Please confirm to report this issue",
          duration: 3000,
        });
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

// GeoJSON → path 的简单转换
  const geoJsonToPath = (geo: GeoJSON.LineString): [number, number][] => {
    return geo.coordinates.map(
      ([lng, lat]) => [lat, lng] // ⚠️ 注意你项目里是 [lat, lng]
    );
  };

  const handleStop = () => {
    const currentRide = getCurrentRide();
    if (!currentRide) return;

    const safeDuration = Math.max(duration, 1);
    const avgSpeed = distance / (safeDuration / 3600);

    const routeGeoJsonMock: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [9.1876, 45.4635],
        [9.1884, 45.4641],
        [9.1891, 45.4646],
        [9.1899, 45.4651],
        [9.1906, 45.4656],
      ],
    };

    const updatedRide = {
      ...currentRide,
      routeGeoJson: routeGeoJsonMock,

      endedAt: new Date(),
      avgSpeed: Number(avgSpeed.toFixed(1)),
      date: new Date().toISOString(),
      distance: parseFloat(distance.toFixed(2)),
      duration,
      maxSpeed: parseFloat((speed * 1.5).toFixed(1)),
      // ✅ 核心：保证 confirm 页继续用 path
      path: geoJsonToPath(routeGeoJsonMock),
      issues: detectedIssues,
      uploadStatus: "draft" as const,

    };

    saveRideLocal(updatedRide);
    navigate("/ride/confirm", { state: { ride: updatedRide } });
  };

  

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          userPath={path}
          currentLocation={path.length ? path[path.length - 1] : undefined}
          issues={detectedIssues.map((issue) => ({
            location: issue.location,
            type: issue.type,
          }))}
          followUser // ✅ 录制页跟随
        />
      </div>

      {/* Stats */}
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

      {/* Issue Alert */}
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

      {/* Stop Button */}
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

      {/* Issues Counter */}
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
