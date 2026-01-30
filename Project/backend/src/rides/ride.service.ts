import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toGeoJSONPointFromFrontend } from '../util/geojson.util';
import { IssueType, RoadCondition } from '@prisma/client';

interface ConfirmRideInput {
  rideId: string;
  userId: string;
  payload: any;
}

type FrontIssueType =
  | 'pothole'
  | 'bump'
  | 'gravel'
  | 'construction'
  | 'crack'
  | 'obstacle'
  | 'other'
  | string;

@Injectable()
export class RideService {
  constructor(private readonly prisma: PrismaService) {}

  /* ======================================================
   *  Draft Ride (RAW SQL, writes routeGeometry)
   * ====================================================== */
  async saveDraftRide(rideId: string, userId: string, routeGeoJson: any) {
    if (!routeGeoJson) {
      throw new BadRequestException('routeGeoJson is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        select: { status: true },
      });

      if (existing?.status === 'CONFIRMED') {
        throw new ConflictException('Ride already confirmed');
      }

      try {
        await tx.$executeRaw`
          INSERT INTO "Ride" (
            id,
            "userId",
            "routeGeoJson",
            "routeGeometry",
            status,
            "startedAt",
            "endedAt"
          )
          VALUES (
            ${rideId},
            ${userId},
            ${routeGeoJson}::jsonb,
            ST_SetSRID(
              ST_GeomFromGeoJSON(${JSON.stringify(routeGeoJson)}),
              4326
            )::geography,
            'DRAFT'::"RideStatus",
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE
          SET
            "routeGeoJson" = EXCLUDED."routeGeoJson",
            "routeGeometry" = EXCLUDED."routeGeometry",
            "userId" = EXCLUDED."userId",
            status = 'DRAFT'::"RideStatus"
        `;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('🔥 saveDraftRide SQL error', e);
        throw e;
      }

      return { success: true, rideId };
    });
  }

  /* ======================================================
   *  Confirm Ride (DRAFT -> CONFIRMED)
   *  - Streets: 1km match OR externalId upsert
   *  - StreetReport: Prisma upsert by userId_rideId_streetId
   *  - StreetIssue: RAW SQL with IssueType mapping
   * ====================================================== */
  async confirmRide({ rideId, userId, payload }: ConfirmRideInput) {
    const { startedAt, endedAt, routeGeoJson, streets, issues, roadConditionSegments } =
      payload ?? {};

    if (!routeGeoJson) {
      throw new BadRequestException('routeGeoJson is required');
    }
    if (!Array.isArray(streets) || streets.length === 0) {
      throw new BadRequestException('streets must be a non-empty array');
    }

    // segment map: externalId -> { roadCondition, notes }
    const segMap = new Map<
      string,
      { roadCondition: RoadCondition; notes: string | null }
    >();

    for (const seg of roadConditionSegments ?? []) {
      const ext = seg?.streetExternalId;
      if (!ext) continue;

      const cond = (seg?.condition ?? seg?.roadCondition ?? 'GOOD') as RoadCondition;
      const notes =
        seg?.notes && String(seg.notes).trim().length > 0
          ? String(seg.notes).trim()
          : null;

      segMap.set(ext, { roadCondition: cond, notes });
    }

    return this.prisma.$transaction(async (tx) => {
      /* --------------------------------
       * 0) Guard: cannot reconfirm
       * -------------------------------- */
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        select: { status: true },
      });
      if (existing?.status === 'CONFIRMED') {
        throw new ConflictException('Ride already confirmed');
      }

      /* --------------------------------
       * 1) Insert/Update Ride (RAW SQL)
       * -------------------------------- */
      const sAt = startedAt ? new Date(startedAt) : new Date();
      const eAt = endedAt ? new Date(endedAt) : new Date();

      await tx.$executeRaw`
        INSERT INTO "Ride" (
          id,
          "userId",
          "routeGeoJson",
          "routeGeometry",
          status,
          "startedAt",
          "endedAt"
        )
        VALUES (
          ${rideId},
          ${userId},
          ${routeGeoJson}::jsonb,
          ST_SetSRID(
            ST_GeomFromGeoJSON(${JSON.stringify(routeGeoJson)}),
            4326
          )::geography,
          'CONFIRMED'::"RideStatus",
          ${sAt},
          ${eAt}
        )
        ON CONFLICT (id) DO UPDATE
        SET
          "routeGeoJson"  = EXCLUDED."routeGeoJson",
          "routeGeometry" = EXCLUDED."routeGeometry",
          "startedAt"     = EXCLUDED."startedAt",
          "endedAt"       = EXCLUDED."endedAt",
          status          = 'CONFIRMED'::"RideStatus"
        WHERE "Ride".status = 'DRAFT'::"RideStatus"
      `;

      /* --------------------------------
       * 2) Streets & StreetReports
       *    - 先 1km match（同名/同城/同国 + ST_DWithin）
       *    - 找不到再 externalId upsert（但不覆盖已有 geometry）
       * -------------------------------- */
      for (const street of streets) {
        if (!street) continue;

        const externalId: string | undefined = street.externalId;
        const name: string | null = street.name ?? null;
        const city: string | null = street.city ?? null;
        const country: string | null = street.country ?? null;

        const coords = (street.positions ?? [])
          .map((p: any) => p?.coord)
          .filter(Boolean);

        if (!Array.isArray(coords) || coords.length < 2) {
          // 没 geometry 就跳过
          continue;
        }

        const geometry = {
          type: 'LineString',
          coordinates: coords,
        };

        // 2.1 先按 “同名/同城/同国 + 1km 内” 找现有 Street
        //     ✅ 这样就实现：externalId 不同但距离近 -> 认为同路
        const near = await tx.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM "Street"
          WHERE
            (${name}::text IS NULL OR name = ${name})
            AND (${city}::text IS NULL OR city = ${city})
            AND (${country}::text IS NULL OR country = ${country})
            AND geometry IS NOT NULL
            AND ST_DWithin(
              geometry,
              ST_SetSRID(
                ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),
                4326
              )::geography,
              1000
            )
          LIMIT 1
        `;

        let streetId: string;

        if (near.length > 0) {
          streetId = near[0].id;
          // ✅ 这里不写 externalId（因为 schema 外键不允许一条路多个 externalId）
        } else {
          // 2.2 找不到 nearby -> 用 externalId upsert
          // externalId 为空的话，只能创建一个新的（但 externalId 是 @unique 必填，通常不会为空）
          if (!externalId) {
            // 兜底：给一个随机 externalId 避免 SQL 失败（不推荐，最好前端保证有 externalId）
            // 你也可以选择 throw
            // throw new BadRequestException('street.externalId is required');
            const fallback = `fallback-${Date.now()}-${Math.random()}`;
            street.externalId = fallback;
          }

          const ext = street.externalId;

          const [streetRow] = await tx.$queryRaw<{ id: string }[]>`
            INSERT INTO "Street" (
              id,
              "externalId",
              name,
              city,
              country,
              "geometryJson",
              geometry
            )
            VALUES (
              gen_random_uuid(),
              ${ext},
              ${name},
              ${city},
              ${country},
              ${geometry}::jsonb,
              ST_SetSRID(
                ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),
                4326
              )::geography
            )
            ON CONFLICT ("externalId") DO UPDATE
            SET
              name = EXCLUDED.name,
              city = EXCLUDED.city,
              country = EXCLUDED.country,
              -- ✅ 避免 externalId 已存在但被新 geometry “污染”
              "geometryJson" = COALESCE("Street"."geometryJson", EXCLUDED."geometryJson"),
              geometry       = COALESCE("Street".geometry, EXCLUDED.geometry)
            RETURNING id
          `;
          streetId = streetRow.id;
        }

        // 2.3 streetReport：用 segmentMap（按 externalId）拿 roadCondition/notes
        // 如果 1km 匹配走了 “near”，externalId 可能不同，此时 segMap.get 可能拿不到 -> 默认 GOOD
        const seg = externalId ? segMap.get(externalId) : undefined;
        const roadCondition: RoadCondition = seg?.roadCondition ?? 'GOOD';
        const notes: string | null = seg?.notes ?? null;

        // ✅ 正确 Prisma 复合唯一键：userId_rideId_streetId（不是 constraint name）
        const existingReport = await tx.streetReport.findFirst({
  where: {
    userId,
    rideId,
    streetId,
  },
  select: { id: true },
});

if (existingReport) {
  await tx.streetReport.update({
    where: { id: existingReport.id },
    data: { roadCondition, notes },
  });
} else {
  await tx.streetReport.create({
    data: { userId, rideId, streetId, roadCondition, notes },
  });
}

        // ✅ upsert 结束后，DB trigger 会自动刷新 StreetAggregation
      }

      /* --------------------------------
       * 3) StreetIssues (RAW SQL + mapping)
       * -------------------------------- */
      for (const issue of issues ?? []) {
        const point = toGeoJSONPointFromFrontend(issue.location);
        if (!point) continue;

        const geojsonStr = JSON.stringify(point);

        const mapped = this.mapFrontendIssueType(issue.type as FrontIssueType);

        await tx.$executeRaw`
          INSERT INTO "StreetIssue" (
            id,
            "userId",
            "rideId",
            "issueType",
            "locationJson",
            location,
            notes
          )
          VALUES (
            gen_random_uuid(),
            ${userId},
            ${rideId},
            ${mapped}::"IssueType",
            ${geojsonStr}::jsonb,
            ST_SetSRID(
              ST_GeomFromGeoJSON(${geojsonStr}),
              4326
            )::geography,
            ${issue.description ?? issue.notes ?? null}
          )
        `;
      }

      return { success: true, rideId };
    });
  }

  /* ======================================================
   *  Read APIs
   * ====================================================== */
  async getRide(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        reports: true,
        issues: true,
      },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async getUserRides(params: { userId: string; page: number; limit: number }) {
    const { userId, page, limit } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          issues: {
            select: { id: true, issueType: true, createdAt: true },
          },
        },
      }),
      this.prisma.ride.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total },
    };
  }

  async getRideDetail(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, userId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        routeGeoJson: true,
        issues: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            issueType: true,
            locationJson: true,
            notes: true,
            createdAt: true,
          },
        },
        reports: {
          orderBy: { createdAt: 'asc' },
          include: {
            street: {
              select: { id: true, name: true, city: true },
            },
          },
        },
      },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  /* ======================================================
   *  Helpers
   * ====================================================== */
  private mapFrontendIssueType(t: FrontIssueType): IssueType {
    const s = String(t ?? '').toLowerCase();

    if (s === 'pothole') return 'POTHOLE';
    if (s === 'bump') return 'BUMP';
    if (s === 'gravel') return 'GRAVEL';
    if (s === 'construction') return 'CONSTRUCTION';

    // 前端这些 Prisma 没有对应 enum，必须归到 OTHER（否则 500）
    if (s === 'crack') return 'OTHER';
    if (s === 'obstacle') return 'OTHER';

    return 'OTHER';
  }
}
