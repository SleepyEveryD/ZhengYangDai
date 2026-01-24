import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  RulerIcon,
  TrendingUpIcon,
  ZapIcon,
  AlertCircleIcon,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import MapView from "./MapView";
import type { Ride } from "../types/ride";

export default function RideDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const ride = (location.state as { ride?: Ride })?.ride;

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return hours > 0
      ? `${hours}:${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`
      : `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIssueTypeText = (type: string) => {
    switch (type) {
      case "pothole":
        return "Pothole";
      case "crack":
        return "Crack";
      case "obstacle":
        return "Obstacle";
      default:
        return "Other";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "high":
        return "Severe";
      case "medium":
        return "Moderate";
      case "low":
        return "Minor";
      default:
        return "Unknown";
    }
  };

  const calories = Math.round(ride.distance * 30);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/rides")}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Ride Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={ride.issues.map((issue) => ({
              location: issue.location,
              type: issue.type,
            }))}
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Date */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">
              {formatDate(ride.date)}
            </span>
          </div>

          {/* Stats */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <Stat icon={<RulerIcon />} label="Distance" value={`${ride.distance} km`} />
              <Stat icon={<ClockIcon />} label="Duration" value={formatTime(ride.duration)} />
              <Stat icon={<TrendingUpIcon />} label="Avg Speed" value={`${ride.avgSpeed} km/h`} />
              <Stat icon={<ZapIcon />} label="Max Speed" value={`${ride.maxSpeed} km/h`} />
            </CardContent>
          </Card>

          {/* Extra */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Calories</p>
                <p className="text-gray-900">{calories} kcal</p>
              </div>
              <div>
                <p className="text-gray-600">Reported Issues</p>
                <p className="text-gray-900">{ride.issues.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {ride.issues.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircleIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">
                  Reported Issues ({ride.issues.length})
                </span>
              </div>

              <div className="space-y-3">
                {ride.issues.map((issue) => (
                  <Card key={issue.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-900">
                          {getIssueTypeText(issue.type)}
                        </span>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {getSeverityText(issue.severity)}
                        </Badge>
                      </div>
                      <p className="text-gray-600">
                        {issue.location[0].toFixed(4)},{" "}
                        {issue.location[1].toFixed(4)}
                      </p>
                      <Badge className="mt-2 bg-green-100 text-green-800">
                        Confirmed
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-gray-600">{label}</p>
        <p className="text-gray-900">{value}</p>
      </div>
    </div>
  );
}
