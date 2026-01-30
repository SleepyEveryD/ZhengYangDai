// frontend/src/adapters/ride.adapter.ts
import type { Ride } from "../types/ride";
import type { RideListItem } from "../hooks/rides.api";

/**
 * 安全转 number
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
 * 统一把 list item 适配成前端 Ride（列表展示用）
 * 约定：
 * - distance: km
 * - duration: 秒
 * - avgSpeed/maxSpeed: km/h
 */
export function adaptRideFromApi(item: RideListItem): Ride {
  const started = new Date(item.startedAt);
  const ended = item.endedAt ? new Date(item.endedAt) : null;

  // ✅ duration：优先用后端 durationSec；没有就用 started/ended 算
  const duration =
    (item as any).durationSec != null
      ? Math.max(0, Math.floor(num((item as any).durationSec)))
      : ended
      ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 1000))
      : 0;

  // ✅ summary：来自 list API（如果后端还没给，就会兜底为 0）
  const distanceKm =
    (item as any).distanceKm != null
      ? num((item as any).distanceKm)
      : // 兼容一些可能的字段名
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

  // ✅ issues：列表页通常不需要精确坐标，保持最小字段（避免类型冲突）
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

    // 你列表页在用 ride.date 展示 “Today/Yesterday”
    // 用 startedAt 最稳定；如果你想按结束时间显示就改成 item.endedAt ?? item.startedAt
    date: item.startedAt,

    startedAt: started,
    endedAt: ended,

    distance: distanceKm,
    duration,
    avgSpeed: avgSpeedKmh,
    maxSpeed: maxSpeedKmh,

    // 列表不需要 path，给空
    path: [],

    issues,
  } as any;
}
