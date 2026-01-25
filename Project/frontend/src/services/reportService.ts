import api from "../lib/api";
import type { RideStreet } from "../types/rideStreet";
import type { ResolveStreetsResponse } from "../types/street";

class RideRouteService {
  // 📏 Haversine 距离计算（米）
  private distanceInMeters(a: [number, number], b: [number, number]): number {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;

    const [lng1, lat1] = a;
    const [lng2, lat2] = b;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  async resolveStreetsFromRouteGeoJson(
    routeGeoJson: GeoJSON.LineString
  ): Promise<RideStreet[]> {
    // 1️⃣ route geometry → sampled points
    const points: Array<{ index: number; coord: [number, number] }> =
      routeGeoJson.coordinates.map((coord, index) => ({
        index,
        coord: coord as [number, number], // [lng, lat]
      }));

    // 2️⃣ backend resolve
    const res = await api.post<ResolveStreetsResponse>(
      "/report/resolve-streets",
      { points }
    );

    // 3️⃣ normalize in service layer
    return this.normalizeRideStreets(res.data.streets);
  }

  // 🧠 核心：合并 + 去重 + 排序 + 重编号
  private normalizeRideStreets(streets: RideStreet[]): RideStreet[] {
    const result: RideStreet[] = [];

    for (const street of streets) {
      const target = result.find((s) => {
        if (
          s.name !== street.name ||
          s.city !== street.city ||
          s.country !== street.country
        ) {
          return false;
        }

        const a = s.positions[0]?.coord as [number, number] | undefined;
        const b = street.positions[0]?.coord as [number, number] | undefined;

        if (!a || !b) return false;

        return this.distanceInMeters(a, b) <= 1000;
      });

      if (!target) {
        result.push({
          ...street,
          positions: [...street.positions],
        });
      } else {
        // 合并 positions（按 route index 去重）
        const existingIndexes = new Set<number>(
          target.positions.map((p) => p.index)
        );

        for (const pos of street.positions) {
          if (!existingIndexes.has(pos.index)) {
            target.positions.push({ ...pos });
          }
        }
      }
    }

    // 4️⃣ street 内按 route index 排序（不要重写 pos.index）
    // ⚠️ 你后面 buildSegmentsFromStreets 依赖的是 route 的 index，
    //     所以这里不要把 index 改成 0..n，否则会造成 segment 错位
    for (const street of result) {
      street.positions.sort((a, b) => a.index - b.index);
    }

    return result;
  }
}

export const rideRouteService = new RideRouteService();
