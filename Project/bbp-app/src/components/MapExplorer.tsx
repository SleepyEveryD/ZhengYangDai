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
  user: User;
};

export default function MapExplorer({ user }: MapExplorerProps) {
  const navigate = useNavigate();
  const [showLegend, setShowLegend] = useState(true);

  const [currentLocation, setCurrentLocation] =
    useState<[number, number] | undefined>(undefined);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);



  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex-1 bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate("/path/planning")}
          >
            <SearchIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">
              Search destination or plan route...
            </span>
          </div>

          {user ? (
            <div
              className="bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => navigate("/profile")}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-green-600 text-white">
                  <UserIcon className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <Button
              className="bg-white text-green-600 hover:bg-gray-50 shadow-lg h-11 px-4"
              onClick={() => navigate("/login")}
            >
              <LogInIcon className="w-5 h-5 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView currentLocation={currentLocation} paths={[]} />

        {showLegend && (
          <div className="absolute top-24 right-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">Road Legend</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-green-500 rounded" />
                <span className="text-gray-600">Excellent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-500 rounded" />
                <span className="text-gray-600">Good</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-yellow-500 rounded" />
                <span className="text-gray-600">Fair</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-red-500 rounded" />
                <span className="text-gray-600">Needs Repair</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          <Button
            className="flex-1 h-14 bg-white text-gray-900 hover:bg-gray-50 shadow-lg"
            onClick={() => navigate("/path/planning")}
          >
            <NavigationIcon className="w-5 h-5 mr-2" />
            Plan Route
          </Button>

          {user && (
            <Button
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 shadow-lg"
              onClick={() => navigate("/ride/prepare")}
            >
              <CircleDotIcon className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          )}
        </div>
      </div>

      {!user && (
        <div className="absolute top-20 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
          <p className="text-blue-900 mb-2">
            <strong>Guest Mode</strong>
          </p>
          <p className="text-blue-800">
            You can view route planning, but cannot record rides or report road
            conditions.
          </p>
          <Button
            className="w-full mt-3 h-10 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate("/login")}
          >
            <LogInIcon className="w-4 h-4 mr-2" />
            Login to Unlock Full Features
          </Button>
        </div>
      )}
    </div>
  );
}
