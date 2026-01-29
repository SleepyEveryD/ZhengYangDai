import type { Ride } from "../types/ride";
import type { RoadConditionSegment } from "../components/RideReportEditorDialog";

export function buildSegmentsFromStreets(
  ride: Ride
): RoadConditionSegment[] {
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
      streetExternalId: street.externalId,
      startPoint: start,
      endPoint: end,
      condition: "GOOD", // ✅ 不依赖 enum
      pathCoordinates: ride.path.slice(start, end + 1),
    };
  });
}
