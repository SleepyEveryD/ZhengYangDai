import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  StarIcon,
  MessageCircleIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  LogInIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import MapView from "./MapView";
import type { User } from "../types/user";
import type { Route } from "../types/route";

type PathDetailProps = {
  user?: User;
};

/* ===== fallback data (frontend-only) ===== */
const fallbackElevation = [0, 3, 6, 10, 8, 12, 15, 18, 20, 22];

export default function PathDetail({ user }: PathDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [route, setRoute] = useState<Route | null>(null);

  /* ---------- Resolve & normalize route ---------- */
  useEffect(() => {
    const raw =
      location.state?.route ??
      (() => {
        const cached = sessionStorage.getItem("selectedRoute");
        return cached ? JSON.parse(cached) : null;
      })();

    if (!raw) return;

    const normalized: Route = {
      ...raw,
      elevation: raw.elevation ?? fallbackElevation,
      comments: raw.comments ?? [],
      segments:
        raw.segments && raw.segments.length > 0
          ? raw.segments
          : [
              {
                condition: raw.condition ?? "good",
                distance: raw.distance ?? 0,
                description: "Estimated from real route",
              },
            ],
    };

    setRoute(normalized);
  }, [location.state]);

  if (!route) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Route not found</p>
      </div>
    );
  }

  /* ---------- helpers ---------- */
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
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">{route.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            paths={[
              {
                id: route.id,
                coordinates: route.path,
                condition: route.condition,
              },
            ]}
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span>{route.rating} points</span>
                </div>
                <Badge className={getConditionColor(route.condition)}>
                  {getConditionText(route.condition)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p>{route.distance} km</p>
                  <p className="text-gray-500">Distance</p>
                </div>
                <div>
                  <p>{route.duration} min</p>
                  <p className="text-gray-500">Duration</p>
                </div>
                <div>
                  <p>{route.segments.length}</p>
                  <p className="text-gray-500">Segments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elevation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUpIcon className="w-5 h-5" />
              Elevation Change
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="h-32 flex items-end gap-1">
                  {route.elevation.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-green-500 rounded-t"
                      style={{ height: `${(h / 25) * 100}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircleIcon className="w-5 h-5" />
              Reviews ({route.comments.length})
            </div>

            {route.comments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No user reviews yet
                </CardContent>
              </Card>
            ) : (
              route.comments.map((c, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex gap-3">
                    <Avatar>
                      <AvatarFallback>{c.user[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{c.user}</p>
                      <p className="text-gray-600">{c.content}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="p-4 border-t">
        <Button className="w-full h-14 bg-green-600 hover:bg-green-700">
          Select This Route
        </Button>

        {!user && (
          <Button
            variant="outline"
            className="w-full mt-2"
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
