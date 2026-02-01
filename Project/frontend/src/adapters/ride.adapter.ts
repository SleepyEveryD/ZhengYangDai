// frontend/src/adapters/ride.adapter.ts
import type { Ride } from "../types/ride";
import type { RideListItem } from "../hooks/rides.api";

/**
 * safely convert number
 */
const num = (v: unknown, fallback = 0) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

/**
 * Normalize list items into frontend Ride objects (for list display)
 *
 * Conventions:
 * - distance: kilometers (km)
 * - duration: seconds
 * - avgSpeed / maxSpeed: km/h
 */

export function adaptRideFromApi(item: RideListItem): Ride {
  const started = new Date(item.startedAt);
  const ended = item.endedAt ? new Date(item.endedAt) : null;

  // ✅ duration: prefer backend durationSec; fallback to started/ended calculation
  const duration =
    (item as any).durationSec != null
      ? Math.max(0, Math.floor(num((item as any).durationSec)))
      : ended
      ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 1000))
      : 0;

  // ✅ summary: from list API (fallback to 0 if backend has not provided it yet)
  const distanceKm =
    (item as any).distanceKm != null
      ? num((item as any).distanceKm)
      : // compatibility with possible alternative field names
      (item as any).distance != null
      ? num((item as any).distance)
      : 0;

  const avgSpeedKmh =
    (item as any).avgSpeedKmh != null
      ? num((item as any).avgSpeedKmh)
      : (item as any).avgSpeed != null
      ? num((item as any).avgSpeed)
      : 0;

  const maxSpeedKmh =
    (item as any).maxSpeedKmh != null
      ? num((item as any).maxSpeedKmh)
      : (item as any).maxSpeed != null
      ? num((item as any).maxSpeed)
      : 0;

  // ✅ issues: list view does not need precise coordinates; keep minimal fields (avoid type conflicts)
  const issues =
    item.issues?.map((issue: any) => ({
      id: String(issue.id),
      type: String(issue.issueType ?? issue.type ?? "OTHER").toLowerCase(),
      location: [0, 0] as [number, number],
      notes: issue.description ?? issue.notes ?? "",
    })) ?? [];

  return {
    id: String(item.id),
    status: item.status,

    // The list page uses ride.date to display "Today / Yesterday"
    // startedAt is the most stable choice; switch to item.endedAt ?? item.startedAt if you prefer end time
    date: item.startedAt,

    startedAt: started,
    endedAt: ended,

    distance: distanceKm,
    duration,
    avgSpeed: avgSpeedKmh,
    maxSpeed: maxSpeedKmh,

    // List view does not require path data; use empty array
    path: [],

    issues,
  } as any;
}
