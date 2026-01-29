import { useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  BikeIcon,
  MapPinIcon,
  AlertCircleIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";
import { getProfileSummary } from "../hooks/profile.api";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [totalRides, setTotalRides] = useState(0);
  const [totalReports, setTotalReports] = useState(0);

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    let mounted = true;

    getProfileSummary()
      .then((data) => {
        if (!mounted) return;
        setTotalRides(Number(data.ridesCount ?? 0));
        setTotalReports(Number(data.reportsCount ?? 0));
      })
      .catch((err) => {
        console.error("[PROFILE_FETCH_ERROR]", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 保持原逻辑：distance 目前只是占位
  const totalDistance = Number(user.totalDistance ?? 0);

  const handleLogout = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      return;
    }

    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/map")}
          className="h-10 w-10"
          aria-label="Back to map"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900 text-lg font-semibold">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* User Info */}
        <div className="bg-gradient-to-br from-green-600 to-blue-600 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 border-4 border-white">
              <AvatarFallback className="bg-white text-green-600">
                <UserIcon className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h2 className="text-white mb-1 truncate">
                {user.name ?? "Anonymous"}
              </h2>
              <p className="text-white/80 truncate">{user.email ?? ""}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-white mb-1 font-semibold">
                {totalDistance.toFixed(1)}
              </p>
              <p className="text-white/80 text-sm">kilometers</p>
            </div>
            <div className="text-center">
              <p className="text-white mb-1 font-semibold">{totalRides}</p>
              <p className="text-white/80 text-sm">rides</p>
            </div>
            <div className="text-center">
              <p className="text-white mb-1 font-semibold">{totalReports}</p>
              <p className="text-white/80 text-sm">reports</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <BikeIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-gray-900 mb-1 font-semibold">
                  {totalRides}
                </p>
                <p className="text-gray-600 text-sm">Total Rides</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <MapPinIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-900 mb-1 font-semibold">
                  {totalDistance.toFixed(1)} km
                </p>
                <p className="text-gray-600 text-sm">Total Distance</p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ Weekly Chart —— 原样完整保留 */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-gray-900 mb-4 font-semibold">
                This Week&apos;s Stats
              </h3>
              <div className="h-32 flex items-end justify-between gap-2">
                {[12, 8, 15, 20, 18, 25, 22].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{ height: `${(height / 25) * 100}%` }}
                    />
                    <span className="text-gray-500 mt-2 text-xs">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <div className="space-y-2">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/rides")}
              role="button"
              tabIndex={0}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BikeIcon className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-gray-900 font-medium">My Rides</p>
                      <p className="text-gray-500 text-sm">
                        {totalRides} records
                      </p>
                    </div>
                  </div>
                  <ArrowLeftIcon className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/reports")}
              role="button"
              tabIndex={0}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircleIcon className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="text-gray-900 font-medium">My Reports</p>
                      <p className="text-gray-500 text-sm">
                        {totalReports} records
                      </p>
                    </div>
                  </div>
                  <ArrowLeftIcon className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleLogout}
          >
            <LogOutIcon className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
