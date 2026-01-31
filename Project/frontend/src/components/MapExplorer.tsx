import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  SearchIcon,
  NavigationIcon,
  CircleDotIcon,
  UserIcon,
  LogInIcon,
} from "lucide-react";
import MapView from "./MapView";
import type { User } from "../types/user";
import { useNavigate } from "react-router-dom";

type MapExplorerProps = {
  user: User | null;
};

export default function MapExplorer({ user }: MapExplorerProps) {
  const navigate = useNavigate();

  const [currentLocation, setCurrentLocation] =
    useState<[number, number]>();
  const [locReady, setLocReady] = useState(false);
  const [highlightedPath, setHighlightedPath] =
    useState<[number, number][]>([]);
  const [issues, setIssues] = useState<
    { location: [number, number]; type?: string }[]
  >([]);

  /* ===== 获取定位 ===== */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation([
          pos.coords.latitude,
          pos.coords.longitude,
        ]);
        setLocReady(true);
      },
      () => setLocReady(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* ===== 自动分析示例路线 ===== */
  useEffect(() => {
    if (!currentLocation) return;

    fetch(`${import.meta.env.VITE_API_BASE_URL}/map/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: {
          lat: currentLocation[0],
          lng: currentLocation[1],
        },
        destination: {
          lat: currentLocation[0] + 0.01,
          lng: currentLocation[1] + 0.01,
        },
        travelMode: "BICYCLING",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setHighlightedPath(data.highlightedPath ?? []);
        setIssues([]);
      })
      .catch(() => {});
  }, [currentLocation]);

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden">
      {/* ================= Top Bar ================= */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div
            onClick={() => navigate("/path/planning")}
            className="
              flex-1 bg-white
              rounded-full
              px-3 py-2 sm:px-4 sm:py-3
              shadow sm:shadow-lg
              flex items-center gap-2 sm:gap-3
              cursor-pointer
            "
          >
            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <span className="text-gray-400 text-sm sm:text-base truncate">
              Search destination or plan route…
            </span>
          </div>

          {/* User */}
          {user ? (
            <div
              onClick={() => navigate("/profile")}
              className="bg-white rounded-full p-2 shadow sm:shadow-lg cursor-pointer"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-green-600 text-white">
                  <UserIcon className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              className="
                h-10 sm:h-11
                px-3 sm:px-4
                bg-white text-green-600
                shadow sm:shadow-lg
                hover:bg-gray-50
                focus-visible:ring-0
              "
            >
              <LogInIcon className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>

      {/* ================= Map ================= */}
      <div className="absolute inset-0">
        <MapView
          key={locReady ? "map-ready" : "map-wait"}
          currentLocation={currentLocation}
          highlightedPath={highlightedPath}
          issues={issues}
        />
      </div>

      {/* ================= Bottom Action Bar ================= */}
      <div
        className="
          absolute bottom-0 left-0 right-0 z-10
          p-3 sm:p-4
          bg-gradient-to-t from-black/30 to-transparent
        "
      >
        <div className="flex gap-2 sm:gap-3">
          {/* ✅ Plan Route（已修复 hover 变黑） */}
          <Button
            onClick={() => navigate("/path/planning")}
            className="
              flex-1
              h-12 sm:h-14
              bg-white text-gray-900
              rounded-xl sm:rounded-2xl
              shadow sm:shadow-lg
              hover:bg-gray-50
              active:bg-gray-100
              focus-visible:ring-0
            "
          >
            <NavigationIcon className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="text-sm sm:text-base">
              Plan Route
            </span>
          </Button>

          {/* Start Recording */}
          {user && (
            <Button
              onClick={() => navigate("/ride/prepare")}
              className="
                flex-1
                h-12 sm:h-14
                bg-green-600 hover:bg-green-700
                rounded-xl sm:rounded-2xl
                shadow sm:shadow-lg
                text-white
                focus-visible:ring-0
              "
            >
              <CircleDotIcon className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm sm:text-base">
                Start Recording
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* ================= Guest Notice ================= */}
      {!user && (
        <div
          className="
            fixed sm:absolute
            bottom-20 sm:top-20
            left-4 right-4
            z-20
            bg-blue-50 border border-blue-200
            rounded-xl
            p-4
            shadow-lg
          "
        >
          <p className="text-blue-900 font-semibold mb-1">
            Guest Mode
          </p>
          <p className="text-blue-800 text-sm mb-3">
            You can view routes, but recording rides and reporting
            issues requires login.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="
              w-full h-10
              bg-blue-600 hover:bg-blue-700
              text-white
              focus-visible:ring-0
            "
          >
            <LogInIcon className="w-4 h-4 mr-2" />
            Login to Unlock
          </Button>
        </div>
      )}
    </div>
  );
}
