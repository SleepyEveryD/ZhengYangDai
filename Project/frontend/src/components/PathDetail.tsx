import React from "react";
import { Button } from "./ui/button";
import { useAuth } from "../auth/AuthContext";
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
import type { Route } from "../types/route";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { saveRideLocal } from '../services/rideStorage';



export default function PathDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const route = location.state?.route as Route | undefined;

  if (!route) {
    
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Route not found</p>
      </div>
    );
  }
  const safeRoute = {
  ...route,
  rating: route.rating ?? 0,
  segments: route.segments ?? [],
  comments: route.comments ?? [],
  elevation: route.elevation ?? [],
};



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
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">{safeRoute.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView highlightedPath={safeRoute.path} />

        </div>

        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-gray-900">
                    {safeRoute.rating} points
                  </span>
                </div>
                <Badge className={getConditionColor(safeRoute.condition)}>
                  {getConditionText(safeRoute.condition)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-900">{safeRoute.distance} km</p>
                  <p className="text-gray-500">Total Distance</p>
                </div>
                <div>
                  <p className="text-gray-900">{safeRoute.duration} min</p>
                  <p className="text-gray-500">Est. Duration</p>
                </div>
                <div>
                  <p className="text-gray-900">
                    {safeRoute.segments.length} seg
                  </p>
                  <p className="text-gray-500">Segments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Road Segments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircleIcon className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Segment Details</span>
            </div>
            <div className="space-y-3">
              {safeRoute.segments.map((segment, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-1 h-full rounded-full ${
                          segment.condition === "excellent"
                            ? "bg-green-500"
                            : segment.condition === "good"
                            ? "bg-blue-500"
                            : segment.condition === "fair"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-900">
                            Segment {index + 1}
                          </span>
                          <Badge
                            className={getConditionColor(
                              segment.condition
                            )}
                            variant="secondary"
                          >
                            {getConditionText(segment.condition)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {segment.description}
                        </p>
                        <p className="text-gray-500">
                          {segment.distance} km
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircleIcon className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">
                User Reviews ({safeRoute.comments.length})
              </span>
            </div>

            {safeRoute.comments.length > 0 ? (
              <div className="space-y-3">
                {safeRoute.comments.map((comment, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-green-600 text-white">
                            {comment.user[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-900">
                              {comment.user}
                            </span>
                            <span className="text-gray-500">
                              {comment.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`w-4 h-4 ${
                                  i < comment.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-gray-600">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    No user reviews yet
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t bg-white space-y-3">
     <Button
  className="w-full h-14 bg-green-600 hover:bg-green-700"
  onClick={() => {
    const now = new Date();

    const ride = {
      id: crypto.randomUUID(),
      userId: user?.id ?? null,   // ✅ 未登录也能用
      startedAt: now,
      endedAt: null,
      routeGeoJson: null,
    };

    console.log("SelectRoute>> start ride at", now);

    // ① 保存 currentRide
    saveRideLocal(ride);

    // ② 带 route 跳转到 recording
    navigate("/ride/recording", {
      state: {
        route: safeRoute,
      },
    });
  }}
>
  Select This Route
</Button>



        {/* Guest Login Prompt */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-blue-900 mb-2">
              Login to record ride tracks and report road conditions
            </p>
            <Button
              variant="outline"
              className="w-full h-10 border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => navigate("/login")}
            >
              <LogInIcon className="w-4 h-4 mr-2" />
              Login Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}