/*import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { createTrip } from "../api/trips";

type TripDraft = {
  id: string;
  userId: string;
  startedAt: string;
  stoppedAt: string;
  distanceKm: number;
  durationSec: number;
};

export default function TripSavePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const draftTrip: TripDraft | null = location.state?.draftTrip ?? null;

  const [saving, setSaving] = useState(false);

  if (!draftTrip) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>No draft trip found</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      await createTrip({
        userId: draftTrip.userId,
        startedAt: draftTrip.startedAt,
        stoppedAt: draftTrip.stoppedAt,
        distanceKm: draftTrip.distanceKm,
        durationSec: draftTrip.durationSec,
      });

      localStorage.removeItem("trip_draft_latest");
      toast.success("Trip saved to database");
      navigate("/trips/history");
    } catch (e: any) {
      toast.error("Failed to save trip");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white p-4">
      <h2 className="text-gray-900 mb-4">Save Trip</h2>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div>Distance: {draftTrip.distanceKm.toFixed(2)} km</div>
          <div>Duration: {draftTrip.durationSec} sec</div>
          <div>Started: {new Date(draftTrip.startedAt).toLocaleString()}</div>
          <div>Stopped: {new Date(draftTrip.stoppedAt).toLocaleString()}</div>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-3">
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save to Database"}
        </Button>

        <Button
          variant="outline"
          className="w-full h-12"
          onClick={() => navigate("/trips/recording")}
          disabled={saving}
        >
          Back
        </Button>
      </div>
    </div>
  );
}*/
