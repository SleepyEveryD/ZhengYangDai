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
  async saveDraftRide({
      rideId,
      userId,
      payload,
    }: {
      rideId: string;
      userId: string;
      payload: {
        startedAt?: string;
        endedAt?: string;
        routeGeoJson: any;
        weather?: {
          temp?: number | null;
          condition?: string | null;
          wind?: string | null;
          raw?: any;
        } | null;
      };
    }) {
    const { startedAt, endedAt, routeGeoJson, weather } = payload ?? {};
  
    if (!routeGeoJson) {
      throw new BadRequestException("routeGeoJson is required");
    }
  
    return this.prisma.$transaction(async (tx) => {
      /* --------------------------------
       * 0) Guard
       * -------------------------------- */
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        select: { status: true },
      });
  
      if (existing?.status === "CONFIRMED") {
        throw new ConflictException("Ride already confirmed");
      }
  
      /* --------------------------------
       * 1) Upsert Ride (DRAFT)
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
          'DRAFT'::"RideStatus",
          ${sAt},
          ${eAt}
        )
        ON CONFLICT (id) DO UPDATE
        SET
          "routeGeoJson"  = EXCLUDED."routeGeoJson",
          "routeGeometry" = EXCLUDED."routeGeometry",
          "userId"        = EXCLUDED."userId",
          "startedAt"     = EXCLUDED."startedAt",
          "endedAt"       = EXCLUDED."endedAt",
          status          = 'DRAFT'::"RideStatus"
      `;
  
      /* --------------------------------
       * 2) Upsert RideWeather (same as confirm)
       * -------------------------------- */
      if (weather) {
        await tx.rideWeather.upsert({
          where: { rideId },
          create: {
            rideId,
            temp: weather.temp ?? null,
            condition: weather.condition ?? null,
            wind: weather.wind ?? null,
            raw: weather.raw ?? null,
          },
          update: {
            temp: weather.temp ?? null,
            condition: weather.condition ?? null,
            wind: weather.wind ?? null,
            raw: weather.raw ?? null,
          },
        });
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
  console.log("payload ", payload);
    console.log("start transaction");

  const { startedAt, endedAt, routeGeoJson, streets, issues, weather} = payload ?? {};
    console.log("weather ", weather);

  if (!routeGeoJson) {
    throw new BadRequestException("routeGeoJsonAttach routeGeoJson is required");
  }
  if (!Array.isArray(streets) || streets.length === 0) {
    throw new BadRequestException("streets must be a non-empty array");
  }

  return this.prisma.$transaction(async (tx) => {
      console.log("start transaction");
      
    /* --------------------------------
     * 0) Guard
     * -------------------------------- */
    const existing = await tx.ride.findUnique({
      where: { id: rideId },
      select: { status: true },
    });

    if (existing?.status === "CONFIRMED") {
      throw new ConflictException("Ride already confirmed");
    }

    /* --------------------------------
     * 1) Ride
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
     * -------------------------------- */
    for (const street of streets) {
      if (!street) continue;

      console.log("🧩 incoming street:", {
        name: street?.name,
        condition: street?.condition,
        comment: street?.comment,
      });

      const externalId: string | undefined = street.externalId;
      const name: string | null = street.name ?? null;
      const city: string | null = street.city ?? null;
      const country: string | null = street.country ?? null;

      const coords = (street.positions ?? [])
        .map((p: any) => p?.coord)
        .filter(Boolean);

      if (!Array.isArray(coords) || coords.length < 1) {
        continue;
      }

      const geometry = {
        type: "LineString",
        coordinates: coords,
      };

      /* ====== ⭐ 核心修复点：streetId 只声明一次 ====== */
      let streetId: string | undefined;

      /* 2.1 优先用 externalId（最重要） */
      if (externalId) {
        const byExt = await tx.street.findUnique({
          where: { externalId },
          select: { id: true },
        });

        if (byExt) {
          streetId = byExt.id;
        }
      }

      /* 2.2 再用地理距离兜底 */
      if (!streetId) {
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
              100
            )
          LIMIT 1
        `;

        if (near.length > 0) {
          streetId = near[0].id;
        }
      }

      /* 2.3 还没有就新建 Street */
      if (!streetId) {
        if (!externalId) {
          throw new BadRequestException("street.externalId is required");
        }

        const [row] = await tx.$queryRaw<{ id: string }[]>`
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
            ${externalId},
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
            "geometryJson" = COALESCE("Street"."geometryJson", EXCLUDED."geometryJson"),
            geometry       = COALESCE("Street".geometry, EXCLUDED.geometry)
          RETURNING id
        `;

        streetId = row.id;
      }

      /* 2.4 StreetReport（一条 street 一条） */
      const roadCondition: RoadCondition =
        (street.condition as RoadCondition) ?? "GOOD";

      const existingReport = await tx.streetReport.findFirst({
        where: { userId, rideId, streetId },
        select: { id: true },
      });

      if (existingReport) {
        await tx.streetReport.update({
          where: { id: existingReport.id },
          data: {
            roadCondition,
            notes: street.comment ?? null,
          },
        });
      } else {
        await tx.streetReport.create({
          data: {
            userId,
            rideId,
            streetId,
            roadCondition,
            notes: street.comment ?? null,
          },
        });
      }
    }

    /* --------------------------------
     * 3) Issues
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

    /* --------------------------------
     * 4) Debug check
     * -------------------------------- */
    const check = await tx.streetReport.findMany({
      where: { userId, rideId },
      select: { streetId: true, roadCondition: true, notes: true },
    });

    console.log("✅ reports saved:", check);

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
