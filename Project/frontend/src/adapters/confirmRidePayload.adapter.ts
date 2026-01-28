import type { Ride } from "../types/ride";
import type { GeoJSON } from "geojson";

export function buildConfirmRidePayload(params: {
  ride: Ride;
  streets: any[];
  issues: Ride["issues"];
}) {
  const { ride, streets, issues } = params;

  const routeGeoJson: GeoJSON.LineString = {
    type: "LineString",
    coordinates: ride.path.map(([lat, lng]) => [lng, lat]),
  };

  return {
    id: ride.id,

    startedAt: ride.startedAt,
    endedAt: ride.endedAt,

    routeGeoJson,
    streets: streets.map((s) => ({
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

    roadConditionSegments: ride.roadConditionSegments,

    status: "CONFIRMED",
    uploadStatus: "pending",
    confirmedAt: new Date().toISOString(),
    date: ride.endedAt,
  };
}
