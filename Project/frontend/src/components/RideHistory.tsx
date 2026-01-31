// frontend/src/components/RideHistory.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  RulerIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

import type { Ride } from "../types/ride";
import { getMyRides } from "../hooks/rides.api";
import { adaptRideFromApi } from "../adapters/ride.adapter";
import { getProfileSummary } from "../hooks/profile.api";

// ✅ 方案B：列表拿到 id 后并发拉详情
import { getRideDetail } from "../hooks/ride-detail.api";
import { adaptRideDetailFromApi } from "../adapters/ride-detail.adapter";

export default function RideHistory() {
  const navigate = useNavigate();

  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [totalDistanceKm, setTotalDistanceKm] = useState(0);

  /* ---------------- formatters ---------------- */

  const formatKm = (km: number) => Number(km ?? 0).toFixed(2);
  const formatSpeed = (kmh: number) => Number(kmh ?? 0).toFixed(2);

  // mm:ss
  const formatDuration = (seconds: number) => {
    const total = Math.max(0, Math.floor(Number(seconds ?? 0)));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ✅ 显示 startedAt 的日期（不再 Today/Yesterday）
  const formatDate = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /* ---------------- fetch rides list + details (方案B) ---------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!mounted) return;
        setIsLoading(true);

        const res = await getMyRides(1, 20);
        if (!mounted) return;

        // 并发拉详情（单条失败不影响其他）
        const settled = await Promise.allSettled(
          res.items.map(async (it) => {
            const detail = await getRideDetail(it.id);
            const ride = adaptRideDetailFromApi(detail.data);

            // 保险：列表接口的 status 更可信就覆盖一下
            return { ...ride, status: it.status };
          })
        );

        if (!mounted) return;

        // 成功的用详情；失败的回退到 list item（至少能显示 duration / issues）
        const merged: Ride[] = settled.map((r, idx) => {
          if (r.status === "fulfilled") return r.value;

          console.error("[RIDE_DETAIL_FETCH_FAIL]", res.items[idx].id, r.reason);
          return adaptRideFromApi(res.items[idx]);
        });

        setRides(merged);
      } catch (err) {
        console.error("[RIDES_FETCH_ERROR]", err);
      } finally {
        if (mounted) setIsLoading(false); // ✅ 所有 rides（含详情）加载完才关
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- fetch profile summary ---------------- */

  useEffect(() => {
    let mounted = true;

    getProfileSummary()
      .then((data) => {
        if (!mounted) return;
        setTotalDistanceKm(Number(data.totalDistanceKm ?? 0));
      })
      .catch((err) => {
        console.error("[RIDES_PROFILE_FETCH_ERROR]", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- summary numbers ---------------- */

  const totalDistance = totalDistanceKm;
  const totalTime = rides.reduce((s, r) => s + (r.duration ?? 0), 0);
  const totalIssues = rides.reduce((s, r) => s + (r.issues?.length ?? 0), 0);

  /* ---------------- render ---------------- */

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="h-10 w-10"
          aria-label="Back"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h2 className="text-gray-900">My Rides</h2>
          <p className="text-gray-500">
            {isLoading ? "Loading…" : `${rides.length} rides`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="bg-white p-4 border-b">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="text-gray-400">Loading…</div>
              <div className="text-gray-400">Loading…</div>
              <div className="text-gray-400">Loading…</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-900 mb-1 text-lg font-medium tabular-nums">
                  {totalDistance.toFixed(2)} km
                </p>
                <p className="text-gray-600 text-sm">Total Distance</p>
              </div>

              <div className="text-center">
                <p className="text-gray-900 mb-1 text-lg font-medium tabular-nums">
                  {formatDuration(totalTime)}
                </p>
                <p className="text-gray-600 text-sm">Total Duration</p>
              </div>

              <div className="text-center">
                <p className="text-gray-900 mb-1 text-lg font-medium tabular-nums">
                  {totalIssues}
                </p>
                <p className="text-gray-600 text-sm">Reported Issues</p>
              </div>
            </div>
          )}
        </div>

        {/* Ride List */}
        {isLoading ? (
          // ✅ Skeleton cards (加载完自动消失)
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                  <div className="grid grid-cols-3 gap-6">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {rides.map((ride) => {
              const issuesCount = ride.issues?.length ?? 0;

              return (
                <Card
                  key={ride.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/rides/${ride.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {/* ✅ 用 startedAt 显示日期 */}
                          {formatDate((ride as any).startedAt ?? (ride as any).date ?? "")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {issuesCount > 0 && (
                          <Badge className="bg-orange-100 text-orange-800">
                            {issuesCount} issues
                          </Badge>
                        )}

                        {ride.status === "DRAFT" && (
                          <Badge className="bg-gray-100 text-gray-600">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-6 mb-3 items-start">
                      <div className="grid grid-rows-[auto_auto] gap-1">
                        <div className="flex items-center gap-2 text-gray-500">
                          <RulerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">Distance</span>
                        </div>
                        <p className="text-gray-900 font-medium tabular-nums">
                          {formatKm((ride as any).distance)} km
                        </p>
                      </div>

                      <div className="grid grid-rows-[auto_auto] gap-1">
                        <div className="flex items-center gap-2 text-gray-500">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">Duration</span>
                        </div>
                        <p className="text-gray-900 font-medium tabular-nums">
                          {formatDuration(ride.duration ?? 0)}
                        </p>
                      </div>

                      <div className="grid grid-rows-[auto_auto] gap-1">
                        <div className="flex items-center gap-2 text-gray-500">
                          <TrendingUpIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">Avg Speed</span>
                        </div>
                        <p className="text-gray-900 font-medium tabular-nums">
                          {formatSpeed((ride as any).avgSpeed)} km/h
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between text-gray-500">
                      <span>View details</span>
                      <ArrowLeftIcon className="rotate-180 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {rides.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">No ride records yet</p>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => navigate("/ride/prepare")}
                  >
                    Start Your First Ride
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
