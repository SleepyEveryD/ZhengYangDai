import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../auth/AuthContext";
import {
  ArrowLeftIcon,
  ClockIcon,
  RulerIcon,
  TrendingUpIcon,
  LogInIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import MapView from "./MapView";
import { motion } from "motion/react";
import type { Route } from "../types/route";

type ExplainPayload = {
  mode?: "real" | "mock";
  roadCondition?: {
    final?: string;
    confidence?: number;
    usedScore?: number;
    weightMapping?: Record<string, number>;
  };
  efficiency?: {
    distanceKm?: number;
    durationMin?: number;
    minDistanceKm?: number;
    minDurationMin?: number;
    distanceNorm?: number;
    durationNorm?: number;
    efficiencyScore?: number;
  };
  finalScoreFormula?: string;
};

type BackendRoute = {
  id: string;
  name?: string;
  distance: number;
  duration: number;

  // ✅ 后端返回是 condition: "good" | "excellent" | "fair" | "need_repair"(或 "needRepair")
  // 你现在 UI 用的是 needRepair，所以这里兼容两种写法
  condition: "excellent" | "good" | "fair" | "needRepair" | "need_repair";
  path: [number, number][];

  // 可选字段：后端不保证一定有
  score?: number;
  confidence?: number;
  explain?: ExplainPayload;
};

type NavState = {
  originText?: string;
  originCoords?: [number, number] | null;
  destinationText?: string;
};

export default function PathResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as NavState;

  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const originForDirections = useMemo(() => {
    if (state.originCoords)
      return { lat: state.originCoords[0], lng: state.originCoords[1] };
    return state.originText || "Current Location";
  }, [state.originCoords, state.originText]);

  const destinationForDirections = useMemo(() => {
    return state.destinationText || "";
  }, [state.destinationText]);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!destinationForDirections) {
        setRoutes([]);
        setSelectedRouteId("");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("http://localhost:3000/map/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: originForDirections,
            destination: destinationForDirections,
            travelMode: "BICYCLING",
          }),
        });

        const data = await res.json();
        const list: BackendRoute[] = data.routes || [];

        // ✅ 先 setState，再打印（避免某条 route 缺字段导致你整个页面崩）
        setRoutes(list);
        setSelectedRouteId(list?.[0]?.id || "");

        // ✅ “解释为什么是 good”：安全打印（有 explain 打 explain，没有就打印 fallback）
        list.forEach((route, idx) => {
          const cond = (route.condition || "unknown").toString().toUpperCase();

          console.group(`🛣 Route ${idx + 1} (${cond})`);

          if (route.score !== undefined) {
            console.log("Final score:", route.score);
          } else {
            console.log("Final score: (not provided by backend)");
          }

          if (route.explain?.roadCondition) {
            console.log("Road condition decision:", route.explain.roadCondition);
          } else {
            console.log(
              "Road condition decision: (no explain from backend) → using condition field =",
              route.condition
            );
          }

          if (route.explain?.efficiency) {
            console.log("Efficiency decision:", route.explain.efficiency);
          }

          if (route.explain?.finalScoreFormula) {
            console.log("Formula:", route.explain.finalScoreFormula);
          }

          console.groupEnd();
        });
      } catch (err) {
        console.error("failed to fetch routes", err);
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [originForDirections, destinationForDirections]);

  const coloredPaths = useMemo(() => {
    const colors = ["#2563eb", "#16a34a", "#f97316"];
    return routes.map((r, index) => ({
      id: r.id,
      path: r.path,
      color: colors[index % colors.length],
      weight: r.id === selectedRouteId ? 7 : 4,
    }));
  }, [routes, selectedRouteId]);

  const normalizeCondition = (
    c: BackendRoute["condition"]
  ): Route["condition"] => {
    // 把后端可能返回的 need_repair 统一成 needRepair
    if (c === "need_repair") return "needRepair";
    return c as Route["condition"];
  };

  const getConditionColor = (condition: Route["condition"]) => {
    switch (condition) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "needRepair":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConditionText = (condition: Route["condition"]) => {
    switch (condition) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "needRepair":
        return "Needs Repair";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/path/planning")}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-gray-900">Route Results</h2>
          <p className="text-gray-500">Found {routes.length} routes</p>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 relative">
        <MapView currentLocation={state.originCoords ?? undefined} paths={coloredPaths} />

        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3"
              />
              <p className="text-gray-600">Calculating best route...</p>
            </div>
          </div>
        )}
      </div>

      {/* Route List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {routes.map((route, index) => {
            const cond = normalizeCondition(route.condition);

            return (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedRouteId === route.id
                      ? "border-green-600 bg-green-50 shadow-md"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                  onClick={() => setSelectedRouteId(route.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900">
                          {route.name ?? `Route ${index + 1}`}
                        </span>
                        {index === 0 && (
                          <Badge className="bg-green-600">Recommended</Badge>
                        )}
                      </div>
                    </div>

                    <Badge className={getConditionColor(cond)}>
                      {getConditionText(cond)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <RulerIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-900">{route.distance} km</p>
                        <p className="text-gray-500">Distance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-900">{route.duration} min</p>
                        <p className="text-gray-500">Duration</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-900">1 seg</p>
                        <p className="text-gray-500">Segments</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/path/${route.id}`, { state: { route } });
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {!loading && routes.length === 0 && (
            <div className="text-gray-600 p-4 border rounded-lg">
              No routes found. Check your API key / Directions API / billing.
            </div>
          )}

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-blue-900 mb-3 text-center">
                <strong>Login to record rides and report road conditions</strong>
              </p>
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate("/login")}
              >
                <LogInIcon className="w-5 h-5 mr-2" />
                Login Now
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
