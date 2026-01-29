import type { Ride } from "../types/ride";
import type { RideListItem } from "../api/rides.api";

export function adaptRideFromApi(item: RideListItem): Ride {
  const started = new Date(item.startedAt);
  const ended = new Date(item.endedAt);

  const duration = Math.max(
    0,
    Math.floor((ended.getTime() - started.getTime()) / 1000)
  );

  return {
    id: item.id,
    status: item.status, 
    date: item.startedAt,

    distance: 0,
    duration,
    avgSpeed: 0,
    maxSpeed: 0,

    path: [],

    issues: item.issues.map((issue) => ({
      id: issue.id,
      type: issue.issueType.toLowerCase(),
      location: [0, 0], // 列表页不需要精确坐标
      severity: "medium",
      status: "confirmed",
      date: issue.createdAt,
      autoDetected: false,
    })),
  };
}
