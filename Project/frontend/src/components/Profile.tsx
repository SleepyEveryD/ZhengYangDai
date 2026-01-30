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

  // ✅ 不再用 0 作为初始值
  const [totalRides, setTotalRides] = useState<number | null>(null);
  const [totalReports, setTotalReports] = useState<number | null>(null);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!user) return <Navigate to="/login" replace />;
  console.log("user log", user);
  

  useEffect(() => {
    let mounted = true;

    setIsLoading(true);

    getProfileSummary()
      .then((data) => {
        if (!mounted) return;

        setTotalRides(Number(data.ridesCount ?? 0));
        setTotalReports(Number(data.confirmedRidesCount ?? 0));
        setTotalDistanceKm(Number(data.totalDistanceKm ?? 0));
      })
      .catch((err) => {
        console.error("[PROFILE_FETCH_ERROR]", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      return;
    }
    localStorage.clear();
    sessionStorage.clear();

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

          {/* ✅ Stats —— 方案 A */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="text-white/70">Loading…</div>
              <div className="text-white/70">Loading…</div>
              <div className="text-white/70">Loading…</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-white mb-1 font-semibold">
                  {totalDistanceKm < 1
                    ? Math.round(totalDistanceKm * 1000)
                    : totalDistanceKm.toFixed(1)}
                </p>
                <p className="text-white/80 text-sm">
                  {totalDistanceKm < 1 ? "meters" : "kilometers"}
                </p>
              </div>

              <div className="text-center">
                <p className="text-white mb-1 font-semibold">
                  {totalRides}
                </p>
                <p className="text-white/80 text-sm">rides</p>
              </div>

              <div className="text-center">
                <p className="text-white mb-1 font-semibold">
                  {totalReports}
                </p>
                <p className="text-white/80 text-sm">reports</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          {!isLoading && (
            <div className="grid grid-cols-2 gap-3">
            
            </div>
          )}

          {/* Weekly Chart —— 原样保留 */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-gray-900 mb-4 font-semibold">
                This Week&apos;s Stats
              </h3>
              <div className="h-32 flex items-end justify-between gap-2">
                {[12, 8, 15, 20, 18, 25, 22].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-green-500 rounded-t"
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
          {!isLoading && (
            <div className="space-y-2">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/rides")}
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

        
            </div>
          )}

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
