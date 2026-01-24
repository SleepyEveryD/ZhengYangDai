import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import type { User } from "../types/user";

/* ===== Types ===== */
type RouteUI = {
  id: string;
  name: string;
  distance: number;
  duration: number;
  rating: number;
  condition: string;
  path: number[][];
  segments: { condition: string; distance: number }[];
};

type PathResultsProps = {
  user?: User;
};

export default function PathResults({ user }: PathResultsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  /* ---------- 从 URL 读用户输入 ---------- */
  const params = new URLSearchParams(location.search);
  const origin = params.get("origin");
  const destination = params.get("destination");

  /* ---------- State ---------- */
  const [currentLocation, setCurrentLocation] =
    useState<[number, number] | null>(null);
  const [routes, setRoutes] = useState<RouteUI[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  /* ---------- 获取当前位置（只给地图定位用） ---------- */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);


useEffect(() => {
  if (!origin || !destination) return;

  setIsAnimating(true);
  setRoutes([]);
  setSelectedRouteId(null);

 fetch(
  `http://localhost:3000/api/routes?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
)

    .then((res) => {
      if (!res.ok) {
        throw new Error('API failed');
      }
      return res.json();
    })
    .then((data) => {
      console.log('🔥 routes from backend:', data);
      console.log('🧪 first path point:', data[0]?.path?.[0]);
      setRoutes(data);
      setSelectedRouteId(data[0]?.id ?? null);
    })
    .catch((err) => {
      console.error('Failed to fetch routes', err);
     
    })
    .finally(() => {
      setIsAnimating(false);
    });
}, [origin, destination]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/path/planning")}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h2>Route Results</h2>
          <p className="text-gray-500">
            Found {routes.length} routes
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 relative">
        
       <MapView
  currentLocation={currentLocation ?? undefined}
  paths={routes.map((route) => ({
    id: route.id,
    coordinates: route.path.map(
      (p) => [p[0], p[1]] as [number, number]
    ),
    condition: route.condition,
  }))}
/>


        {isAnimating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {routes.map((route) => (
          <div
            key={route.id}
            className="border rounded-lg p-4 border-green-600 bg-green-50"
          >
            <div className="flex justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span>{route.name}</span>
                  <Badge className="bg-green-600">Recommended</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {route.rating}
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {route.condition}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <RulerIcon className="w-4 h-4 inline mr-1" />
                {route.distance.toFixed(1)} km
              </div>
              <div>
                <ClockIcon className="w-4 h-4 inline mr-1" />
                {route.duration} min
              </div>
              <div>
                <TrendingUpIcon className="w-4 h-4 inline mr-1" />
                {route.segments.length} seg
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() =>
                navigate(`/path/${route.id}`, {
                  state: { route },
                })
              }
            >
              View Details
            </Button>
          </div>
        ))}

        {!user && (
          <Button
            className="w-full mt-4"
            onClick={() => navigate("/login")}
          >
            <LogInIcon className="w-4 h-4 mr-2" />
            Login
          </Button>
        )}
      </div>
    </div>
  );
}
