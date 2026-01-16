import React, { useEffect, useMemo, useRef, useState } from "react";
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

// ✅ 你已有的 API 文件：src/api/trips.ts
import { startTrip, stopTrip } from "../api/trips";
// ✅ 你已有 AuthProvider，配合这个 hook：src/auth/useAuth.ts
import { useAuth } from "../auth/useAuth";

export default function RideRecording() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [tripId, setTripId] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [path, setPath] = useState<[number, number][]>([]);
  const [detectedIssues, setDetectedIssues] = useState<Issue[]>([]);
  const [showIssueAlert, setShowIssueAlert] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null);

  // 防止弹窗开着时还不断触发新 issue（避免覆盖 currentIssue + toast 轰炸）
  const showIssueAlertRef = useRef(false);
  useEffect(() => {
    showIssueAlertRef.current = showIssueAlert;
  }, [showIssueAlert]);

  // ✅ MapView 首帧不崩溃：path 为空给 fallback
  const currentLocation = useMemo<[number, number]>(() => {
    return path.length ? path[path.length - 1] : [39.9042, 116.4074];
  }, [path]);

  // ✅ 进入页面： noticing
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let timer: number | null = null;
    let cancelled = false;

    (async () => {
      try {
        // 1) Start Trip（写入 Supabase）
        const trip = await startTrip(user.id);
        if (cancelled) return;

        setTripId(trip.id);
        toast.success("Trip started");

        // 2) 录制本地 demo 数据（你后续换成真实 GPS/传感器即可）
        timer = window.setInterval(() => {
          setDuration((prev) => prev + 1);
          setDistance((prev) => prev + 0.01);
          setSpeed(Math.random() * 15 + 10);

          // path 加上限，避免越跑越卡
          setPath((prev) => {
            const next = [
              ...prev,
              [39.9042 + Math.random() * 0.01, 116.4074 + Math.random() * 0.01] as [number, number],
            ];
            return next.length > 2000 ? next.slice(-2000) : next;
          });

          // issue demo：弹窗开着就不再触发新的
          if (!showIssueAlertRef.current && Math.random() < 0.05) {
            const newIssue: Issue = {
              id: `issue-${Date.now()}`,
              type: "pothole",
              location: [
                39.9042 + Math.random() * 0.01,
                116.4074 + Math.random() * 0.01,
              ],
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
      } catch (e: any) {
        toast.error("Failed to start trip");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [loading, user]);

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

  // ✅ Stop：调用后端 stopTrip，然后去 history（Day3 验收点）
  const handleStop = async () => {
    if (!tripId) {
      toast.error("Trip not started yet");
      return;
    }

    try {
      await stopTrip(tripId, parseFloat(distance.toFixed(2)), duration);
      toast.success("Trip stopped & saved");
      navigate("/trips/history");
    } catch (e: any) {
      toast.error("Failed to stop trip");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Please login first</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          userPath={path}
          currentLocation={currentLocation}
          issues={detectedIssues.map((issue) => ({
            location: issue.location,
            type: issue.type,
          }))}
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

        {/* debug: tripId */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          TripId: {tripId ?? "starting..."}
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
          disabled={!tripId}
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
