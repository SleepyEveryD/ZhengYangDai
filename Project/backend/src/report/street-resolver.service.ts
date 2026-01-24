//npx jest --config ./test/jest-e2e.json test/googleConnectionTest/getStreetName.e2e-spec.ts
import { Injectable } from '@nestjs/common';
import { reverseGeocode } from '../google/geocoding.client';
import { extractStreetFromGeocode } from '../util/extractStreet';

@Injectable()
export class StreetResolverService {
  async resolveFromSampledPoints(
    points: { index: number; coord: [number, number] }[]
  ) {
    const map = new Map<
      string,
      {
        externalId: string;
        name: string;
        city: string | null;
        country: string | null;
        positions: {
          index: number;
          coord: [number, number];
        }[];
      }
    >();

    for (const p of points) {
      const geo = await reverseGeocode(p.coord[1], p.coord[0]);
      if (!geo?.results?.length) continue;

      const info = extractStreetFromGeocode(geo.results[0]);
      if (!info.externalId || !info.name) continue;

      if (!map.has(info.externalId)) {
        map.set(info.externalId, {
          ...info,
          positions: [],
        });
      }

      map.get(info.externalId)!.positions.push({
        index: p.index,
        coord: p.coord,
      });
    }

    return [...map.values()];
  }
}
