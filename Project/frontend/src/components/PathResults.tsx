import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  StarIcon,
  ClockIcon,
  RulerIcon,
  TrendingUpIcon,
  LogInIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import MapView from "./MapView";
import { motion } from "motion/react";
import type { Route } from "../types/route";
import type { User } from "../types/user";

declare global {
  interface Window {
    google: any;
  }
}

type PathResultsProps = {
  user?: User;
};

type NavState = {
  originText?: string;
  originCoords?: [number, number] | null;
  destinationText?: string;
};

function decodeOverviewPath(google: any, encoded: string): [number, number][] {
  // Directions API 可能会给 overview_polyline.points（encoded）
  // 用 geometry.encoding.decodePath 解码
  const arr = google.maps.geometry.encoding.decodePath(encoded);
  return arr.map((p: any) => [p.lat(), p.lng()]);
}

export default function PathResults({ user }: PathResultsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as NavState;

  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const originForDirections = useMemo(() => {
    if (state.originCoords) return { lat: state.originCoords[0], lng: state.originCoords[1] };
    return state.originText || "Current Location";
  }, [state.originCoords, state.originText]);

  const destinationForDirections = useMemo(() => {
    return state.destinationText || "";
  }, [state.destinationText]);

  // ✅ 确保 Google Maps script 已加载：MapView 内部在加载
  // 这里简单轮询 window.google.maps 是否存在
  const waitForGoogleMaps = async () => {
    for (let i = 0; i < 60; i++) {
      if (window.google?.maps) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      if (!destinationForDirections) {
        setRoutes([]);
        setSelectedRouteId("");
        setLoading(false);
        return;
      }

      const ok = await waitForGoogleMaps();
      if (!ok) {
        console.error("Google Maps not loaded");
        setLoading(false);
        return;
      }

      const google = window.google;

      // ⚠️ geometry 解码需要 libraries=geometry
      // 你 MapView 的 script 现在是 `.../maps/api/js?key=xxx`
      // 需要改成：`.../maps/api/js?key=xxx&libraries=geometry`
      // 否则 decodePath 不存在（下面会 fallback）
      const hasGeometry = !!google.maps.geometry?.encoding?.decodePath;

      const service = new google.maps.DirectionsService();

      service.route(
        {
          origin: originForDirections,
          destination: destinationForDirections,
          travelMode: google.maps.TravelMode.BICYCLING,
          provideRouteAlternatives: true, // ✅ 多条路线
        },
        (result: any, status: any) => {
          if (status !== "OK" || !result?.routes?.length) {
            console.error("Directions failed:", status, result);
            setRoutes([]);
            setSelectedRouteId("");
            setLoading(false);
            return;
          }

          const mapped: Route[] = result.routes.map((r: any, idx: number) => {
            // 取第一段 leg
            const leg = r.legs?.[0];

            // 路径：优先用 overview_path（不需要 geometry library）
            let path: [number, number][] = [];
            if (Array.isArray(r.overview_path) && r.overview_path.length) {
              path = r.overview_path.map((p: any) => [p.lat(), p.lng()]);
            } else if (hasGeometry && r.overview_polyline?.points) {
              path = decodeOverviewPath(google, r.overview_polyline.points);
            }

            const distanceKm = leg?.distance?.value ? leg.distance.value / 1000 : 0;
            const durationMin = leg?.duration?.value ? Math.round(leg.duration.value / 60) : 0;

            // 你现有 UI 需要 rating/condition/segments，这里先给合理默认值（后面你再接后端）
            const condition: Route["condition"] = idx === 0 ? "excellent" : idx === 1 ? "good" : "fair";

            return {
              id: String(idx + 1),
              name: idx === 0 ? "Recommended Route" : idx === 1 ? "Shortest Route" : `Alternative Route ${idx + 1}`,
              distance: Number(distanceKm.toFixed(1)),
              duration: durationMin,
              rating: idx === 0 ? 4.5 : idx === 1 ? 4.0 : 3.7,
              condition,
              path,
              elevation: [], // 先空
              segments: [
                {
                  condition,
                  distance: Number(distanceKm.toFixed(1)),
                  description: "From Google Directions",
                },
              ],
              comments: [],
            };
          });

          setRoutes(mapped);
          setSelectedRouteId(mapped[0]?.id || "");
          setLoading(false);
        }
      );
    };

    run();
  }, [originForDirections, destinationForDirections]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const getConditionColor = (condition: Route["condition"]) => {
    switch (condition) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
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
      case "poor":
        return "Poor";
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
          <p className="text-gray-500">
            Found {routes.length} routes
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 relative">
        <MapView
          currentLocation={state.originCoords ?? undefined}
          highlightedPaths={
            selectedRoute
              ? [
                  {
                    id: selectedRoute.id,
                    coordinates: selectedRoute.path,
                    condition: selectedRoute.condition,
                  },
                ]
              : []
          }
        />

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
          {routes.map((route, index) => (
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
                      <span className="text-gray-900">{route.name}</span>
                      {index === 0 && (
                        <Badge className="bg-green-600">Recommended</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-600">{route.rating}</span>
                    </div>
                  </div>
                  <Badge className={getConditionColor(route.condition)}>
                    {getConditionText(route.condition)}
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
                      <p className="text-gray-900">{route.segments.length} seg</p>
                      <p className="text-gray-500">Segments</p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/path/${route.id}`, { state: { route } }); // ✅ 把 route 传给详情页
                  }}
                >
                  View Details
                </Button>
              </div>
            </motion.div>
          ))}

          {!loading && routes.length === 0 && (
            <div className="text-gray-600 p-4 border rounded-lg">
              No routes found. Check your API key / Directions API / billing.
            </div>
          )}

          {/* Guest Login Prompt */}
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
