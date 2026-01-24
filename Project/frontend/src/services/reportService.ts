import api from "../lib/api";
import type { RideStreet } from "@/types/ride";
import type { ResolveStreetsResponse } from "@/types/street";

class RideRouteService {
  async resolveStreetsFromRouteGeoJson(
    routeGeoJson: GeoJSON.LineString
  ): Promise<RideStreet[]> {
    // 1️⃣ GeoJSON → sampled points
    const points = routeGeoJson.coordinates.map((coord, index) => ({
      index,
      coord: coord as [number, number], // [lng, lat]
    }));

    console.log("reportService>> resolveStreetsFromRouteGeoJson called");
    console.log("reportService>> sampled points =", points.length);

    // 2️⃣ 调后端
    const res = await api.post<ResolveStreetsResponse>(
      "/report/resolve-streets",
      { points }
    );


    // 4️⃣ ⭐ 在 service 层整理 streets（去重 + 合并 positions）
    const normalizedStreets = this.normalizeRideStreets(
      res.data.streets
    );


    // ✅ 只把“干净的业务数据”往外返回
    return normalizedStreets;
  }

  // ⭐ street 整理逻辑放在 service 内部（非常合理）
  private normalizeRideStreets(
    streets: RideStreet[]
  ): RideStreet[] {
    const map = new Map<string, RideStreet>();

    for (const street of streets) {
      if (!map.has(street.externalId)) {
        map.set(street.externalId, {
          ...street,
          positions: [...street.positions],
        });
      } else {
        map.get(street.externalId)!.positions.push(
          ...street.positions
        );
      }
    }

    return [...map.values()];
  }
}

export const rideRouteService = new RideRouteService();
