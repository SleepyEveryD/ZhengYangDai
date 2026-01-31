import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import WeatherWidget from "./Weather";
import {
  ArrowLeftIcon,
  CalendarIcon,
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
import { saveRideLocal } from "../services/rideStorage";
import { RIDE_QUEUE_UPDATED } from "../constants/events";
import IssueList from "./IssueList";
import RoadConditionList from "./RoadConditionList";
import RoadConditionRequiredCard from "./RoadConditionRequiredCard";


/* ===================================================== */

export default function RideDetail() {
  const navigate = useNavigate();
  const { id: rideId } = useParams<{ id: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑态
  const [showEditor, setShowEditor] = useState(false);
  const [issues, setIssues] = useState<Ride["issues"]>([]);
  const [segments, setSegments] = useState<RoadConditionSegment[]>([]);
  const [resolvedStreets, setResolvedStreets] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [weather, setWeather] = useState<RideWeather | null>(null);
  const [hasSavedChanges, setHasSavedChanges] = useState(false);



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

        /**
         * ============================
         * ✅ CONFIRMED：只信 API
         * ============================
         */
        if (adapted.status === "CONFIRMED") {
          setResolvedStreets([]);

          // 👉 不用 buildSegmentsFromStreets（没有 positions）
          setSegments(
            adapted.streets.map((s, index) => ({
              id: `confirmed-${index}`,
              name: s.name,
              condition: s.condition,
              notes: null,
              startPoint: 0,
              endPoint: 0,
            }
            ))
          );
          console.log(" this ride is confirmed", adapted.streets);

          return;
        }

        /**
         * ============================
         * ✏️ DRAFT：前端推导
         * ============================
         */
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

        // ⚠️ 只在有 positions 时才 build
        setSegments(
          streets.length > 0
            ? buildSegmentsFromStreets({
                ...adapted,
                streets,
              })
            : []
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

  // ✅ 当 ride 加载完成后，同步 weather（只做一次）
  useEffect(() => {
    if (ride?.weather) {
      setWeather(ride.weather);
    }
  }, [ride]);



  /* ---------------- handlers ---------------- */

  const handleExitEdit = () => {
    setIsEditing(false);
    setShowEditor(false);
    setHasSavedChanges(false);
    if (!ride) return;

    setIssues(ride.issues);

    if (ride.status === "CONFIRMED") {
      setSegments(
        ride.streets.map((s, index) => ({
          id: `confirmed-${index}`,
          name: s.name,
          roadCondition: s.condition,
          notes: null,
          startPoint: 0,
          endPoint: 0,
        }))
      );
    }
  };

  /**
   * ⭐ Confirm（只可能是 DRAFT）
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

      streets: resolvedStreets.map((s, i) => ({
        externalId: s.externalId,
        name: s.name,
        city: s.city,
        country: s.country,
        positions: s.positions,
        condition: segments[i]?.condition ?? "GOOD",
         comment: segments[i]?.notes ?? null
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

      status: "CONFIRMED",
      uploadStatus: "pending",
      confirmedAt,
      date: ride.endedAt,
    };

    saveRideLocal(payload);
    window.dispatchEvent(new Event(RIDE_QUEUE_UPDATED));

    // UI 同步
    setRide({
      ...ride,
      status: "CONFIRMED",
      issues,
      streets: payload.streets,
    });

    setSegments(
      payload.streets.map((s, index) => ({
        id: `confirmed-${index}`,
        name: s.name,
        condition: s.condition,
        notes: null,
        startPoint: 0,
        endPoint: 0,
      }))
    );

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
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Ride not found or no access.</p>
        <Button onClick={() => navigate("/rides")}>
          Back to rides
        </Button>
      </div>
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
              setHasSavedChanges(false);
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
              disabled={!hasSavedChanges}
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
              <Stat label="Distance" value={`${ride.distance} km`} />
              <Stat label="Duration" value={formatTime(ride.duration)} />
              <Stat label="Avg Speed" value={`${ride.avgSpeed} km/h`} />
              <Stat label="Max Speed" value={`${ride.maxSpeed} km/h`} />
            </CardContent>
          </Card>
          <WeatherWidget
            value={weather}
          />

          {isEditing && (
            <RoadConditionRequiredCard
              hasSegments={segments.length > 0}
              onOpenEditor={() => setShowEditor(true)}
            />
          )}

          <IssueList issues={issues} />
          {(ride.status === "CONFIRMED" || hasSavedChanges) && (
          <RoadConditionList segments={segments} /> )
          }


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
    // 编辑中（草稿）
    setIssues(issues);
    setSegments(segments);
  }}

  onSave={({ issues, segments }) => {
    // ⭐ 真正保存
    setIssues(issues);
    setSegments(segments);
    setHasSavedChanges(true); // 让 Confirm 按钮亮
  }}
/>

      )}
    </div>
  );
}

/* ---------------- small component ---------------- */

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-gray-600">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
