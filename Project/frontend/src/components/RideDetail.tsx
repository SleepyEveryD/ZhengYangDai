import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { getRideDetail } from "../hooks/ride-detail.api";
import { adaptRideDetailFromApi } from "../adapters/ride-detail.adapter";

import RideReportEditorDialog, {} from "./RideReportEditorDialog";
import { buildSegmentsFromStreets } from "../utils/buildSegmentsFromStreets";

import type { RoadConditionSegment } from "./RideReportEditorDialog";
import { rideRouteService } from "../services/reportService";
import type { GeoJSON } from "geojson";

export default function RideDetail() {
  const navigate = useNavigate();
  const { id: rideId } = useParams<{ id: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  // Draft 编辑相关 state
  const [showEditor, setShowEditor] = useState(false);
  const [issues, setIssues] = useState<Ride["issues"]>([]);
  const [segments, setSegments] = useState<RoadConditionSegment[]>([]);
  const [streets, setStreets] = useState<RideStreet[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  
  const pathToGeoJson = (path: [number, number][]): GeoJSON.LineString => ({
    type: "LineString",
    coordinates: path.map(([lat, lng]) => [lng, lat]),
  });


  /* ---------------- fetch ride detail ---------------- */

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      return;
    }
  
    let mounted = true;
  
    (async () => {
      try {
        const res = await getRideDetail(rideId);
        if (!mounted) return;
  
        const adapted = adaptRideDetailFromApi(res.data);
        setRide(adapted);
  
        // ✅ 用 path 现场构造 GeoJSON
        let streets: RideStreet[] = [];
  
        if (adapted.path?.length >= 2) {
          try {
            const routeGeoJson = pathToGeoJson(adapted.path);
            streets =
              await rideRouteService.resolveStreetsFromRouteGeoJson(
                routeGeoJson
              );
          } catch (err) {
            console.error("[RIDE_DETAIL] resolve streets failed", err);
          }
        } else {
          console.warn(
            "[RIDE_DETAIL] path too short to resolve streets",
            adapted.path
          );
        }
  
        // ✅ 用 streets 派生 segments
        setIssues(adapted.issues);
        setSegments(
          adapted.roadConditionSegments?.length
            ? adapted.roadConditionSegments
            : buildSegmentsFromStreets({
                ...adapted,
                streets,
              })
        );
      } catch (err) {
        console.error("[RIDE_DETAIL_FETCH_ERROR]", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
  
    return () => {
      mounted = false;
    };
  }, [rideId]);
  
  
  
  /* ---------------- utils ---------------- */

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

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading ride…</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

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

        <h2 className="text-gray-900 flex-1">Ride Details</h2>

        {ride.status === "DRAFT" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={issues.map((issue) => ({
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

            {ride.status === "DRAFT" && (
              <Badge className="ml-2 bg-gray-100 text-gray-600">
                Draft
              </Badge>
            )}
          </div>

          {/* Stats */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <Stat
                icon={<RulerIcon />}
                label="Distance"
                value={`${ride.distance} km`}
              />
              <Stat
                icon={<ClockIcon />}
                label="Duration"
                value={formatTime(ride.duration)}
              />
              <Stat
                icon={<TrendingUpIcon />}
                label="Avg Speed"
                value={`${ride.avgSpeed} km/h`}
              />
              <Stat
                icon={<ZapIcon />}
                label="Max Speed"
                value={`${ride.maxSpeed} km/h`}
              />
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
                <p className="text-gray-900">{issues.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {issues.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircleIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">
                  Reported Issues ({issues.length})
                </span>
              </div>

              <div className="space-y-3">
                {issues.map((issue) => (
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft editor dialog */}
      {ride.status === "DRAFT" && (
        <RideReportEditorDialog
          open={showEditor}
          onOpenChange={setShowEditor}
          ride={ride}
          issues={issues}
          segments={segments}
          defaultTab="issues"
          onChange={({ issues, segments }) => {
            setIssues(issues);
            setSegments(segments);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- small component ---------------- */

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
