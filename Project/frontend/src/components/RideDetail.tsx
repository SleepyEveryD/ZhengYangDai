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

import RideReportEditorDialog from "./RideReportEditorDialog";
import { buildSegmentsFromStreets } from "../utils/buildSegmentsFromStreets";

import type { RoadConditionSegment } from "./RideReportEditorDialog";
import { rideRouteService } from "../services/reportService";
import type { GeoJSON } from "geojson";
import { saveRideLocal } from "../services/rideStorage";
import { RIDE_QUEUE_UPDATED } from "../constants/events.ts";
import IssueList from "./IssueList";
import RoadConditionList from "./RoadConditionList";
import RoadConditionRequiredCard from "./RoadConditionRequiredCard";




/* ===================================================== */

export default function RideDetail() {
  const navigate = useNavigate();
  const { id: rideId } = useParams<{ id: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔑 编辑态
  const [showEditor, setShowEditor] = useState(false);
  const [issues, setIssues] = useState<Ride["issues"]>([]);
  const [segments, setSegments] = useState<RoadConditionSegment[]>([]);
  const [resolvedStreets, setResolvedStreets] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [reportTab, setReportTab] = useState<"issues" | "conditions">("issues");


  /* ---------------- utils ---------------- */

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
        setIssues(adapted.issues);

        let streets: any[] = [];

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
        }

        setResolvedStreets(streets);

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

  /* ---------------- handlers ---------------- */

  const handleExitEdit = () => {
    setIsEditing(false);
    setShowEditor(false);

    if (ride) {
      setIssues(ride.issues);
      setSegments(ride.roadConditionSegments ?? []);
    }
  };

  /**
   * ⭐ 核心：构造 ConfirmPayload 并保存
   */
   const handleConfirmEdit = () => {
    if (!ride) return;
  
    const confirmedAt = new Date().toISOString();
  
    const routeGeoJson = {
      type: "LineString",
      coordinates: ride.path.map(([lat, lng]) => [lng, lat]),
    };
  
    const payload = {
      id: ride.id,
  
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
  
      routeGeoJson,
  
      streets: resolvedStreets.map((s) => ({
        externalId: s.externalId,
        name: s.name,
        city: s.city,
        country: s.country,
        positions: s.positions,
      })),
  
      avgSpeed: ride.avgSpeed,
      distance: ride.distance,
      duration: ride.duration,
      maxSpeed: ride.maxSpeed,
  
      path: ride.path,
  
      issues: issues.map((i) => ({
        type: i.type,
        location: i.location,
        description: i.description ?? "",
      })),
  
      roadConditionSegments: segments,
  
      status: "CONFIRMED",
      uploadStatus: "pending",
      confirmedAt,
      date: ride.endedAt,
    };
  
    // 1️⃣ 入队（写 localStorage）
    saveRideLocal(payload);
  
    // 2️⃣ 发事件（通知 uploader）
    window.dispatchEvent(new Event(RIDE_QUEUE_UPDATED));
  
    // 3️⃣ UI 更新
    setRide({
      ...ride,
      status: "CONFIRMED",
      issues,
      roadConditionSegments: segments,
    });
  
    setIsEditing(false);
    setShowEditor(false);
  };
  

  /* ---------------- utils ---------------- */

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading ride…
      </div>
    );
  }

  if (!ride) {
    return (
      navigate("/rides")
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rides")}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>

        <h2 className="flex-1">Ride Details</h2>

        {ride.status === "DRAFT" && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(true);
              setShowEditor(true);
            }}
          >
            Edit
          </Button>
        )}

        {ride.status === "DRAFT" && isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExitEdit}>
              Exit
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmEdit}
            >
              Confirm
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={issues.map((i) => ({
              location: i.location,
              type: i.type,
            }))}
          />
        </div>

        <div className="p-4 space-y-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span>{formatDate(ride.date)}</span>
            {ride.status === "DRAFT" && (
              <Badge className="bg-gray-100 text-gray-600">Draft</Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <Stat icon={<RulerIcon />} label="Distance" value={`${ride.distance} km`} />
              <Stat icon={<ClockIcon />} label="Duration" value={formatTime(ride.duration)} />
              <Stat icon={<TrendingUpIcon />} label="Avg Speed" value={`${ride.avgSpeed} km/h`} />
              <Stat icon={<ZapIcon />} label="Max Speed" value={`${ride.maxSpeed} km/h`} />
            </CardContent>
          </Card>
          {isEditing && (
            <RoadConditionRequiredCard
              hasSegments={segments.length > 0}
              onOpenEditor={() => {
                setReportTab("conditions");
                setShowEditor(true);
              }}
            />
          )}



          <IssueList issues={issues} />
          <RoadConditionList segments={segments} />



        </div>
      </div>

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
