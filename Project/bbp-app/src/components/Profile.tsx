import React from "react";
import { useNavigate } from "react-router-dom";
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
import type { User } from "../types/user";

type ProfileProps = {
  user?: User;
};

export default function Profile({ user }: ProfileProps) {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Not logged in</p>
      </div>
    );
  }

  const handleLogout = () => {
    // ⚠️ 后续这里可以接 store / API
    navigate("/login");
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
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Profile</h2>
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
            <div className="flex-1">
              <h2 className="text-white mb-1">{user.name}</h2>
              <p className="text-white/80">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-white mb-1">
                {user.totalDistance.toFixed(1)}
              </p>
              <p className="text-white/80">kilometers</p>
            </div>
            <div className="text-center">
              <p className="text-white mb-1">{user.totalRides}</p>
              <p className="text-white/80">rides</p>
            </div>
            <div className="text-center">
              <p className="text-white mb-1">{user.totalReports}</p>
              <p className="text-white/80">reports</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <BikeIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-gray-900 mb-1">{user.totalRides}</p>
                <p className="text-gray-600">Total Rides</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <MapPinIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-900 mb-1">
                  {user.totalDistance.toFixed(1)} km
                </p>
                <p className="text-gray-600">Total Distance</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-gray-900 mb-4">This Week's Stats</h3>
              <div className="h-32 flex items-end justify-between gap-2">
                {[12, 8, 15, 20, 18, 25, 22].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{
                        height: `${(height / 25) * 100}%`,
                      }}
                    />
                    <span className="text-gray-500 mt-2">
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
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BikeIcon className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-gray-900">My Rides</p>
                      <p className="text-gray-500">
                        {user.totalRides} records
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
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircleIcon className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="text-gray-900">My Reports</p>
                      <p className="text-gray-500">
                        {user.totalReports} records
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
