/*import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTripHistory, type Trip } from "../api/trips";
import { useAuth } from "../auth/useAuth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

function formatDuration(sec?: number | null) {
  const s = sec ?? 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

export default function TripHistoryPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        setPageLoading(true);
        const data = await getTripHistory(user.id);
        if (cancelled) return;
        setTrips(data);
      } catch (e: any) {
        toast.error("Failed to load trip history");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading auth...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Please login first</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header *//*}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/trips/recording")}
          className="h-10 w-10"
          aria-label="Back to recording"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Trip History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pageLoading && (
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600">Loading trips...</p>
            </CardContent>
          </Card>
        )}

        {!pageLoading && trips.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">No trips yet</p>
              <Button onClick={() => navigate("/trips/recording")} className="bg-green-600 hover:bg-green-700">
                Start a Trip
              </Button>
            </CardContent>
          </Card>
        )}

        {!pageLoading &&
          trips.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-900 mb-1">
                      <span className="font-medium">{t.status}</span>
                    </p>
                    <p className="text-gray-600 text-sm">
                      Started: {new Date(t.startedAt).toLocaleString()}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Stopped: {t.stoppedAt ? new Date(t.stoppedAt).toLocaleString() : "-"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-gray-900">
                      {(t.distanceKm ?? 0).toFixed(2)} km
                    </p>
                    <p className="text-gray-600 text-sm">
                      {formatDuration(t.durationSec)}
                    </p>
                  </div>
                </div>

                {/* debug: id *//*}
                <p className="text-xs text-gray-400 mt-2 break-all">
                  {t.id}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
*/
