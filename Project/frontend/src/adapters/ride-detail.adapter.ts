import type { Ride } from "../types/ride";
import type { RideDetailApiResponse } from "../hooks/ride-detail.api";
function distanceInMeters(
  a: [number, number],
  b: [number, number]
) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function adaptRideDetailFromApi(
  apiRide: RideDetailApiResponse
): Ride {
  console.group("[RideDetail Adapter] RAW API DATA");
  console.log(apiRide);
  console.groupEnd();

  const started = new Date(apiRide.startedAt);
  const ended = new Date(apiRide.endedAt);

  const duration = Math.max(
    0,
    Math.floor((ended.getTime() - started.getTime()) / 1000)
  );

  const path =
    apiRide.routeGeoJson?.coordinates?.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    ) ?? [];

  // 📏 total distance
  let distanceMeters = 0;
  for (let i = 1; i < path.length; i++) {
    distanceMeters += distanceInMeters(path[i - 1], path[i]);
  }

  const distanceKm = +(distanceMeters / 1000).toFixed(2);

  // 🚴 speeds
  const avgSpeed =
    duration > 0
      ? +(distanceKm / (duration / 3600)).toFixed(1)
      : 0;

  // ⚡ 简单 maxSpeed（基于相邻点）
  let maxSpeed = 0;
  for (let i = 1; i < path.length; i++) {
    const d = distanceInMeters(path[i - 1], path[i]);
    const speed = (d / 1000) / (5 / 3600); // 假设 5 秒采样
    maxSpeed = Math.max(maxSpeed, speed);
  }

  const ride: Ride = {
    id: apiRide.id,
    status:apiRide.status,
    date: apiRide.startedAt,
    distance: distanceKm,
    duration,
    avgSpeed,
    maxSpeed: +maxSpeed.toFixed(1),

    path,

    issues: apiRide.issues.map((issue) => ({
      id: issue.id,
      type: issue.issueType.toLowerCase(),
      location: issue.locationJson?.coordinates
        ? [
            issue.locationJson.coordinates[1],
            issue.locationJson.coordinates[0],
          ]
        : [0, 0],
      severity: "medium",
      status: "confirmed",
      date: issue.createdAt,
      autoDetected: false,
    })),
  };

  console.group("[RideDetail Adapter] ADAPTED UI DATA");
  console.log(ride);
  console.groupEnd();

  return ride;
}

