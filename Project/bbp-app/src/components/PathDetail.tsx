import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

/* ================= Types ================= */

type Segment = {
  condition: string;
  distance: number;
  description?: string;
};

type Comment = {
  user: string;
  rating: number;
  content: string;
  date: string;
};

type RouteDetail = {
  id: string;
  name: string;
  distance: number;
  duration: number;
  rating: number;
  condition: string;
  path: [number, number][];
  segments: Segment[];

  // ⬇️ 下面两个后端可能没有
  elevation?: number[];
  comments?: Comment[];
};

type PathDetailProps = {
  user?: User;
};

/* ================= Component ================= */

export default function PathDetail({ user }: PathDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  /**
   * ✅ 关键修复点：
   * - 从 navigate(state) 里取 route
   * - 如果没有（刷新 / 直链），就优雅降级
   */
  const route = (location.state as any)?.route as RouteDetail | undefined;

  /* ---------- 找不到 route（最安全的兜底） ---------- */
  if (!route || route.id !== id) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Route not found</p>
        <Button onClick={() => navigate("/path/results")}>
          Back to results
        </Button>
      </div>
    );
  }

  /* ---------- 安全默认值（⭐ 解决白屏核心） ---------- */
  const elevation = route.elevation ?? [];
  const comments = route.comments ?? [];

  /* ---------- helpers ---------- */
  const getConditionColor = (condition: string) => {
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

  const getConditionText = (condition: string) => {
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

  /* ================= Render ================= */

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
                  <span className="text-gray-900">
                    {route.rating} points
                  </span>
                </div>
                <Badge className={getConditionColor(route.condition)}>
                  {getConditionText(route.condition)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-900">{route.distance} km</p>
                  <p className="text-gray-500">Total Distance</p>
                </div>
                <div>
                  <p className="text-gray-900">{route.duration} min</p>
                  <p className="text-gray-500">Est. Duration</p>
                </div>
                <div>
                  <p className="text-gray-900">
                    {route.segments.length} seg
                  </p>
                  <p className="text-gray-500">Segments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elevation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUpIcon className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Elevation Change</span>
            </div>

            <Card>
              <CardContent className="p-4">
                {elevation.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    No elevation data available
                  </p>
                ) : (
                  <div className="h-32 flex items-end justify-between gap-1">
                    {elevation.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-green-500 rounded-t"
                        style={{ height: `${Math.min(h, 30) * 3}%` }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Segments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircleIcon className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Segment Details</span>
            </div>

            <div className="space-y-3">
              {route.segments.map((segment, index) => (
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
                            className={getConditionColor(segment.condition)}
                            variant="secondary"
                          >
                            {getConditionText(segment.condition)}
                          </Badge>
                        </div>
                        {segment.description && (
                          <p className="text-gray-600 mb-2">
                            {segment.description}
                          </p>
                        )}
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
                User Reviews ({comments.length})
              </span>
            </div>

            {comments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No user reviews yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {comments.map((c, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {c.user[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span>{c.user}</span>
                            <span className="text-gray-500">
                              {c.date}
                            </span>
                          </div>
                          <p className="text-gray-600">{c.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="p-4 border-t bg-white space-y-3">
        <Button className="w-full h-14 bg-green-600 hover:bg-green-700">
          Select This Route
        </Button>

        {!user && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/login")}
          >
            <LogInIcon className="w-4 h-4 mr-2" />
            Login to continue
          </Button>
        )}
      </div>
    </div>
  );
}
