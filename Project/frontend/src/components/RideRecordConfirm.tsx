import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  SaveIcon,
  ShareIcon,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import MapView from "./MapView";
import type { Ride } from "../types/ride";
import { toast } from "sonner";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { saveRideLocal } from "../services/rideStorage";
import { useAuth } from "../auth/AuthContext";

import Weather from "./Weather";
import IssueList from "./IssueList";
import RoadConditionList from "./RoadConditionList";
import RoadConditionRequiredCard from "./RoadConditionRequiredCard";
import RoadConditionReportDialog from "./RideReportEditorDialog";

import type {
  RoadConditionSegment,
} from "./RideReportEditorDialog";

/* =========================
   Utils
========================= */

function buildSegmentsFromStreets(ride: Ride): RoadConditionSegment[] {
  if (!ride.streets?.length || !ride.path?.length) return [];

  return ride.streets.map((street, i) => {
    const idx = street.positions[0].index;
    let start = idx;
    let end = idx;

    if (street.positions.length === 1) {
      if (idx === 0) end = 1;
      else if (idx === ride.path.length - 1) start = idx - 1;
      else {
        start = idx - 1;
        end = idx + 1;
      }
    }

    return {
      id: `segment-${i}-${start}-${end}`,
      name: street.name || `Unnamed road ${i + 1}`,
      startPoint: start,
      endPoint: end,
      condition: "GOOD",
      notes: "",
      pathCoordinates: ride.path.slice(start, end + 1),
      
    };
  });
}

/* =========================
   Component
========================= */

export default function RideRecordConfirm() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const navigate = useNavigate();
  const location = useLocation();
  const ride: Ride | null = location.state?.ride ?? null;

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

  /* ---------- state (source of truth) ---------- */

  const [issues, setIssues] = useState<Ride["issues"]>(
    ride.issues || []
  );

  const [roadConditionSegments, setRoadConditionSegments] =
    useState<RoadConditionSegment[]>([]);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTab, setReportTab] =
    useState<"issues" | "conditions">("issues");

  const [conditionsConfirmed, setConditionsConfirmed] = useState(false);

  /* ---------- init segments ---------- */

  useEffect(() => {
    setRoadConditionSegments(buildSegmentsFromStreets(ride));
  }, [ride]);

  /* =========================
     Save logic
  ========================= */

  type RideStatus = "DRAFT" | "CONFIRMED";

  const saveRide = (status: RideStatus) => {
    if (issues.some((i) => i.status === "pending")) {
      toast.error("Please confirm or ignore all pending issues");
      return;
    }

    if (roadConditionSegments.length === 0) {
      toast.error("Please add at least one road condition segment");
      setReportTab("conditions");
      setShowReportDialog(true);
      return;
    }
    
    const streetsWithCondition = (ride.streets ?? []).map((street) => {
      const segment = roadConditionSegments?.find(
        (seg) => seg?.name === street.name
      );
    
      return {
        ...street,
        condition: segment?.condition ?? 'GOOD',
        comment: segment?.notes ?? null,
      };
    });
    console.log("streets with condition", streetsWithCondition);
    

    const finalRide = {
      ...ride,
      issues,
      streets: streetsWithCondition,
      status,
      uploadStatus: "pending",
      confirmedAt: new Date().toISOString(),
    };

    saveRideLocal(finalRide);
    toast.success("Ride saved locally");
    navigate("/map");
  };

  const handleSaveOnly = () => saveRide("DRAFT");

  const handleSaveAndPublish = () => {
    if (!conditionsConfirmed) {
      toast.error("Please save road condition reports first");
      setReportTab("conditions");
      setShowReportDialog(true);
      return;
    }
    saveRide("CONFIRMED");
  };

  const confirmedIssues = issues.filter(
    (i) => i.status === "confirmed"
  );

  /* =========================
     Render
  ========================= */

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}sec`;
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/map")}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Confirm Ride Data</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={issues.map((i) => ({
              location: i.location,
              type: i.type,
              description: i.description
            }))}
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-4">Ride Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Distance</p>
                  <p>{ride.distance} km</p>
                </div>
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p>{formatTime(ride.duration)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Avg Speed</p>
                  <p>{ride.avgSpeed} km/h</p>
                </div>
                <div>
                  <p className="text-gray-500">Max Speed</p>
                  <p>{ride.maxSpeed} km/h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Weather />

          <IssueList issues={issues} />

          {issues.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">
                  No road issues detected on this ride
                </p>
              </CardContent>
            </Card>
          )}

          <RoadConditionRequiredCard
            hasSegments={roadConditionSegments.length > 0}
            onOpenEditor={() => {
              setReportTab("conditions");
              setShowReportDialog(true);
            }}
          />

          {conditionsConfirmed && (
            <RoadConditionList segments={roadConditionSegments} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-3">
        <Button
          variant="outline"
          className="w-full h-12"
          onClick={handleSaveOnly}
        >
          <SaveIcon className="w-5 h-5 mr-2" />
          Save only
        </Button>

        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          onClick={handleSaveAndPublish}
        >
          <ShareIcon className="w-5 h-5 mr-2" />
          Save and Publish
          {confirmedIssues.length > 0 &&
            ` (${confirmedIssues.length} reports)`}
        </Button>
      </div>

      {/* Unified editor dialog */}
      <RoadConditionReportDialog
        open={showReportDialog}
        onOpenChange={(open) => {
          setShowReportDialog(open);
          if (!open) setConditionsConfirmed(true);
        }}
        ride={ride}
        issues={issues}
        segments={roadConditionSegments}
        defaultTab={reportTab}
        onChange={({ issues, segments }) => {
          setIssues(issues);
          setRoadConditionSegments(segments);
        }}
      />
    </div>
  );
}
